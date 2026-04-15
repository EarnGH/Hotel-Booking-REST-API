import { Test, TestingModule } from '@nestjs/testing';
import { RoomsService } from './rooms.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

const mockPrismaService = {
  rooms: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('RoomsService', () => {
  let service: RoomsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<RoomsService>(RoomsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a room successfully', async () => {
      const dto: CreateRoomDto = {
        name: 'Standard Room 105',
        description: 'Standard room with garden view',
        capacity: 4,
        price_per_night: 2500,
        image_url: '/images/room105.jpg',
        is_active: true,
      };

      const result = {
        id: 1,
        ...dto,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPrismaService.rooms.create.mockResolvedValue(result);

      await expect(service.create(dto)).resolves.toEqual(result);

      expect(prisma.rooms.create).toHaveBeenCalledWith({
        data: {
          ...dto,
          is_active: true,
        },
      });
    });

    it('should default is_active to true when not provided', async () => {
      const dto: CreateRoomDto = {
        name: 'Standard Room 106',
        description: 'Another room',
        capacity: 2,
        price_per_night: 1800,
        image_url: '/images/room106.jpg',
      };

      const result = {
        id: 2,
        ...dto,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPrismaService.rooms.create.mockResolvedValue(result);

      await expect(service.create(dto)).resolves.toEqual(result);

      expect(prisma.rooms.create).toHaveBeenCalledWith({
        data: {
          ...dto,
          is_active: true,
        },
      });
    });

    it('should throw BadRequestException when prisma create fails', async () => {
      const dto: CreateRoomDto = {
        name: 'Bad Room',
        description: 'Invalid data',
        capacity: 2,
        price_per_night: 1000,
        image_url: '/images/bad-room.jpg',
        is_active: true,
      };

      mockPrismaService.rooms.create.mockRejectedValue(
        new Error('Database create failed'),
      );

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(prisma.rooms.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return an array of rooms ordered by created_at asc', async () => {
      const result = [
        {
          id: 1,
          name: 'Standard Room 105',
          description: 'Standard room with garden view',
          capacity: 4,
          price_per_night: 2500,
          image_url: '/images/room105.jpg',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockPrismaService.rooms.findMany.mockResolvedValue(result);

      await expect(service.findAll()).resolves.toEqual(result);

      expect(prisma.rooms.findMany).toHaveBeenCalledWith({
        orderBy: {
          created_at: 'asc',
        },
      });
    });
  });

  describe('searchRooms', () => {
    it('should return filtered rooms with all filters applied', async () => {
      const filters = {
        keyword: 'Standard',
        is_active: 'true',
        min_capacity: '2',
        max_price: '3000',
        limit: '10',
        offset: '0',
      };

      const rooms = [
        {
          id: 1,
          name: 'Standard Room 105',
          description: 'Standard room with garden view',
          capacity: 4,
          price_per_night: 2500,
          image_url: '/images/room105.jpg',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockPrismaService.rooms.findMany.mockResolvedValue(rooms);

      await expect(service.searchRooms(filters)).resolves.toEqual(rooms);

      expect(prisma.rooms.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            {
              name: {
                contains: 'Standard',
              },
            },
            {
              description: {
                contains: 'Standard',
              },
            },
          ],
          is_active: true,
          capacity: {
            gte: 2,
          },
          price_per_night: {
            lte: 3000,
          },
        },
        take: 10,
        skip: 0,
        orderBy: {
          created_at: 'asc',
        },
      });
    });

    it('should return rooms with empty where clause when no filters are provided', async () => {
      const rooms = [
        {
          id: 1,
          name: 'Room A',
          description: 'Test room',
          capacity: 2,
          price_per_night: 1500,
          image_url: '/images/room-a.jpg',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockPrismaService.rooms.findMany.mockResolvedValue(rooms);

      await expect(service.searchRooms({})).resolves.toEqual(rooms);

      expect(prisma.rooms.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: {
          created_at: 'asc',
        },
      });
    });

    it('should convert is_active="false" into boolean false', async () => {
      const filters = {
        is_active: 'false',
      };

      mockPrismaService.rooms.findMany.mockResolvedValue([]);

      await service.searchRooms(filters);

      expect(prisma.rooms.findMany).toHaveBeenCalledWith({
        where: {
          is_active: false,
        },
        orderBy: {
          created_at: 'asc',
        },
      });
    });
  });

  describe('findOne', () => {
    it('should return a single room', async () => {
      const result = {
        id: 1,
        name: 'Standard Room 105',
        description: 'Standard room with garden view',
        capacity: 4,
        price_per_night: 2500,
        image_url: '/images/room105.jpg',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPrismaService.rooms.findUnique.mockResolvedValue(result);

      await expect(service.findOne(1)).resolves.toEqual(result);
      expect(prisma.rooms.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundException if room not found', async () => {
      mockPrismaService.rooms.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow('Room 999 not found');

      expect(prisma.rooms.findUnique).toHaveBeenCalledWith({
        where: { id: 999 },
      });
    });
  });

  describe('disable', () => {
    it('should disable a room', async () => {
      const existingRoom = {
        id: 1,
        name: 'Room A',
        description: 'Test room',
        capacity: 2,
        price_per_night: 1500,
        image_url: '/images/room-a.jpg',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const updatedRoom = {
        ...existingRoom,
        is_active: false,
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(existingRoom as any);
      mockPrismaService.rooms.update.mockResolvedValue(updatedRoom);

      await expect(service.disable(1)).resolves.toEqual(updatedRoom);

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(prisma.rooms.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { is_active: false },
      });
    });
  });

  describe('enable', () => {
    it('should enable a room', async () => {
      const existingRoom = {
        id: 1,
        name: 'Room A',
        description: 'Test room',
        capacity: 2,
        price_per_night: 1500,
        image_url: '/images/room-a.jpg',
        is_active: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const updatedRoom = {
        ...existingRoom,
        is_active: true,
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(existingRoom as any);
      mockPrismaService.rooms.update.mockResolvedValue(updatedRoom);

      await expect(service.enable(1)).resolves.toEqual(updatedRoom);

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(prisma.rooms.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { is_active: true },
      });
    });
  });

  describe('update', () => {
    it('should update a room', async () => {
      const dto: UpdateRoomDto = {
        name: 'Updated Room Name',
        description: 'Updated description',
        capacity: 4,
        price_per_night: 2500,
        image_url: '/images/updated-room.jpg',
        is_active: true,
      };

      const existingRoom = {
        id: 1,
        name: 'Old Room Name',
        description: 'Old description',
        capacity: 2,
        price_per_night: 1800,
        image_url: '/images/old-room.jpg',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const result = {
        id: 1,
        ...dto,
        created_at: existingRoom.created_at,
        updated_at: new Date(),
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(existingRoom as any);
      mockPrismaService.rooms.update.mockResolvedValue(result);

      await expect(service.update(1, dto)).resolves.toEqual(result);

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(prisma.rooms.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          ...dto,
        },
      });
    });

    it('should throw if room not found before update', async () => {
      const dto: UpdateRoomDto = {
        name: 'Updated Room Name',
      };

      jest
        .spyOn(service, 'findOne')
        .mockRejectedValue(new NotFoundException('Room 999 not found'));

      await expect(service.update(999, dto)).rejects.toThrow(NotFoundException);
      expect(service.findOne).toHaveBeenCalledWith(999);
      expect(prisma.rooms.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete a room', async () => {
      const existingRoom = {
        id: 1,
        name: 'Standard Room 105',
        description: 'Standard room with garden view',
        capacity: 4,
        price_per_night: 2500,
        image_url: '/images/room105.jpg',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const result = { ...existingRoom };

      jest.spyOn(service, 'findOne').mockResolvedValue(existingRoom as any);
      mockPrismaService.rooms.delete.mockResolvedValue(result);

      await expect(service.remove(1)).resolves.toEqual(result);

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(prisma.rooms.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw if room not found before delete', async () => {
      jest
        .spyOn(service, 'findOne')
        .mockRejectedValue(new NotFoundException('Room 999 not found'));

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
      expect(service.findOne).toHaveBeenCalledWith(999);
      expect(prisma.rooms.delete).not.toHaveBeenCalled();
    });
  });
});