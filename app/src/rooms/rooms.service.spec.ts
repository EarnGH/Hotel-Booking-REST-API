import { Test, TestingModule } from '@nestjs/testing';
import { RoomsService } from './rooms.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { NotFoundException } from '@nestjs/common';

// Mocking the PrismaService to avoid connecting to a real database.
// We define the specific methods we expect to be called (create, findMany, etc.)
// and use jest.fn() to simulate their behavior and return values.
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

  // In beforeEach, we use Test.createTestingModule to inject this mock into RoomsService. This isolates the service logic from the database layer.
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<RoomsService>(RoomsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Test Suite for creating a room
  // Verifies that:
  // 1. The service correctly passes DTO data to Prisma.
  // 2. Prisma is called with the correct structure.
  describe('create', () => {
    it('should create a room successfully', async () => {
      const dto: CreateRoomDto = {
        name: "Standard Room 105",
        description: "Standard room with garden view",
        capacity: 4,
        price_per_night: 2500,
        image_url: "/images/room105.jpg",
        is_active: true,
      };

      const result = {
        id: 1,
        ...dto,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPrismaService.rooms.create.mockResolvedValue(result);

      expect(await service.create(dto)).toEqual(result);

      expect(prisma.rooms.create).toHaveBeenCalledWith({
        data: {
          name: dto.name,
          description: dto.description,
          capacity: dto.capacity,
          price_per_night: dto.price_per_night,
          image_url: dto.image_url,
          is_active: dto.is_active,
        },
      });
    });
  });

  describe('findAll', () => {
    it('should return an array of rooms', async () => {
      const result = [
        {
          id: 1,
          name: "Standard Room 105",
          description: "Standard room with garden view",
          capacity: 4,
          price_per_night: 2500,
          image_url: "/images/room105.jpg",
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockPrismaService.rooms.findMany.mockResolvedValue(result);

      expect(await service.findAll()).toEqual(result);

      expect(prisma.rooms.findMany).toHaveBeenCalledWith();
    });
  });

  describe('searchRooms', () => {
    it('should return an array of filtered rooms', async () => {
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

      const result = await service.searchRooms(filters);

      expect(result).toEqual({
        success: true,
        data: rooms,
      });

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
  });

  // Test Suite for retrieving a single room
  // Verifies:
  // 1. Success: Returns the room when found.
  // 2. Failure: Returns null when the ID does not exist.
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
  
        expect(await service.findOne(1)).toBe(result);
        expect(prisma.rooms.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should throw NotFoundException if room not found', async () => {
        mockPrismaService.rooms.findUnique.mockResolvedValue(null);
  
        await expect(service.findOne(999)).rejects.toThrow('Room 999 not found');
        expect(prisma.rooms.findUnique).toHaveBeenCalledWith({ where: { id: 999 } });
    });
  });

  // Test Suite for updating a room
  // Verifies:
  // 1. Success: Checks room exists, then calls prisma.update with correct ID and data.
  // 2. Failure: Throws NotFoundException if the room does not exist.
  describe('update', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
    it('should update a room', async () => {
      const dto: UpdateRoomDto = {
        name: 'Standard Room 105',
        description: 'Standard room with garden view',
        capacity: 4,
        price_per_night: 2500,
        image_url: '/images/room105.jpg',
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
        name: 'Standard Room 105',
        description: 'Standard room with garden view',
        capacity: 4,
        price_per_night: 2500,
        image_url: '/images/room105.jpg',
        is_active: true,
        created_at: existingRoom.created_at,
        updated_at: new Date(),
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(existingRoom as any);
      mockPrismaService.rooms.update.mockResolvedValue(result);

      expect(await service.update(1, dto)).toEqual(result);

      expect(service.findOne).toHaveBeenCalledWith(1);

      expect(prisma.rooms.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          ...dto,
          updated_at: expect.any(Date),
        },
      });
    });

    it('should throw if room not found', async () => {
      const dto: UpdateRoomDto = { name: 'Updated Room Name' };

      jest
        .spyOn(service, 'findOne')
        .mockRejectedValue(new NotFoundException('Room 999 not found'));

      await expect(service.update(999, dto)).rejects.toThrow(
        'Room 999 not found',
      );

      expect(service.findOne).toHaveBeenCalledWith(999);
      expect(prisma.rooms.update).not.toHaveBeenCalled();
    });
  });
  
    // Test Suite for deleting a room
    // Verifies:
    // 1. Success: Calls prisma.delete with correct ID.
    // 2. Failure: Throws an error if the record is not found (simulated rejection).
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
        jest.spyOn(service, 'findOne').mockResolvedValue(existingRoom as any);
        mockPrismaService.rooms.delete.mockResolvedValue(result);
        
        expect(await service.remove(1)).toBe(result);
        expect(prisma.rooms.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      });
      it('should throw if room not found', async () => {
        jest
          .spyOn(service, 'findOne')
          .mockRejectedValue(new NotFoundException('Room 999 not found'));
        await expect(service.remove(999)).rejects.toThrow(
          'Room 999 not found',
        );
      });
    });
});
