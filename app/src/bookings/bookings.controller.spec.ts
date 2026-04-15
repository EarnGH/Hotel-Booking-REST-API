import { Test, TestingModule } from '@nestjs/testing';
import {
  ExecutionContext,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { CacheInterceptor } from '@nestjs/cache-manager';

import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { Role } from '../auth/enums/roles.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

const mockBookingsService = {
  create: jest.fn(),
  findAll: jest.fn(),
  searchBookings: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  adminUpdate: jest.fn(),
  remove: jest.fn(),
};

describe('BookingsController', () => {
  let controller: BookingsController;
  let service: BookingsService;

  const mock_user_req = {
    user: {
      id: 2,
      username: 'john_doe',
      role: Role.USER,
    },
  };

  const mock_admin_req = {
    user: {
      id: 1,
      username: 'admin',
      role: Role.ADMIN,
    },
  };

  const mock_booking = {
    id: 10,
    user_id: 2,
    room_id: 1,
    start_date: new Date('2026-04-20'),
    end_date: new Date('2026-04-22'),
    guest_count: 2,
    total_price: 3600,
    status: BookingStatus.PENDING,
    created_at: new Date(),
    updated_at: new Date(),
    room: {
      id: 1,
      name: 'Room 101',
      description: 'Standard room',
      capacity: 2,
      price_per_night: 1800,
      image_url: '/images/room101.jpg',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
    user: {
      id: 2,
      username: 'john_doe',
      role: Role.USER,
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingsController],
      providers: [
        {
          provide: BookingsService,
          useValue: mockBookingsService,
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

    controller = module.get<BookingsController>(BookingsController);
    service = module.get<BookingsService>(BookingsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a booking and return wrapped response', async () => {
      const dto = {
        room_id: 1,
        start_date: '2026-04-20',
        end_date: '2026-04-22',
        guest_count: 2,
      };

      mockBookingsService.create.mockResolvedValue(mock_booking);

      await expect(controller.create(dto as any, mock_user_req)).resolves.toEqual({
        success: true,
        data: mock_booking,
      });

      expect(service.create).toHaveBeenCalledWith({
        ...dto,
        user_id: 2,
      });
    });
  });

  describe('findAll', () => {
    it('should return wrapped bookings list', async () => {
      const bookings = [mock_booking];

      mockBookingsService.findAll.mockResolvedValue(bookings);

      await expect(controller.findAll(mock_user_req)).resolves.toEqual({
        success: true,
        data: bookings,
      });

      expect(service.findAll).toHaveBeenCalledWith(mock_user_req.user);
    });
  });

  describe('searchBookings', () => {
    it('should call service.searchBookings with filters and return wrapped result', async () => {
      const bookings = [mock_booking];

      mockBookingsService.searchBookings.mockResolvedValue(bookings);

      await expect(
        controller.searchBookings(
          mock_user_req,
          '1',
          'PENDING',
          '2026-04-01',
          '2026-04-30',
          '10',
          '0',
        ),
      ).resolves.toEqual({
        success: true,
        data: bookings,
      });

      expect(service.searchBookings).toHaveBeenCalledWith(mock_user_req.user, {
        room_id: '1',
        status: 'PENDING',
        start_date: '2026-04-01',
        end_date: '2026-04-30',
        limit: '10',
        offset: '0',
      });
    });

    it('should pass undefined filters correctly', async () => {
      const bookings = [mock_booking];

      mockBookingsService.searchBookings.mockResolvedValue(bookings);

      await expect(controller.searchBookings(mock_user_req)).resolves.toEqual({
        success: true,
        data: bookings,
      });

      expect(service.searchBookings).toHaveBeenCalledWith(mock_user_req.user, {
        room_id: undefined,
        status: undefined,
        start_date: undefined,
        end_date: undefined,
        limit: undefined,
        offset: undefined,
      });
    });
  });

  describe('findOne', () => {
    it('should return wrapped booking', async () => {
      mockBookingsService.findOne.mockResolvedValue(mock_booking);

      await expect(controller.findOne('10', mock_user_req)).resolves.toEqual({
        success: true,
        data: mock_booking,
      });

      expect(service.findOne).toHaveBeenCalledWith(10, mock_user_req.user);
    });

    it('should throw NotFoundException if service throws not found', async () => {
      mockBookingsService.findOne.mockRejectedValue(
        new NotFoundException('Booking 999 not found'),
      );

      await expect(controller.findOne('999', mock_user_req)).rejects.toThrow(
        NotFoundException,
      );

      expect(service.findOne).toHaveBeenCalledWith(999, mock_user_req.user);
    });
  });

  describe('update', () => {
    it('should call service.update and return wrapped updated booking', async () => {
      const dto = {
        start_date: '2026-04-21',
        end_date: '2026-04-23',
        guest_count: 2,
      };

      const updated_booking = {
        ...mock_booking,
        start_date: new Date('2026-04-21'),
        end_date: new Date('2026-04-23'),
      };

      mockBookingsService.update.mockResolvedValue(updated_booking);

      await expect(
        controller.update('10', dto as any, mock_user_req),
      ).resolves.toEqual({
        success: true,
        data: updated_booking,
      });

      expect(service.update).toHaveBeenCalledWith(10, dto, mock_user_req.user);
    });

    it('should throw ForbiddenException if user tries to update inaccessible booking', async () => {
      const dto = {
        start_date: '2026-04-21',
        end_date: '2026-04-23',
        guest_count: 2,
      };

      mockBookingsService.update.mockRejectedValue(
        new ForbiddenException('You can only access your own bookings'),
      );

      await expect(controller.update('999', dto as any, mock_user_req)).rejects.toThrow(
        ForbiddenException,
      );

      expect(service.update).toHaveBeenCalledWith(999, dto, mock_user_req.user);
    });
  });

  describe('adminUpdate', () => {
    it('should call service.adminUpdate and return wrapped updated booking', async () => {
      const dto = {
        status: BookingStatus.APPROVED,
        user_id: 2,
      };

      const updated_booking = {
        ...mock_booking,
        status: BookingStatus.APPROVED,
      };

      mockBookingsService.adminUpdate.mockResolvedValue(updated_booking);

      await expect(
        controller.adminUpdate('10', dto as any, mock_admin_req),
      ).resolves.toEqual({
        success: true,
        data: updated_booking,
      });

      expect(service.adminUpdate).toHaveBeenCalledWith(
        10,
        dto,
        mock_admin_req.user,
      );
    });
    it('should throw ForbiddenException if service rejects non-admin update', async () => {
      const dto = {
        status: BookingStatus.APPROVED,
      };

      mockBookingsService.adminUpdate.mockRejectedValue(
        new ForbiddenException('Only admin can use this endpoint'),
      );

      await expect(
        controller.adminUpdate('10', dto as any, mock_user_req),
      ).rejects.toThrow(ForbiddenException);

      expect(service.adminUpdate).toHaveBeenCalledWith(
        10,
        dto,
        mock_user_req.user,
      );
    });
  });

  describe('remove', () => {
    it('should call service.remove and return wrapped deleted booking', async () => {
      mockBookingsService.remove.mockResolvedValue(mock_booking);

      await expect(controller.remove('10', mock_user_req)).resolves.toEqual({
        success: true,
        data: mock_booking,
      });

      expect(service.remove).toHaveBeenCalledWith(10, mock_user_req.user);
    });
  });
});