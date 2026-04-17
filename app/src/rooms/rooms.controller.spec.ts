import { Test, TestingModule } from '@nestjs/testing';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { NotFoundException, ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CacheInterceptor } from '@nestjs/cache-manager';

// Mock RoomsService
const mockRoomsService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  disable: jest.fn(),
  enable: jest.fn(),
  searchRooms: jest.fn(),
};

describe('RoomsController', () => {
  let controller: RoomsController;
  let service: RoomsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoomsController],
      providers: [
        {
          provide: RoomsService,
          useValue: mockRoomsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideInterceptor(CacheInterceptor)
      .useValue({
        intercept: (ctx: ExecutionContext, next: any) => next.handle(),
      })
      .compile();

    controller = module.get<RoomsController>(RoomsController);
    service = module.get<RoomsService>(RoomsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create and return wrapped created room', async () => {
      const dto: CreateRoomDto = {
        name: 'Standard Room 101',
        capacity: 2,
        price_per_night: 1800,
      };

      const room = {
        id: 1,
        name: 'Standard Room 101',
        description: null,
        capacity: 2,
        price_per_night: 1800,
        image_url: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockRoomsService.create.mockResolvedValue(room);

      await expect(controller.create(dto)).resolves.toEqual({
        success: true,
        data: room,
      });

      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should call service.findAll and return wrapped rooms list', async () => {
      const rooms = [
        {
          id: 1,
          name: 'Standard Room 101',
          description: null,
          capacity: 2,
          price_per_night: 1800,
          image_url: null,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 2,
          name: 'Deluxe Room 201',
          description: 'Deluxe room with balcony',
          capacity: 3,
          price_per_night: 2800,
          image_url: '/images/room201.jpg',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockRoomsService.findAll.mockResolvedValue(rooms);

      await expect(controller.findAll()).resolves.toEqual({
        success: true,
        data: rooms,
      });

      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('searchRooms', () => {
    it('should call service.searchRooms with filters and return wrapped result', async () => {
      const rooms = [
        {
          id: 1,
          name: 'Ocean View Suite',
          description: 'Room with ocean view',
          capacity: 2,
          price_per_night: 3200,
          image_url: '/images/ocean-suite.jpg',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 2,
          name: 'Budget Room 102',
          description: null,
          capacity: 2,
          price_per_night: 1500,
          image_url: null,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockRoomsService.searchRooms.mockResolvedValue(rooms);

      await expect(
        controller.searchRooms(
          'room',
          'true',
          '2',
          '3500',
          '2026-04-20',
          '2026-04-25',
          '10',
          '0',
        ),
      ).resolves.toEqual({
        success: true,
        data: rooms,
      });

      expect(service.searchRooms).toHaveBeenCalledWith({
        keyword: 'room',
        is_active: 'true',
        min_capacity: '2',
        max_price: '3500',
        from_date: '2026-04-20',
        to_date: '2026-04-25',
        limit: '10',
        offset: '0',
      });
    });

    it('should return wrapped empty array when no rooms match', async () => {
      const rooms: any[] = [];

      mockRoomsService.searchRooms.mockResolvedValue(rooms);

      await expect(
        controller.searchRooms(
          'penthouse',
          'true',
          '10',
          '1000',
          '2026-04-20',
          '2026-04-25',
          '10',
          '0',
        ),
      ).resolves.toEqual({
        success: true,
        data: rooms,
      });

      expect(service.searchRooms).toHaveBeenCalledWith({
        keyword: 'penthouse',
        is_active: 'true',
        min_capacity: '10',
        max_price: '1000',
        from_date: '2026-04-20',
        to_date: '2026-04-25',
        limit: '10',
        offset: '0',
      });
    });
  });

  describe('findOne', () => {
    it('should call service.findOne and return wrapped room', async () => {
      const room = {
        id: 1,
        name: 'Standard Room 101',
        description: null,
        capacity: 2,
        price_per_night: 1800,
        image_url: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockRoomsService.findOne.mockResolvedValue(room);

      await expect(controller.findOne('1')).resolves.toEqual({
        success: true,
        data: room,
      });

      expect(service.findOne).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException if room not found', async () => {
      mockRoomsService.findOne.mockRejectedValue(
        new NotFoundException('Room 999 not found'),
      );

      await expect(controller.findOne('999')).rejects.toThrow(
        NotFoundException,
      );
      expect(service.findOne).toHaveBeenCalledWith(999);
    });
  });

  describe('update', () => {
    it('should call service.update and return wrapped updated room', async () => {
      const dto: UpdateRoomDto = {
        name: 'Updated Standard Room 101',
      };

      const room = {
        id: 1,
        name: 'Updated Standard Room 101',
        description: null,
        capacity: 2,
        price_per_night: 1800,
        image_url: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockRoomsService.update.mockResolvedValue(room);

      await expect(controller.update('1', dto)).resolves.toEqual({
        success: true,
        data: room,
      });

      expect(service.update).toHaveBeenCalledWith(1, dto);
    });

    it('should update multiple fields when provided', async () => {
      const dto: UpdateRoomDto = {
        description: 'Newly renovated room',
        capacity: 3,
        price_per_night: 2200,
        image_url: '/images/new-room101.jpg',
        is_active: false,
      };

      const room = {
        id: 1,
        name: 'Standard Room 101',
        description: 'Newly renovated room',
        capacity: 3,
        price_per_night: 2200,
        image_url: '/images/new-room101.jpg',
        is_active: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockRoomsService.update.mockResolvedValue(room);

      await expect(controller.update('1', dto)).resolves.toEqual({
        success: true,
        data: room,
      });

      expect(service.update).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('disable', () => {
    it('should call service.disable and return wrapped disabled room', async () => {
      const room = {
        id: 1,
        name: 'Standard Room 101',
        description: null,
        capacity: 2,
        price_per_night: 1800,
        image_url: null,
        is_active: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockRoomsService.disable.mockResolvedValue(room);

      await expect(controller.disable('1')).resolves.toEqual({
        success: true,
        data: room,
      });

      expect(service.disable).toHaveBeenCalledWith(1);
    });
  });

  describe('enable', () => {
    it('should call service.enable and return wrapped enabled room', async () => {
      const room = {
        id: 1,
        name: 'Standard Room 101',
        description: null,
        capacity: 2,
        price_per_night: 1800,
        image_url: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockRoomsService.enable.mockResolvedValue(room);

      await expect(controller.enable('1')).resolves.toEqual({
        success: true,
        data: room,
      });

      expect(service.enable).toHaveBeenCalledWith(1);
    });
  });

  describe('remove', () => {
    it('should call service.remove and return wrapped deleted room', async () => {
      const room = {
        id: 1,
        name: 'Standard Room 101',
        description: null,
        capacity: 2,
        price_per_night: 1800,
        image_url: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockRoomsService.remove.mockResolvedValue(room);

      await expect(controller.remove('1')).resolves.toEqual({
        success: true,
        data: room,
      });

      expect(service.remove).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException if service throws not found', async () => {
      mockRoomsService.remove.mockRejectedValue(
        new NotFoundException('Room 999 not found'),
      );

      await expect(controller.remove('999')).rejects.toThrow(
        NotFoundException,
      );
      expect(service.remove).toHaveBeenCalledWith(999);
    });
  });
});