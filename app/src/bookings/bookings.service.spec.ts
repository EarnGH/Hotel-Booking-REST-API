import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BookingStatus } from '@prisma/client';

import { BookingsService } from './bookings.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Role } from '../auth/enums/roles.enum';

describe('BookingsService', () => {
  let service: BookingsService;

  const mockPrismaService = {
    rooms: {
      findUnique: jest.fn(),
    },
    bookings: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockNotificationsService = {
    createNotification: jest.fn(),
  };

  const mock_user = {
    id: 2,
    username: 'john_doe',
    role: Role.USER,
  };

  const mock_admin = {
    id: 1,
    username: 'admin',
    role: Role.ADMIN,
  };

  const mock_room = {
    id: 1,
    name: 'Room 101',
    description: 'Standard room',
    capacity: 2,
    price_per_night: 1800,
    image_url: '/images/room101.jpg',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
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
    room: mock_room,
    user: {
      id: 2,
      username: 'john_doe',
      role: Role.USER,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a booking successfully', async () => {
      const dto = {
        user_id: 2,
        room_id: 1,
        start_date: '2026-04-20',
        end_date: '2026-04-22',
        guest_count: 2,
      };

      mockPrismaService.rooms.findUnique.mockResolvedValue(mock_room);
      mockPrismaService.bookings.findFirst.mockResolvedValue(null);
      mockPrismaService.bookings.create.mockResolvedValue(mock_booking);
      mockNotificationsService.createNotification.mockResolvedValue(undefined);

      const result = await service.create(dto);

      expect(mockPrismaService.rooms.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });

      expect(mockPrismaService.bookings.findFirst).toHaveBeenCalledWith({
        where: {
          room_id: 1,
          status: {
            in: [
              BookingStatus.PENDING,
              BookingStatus.APPROVED,
              BookingStatus.PAID,
            ],
          },
          AND: [
            {
              start_date: {
                lt: new Date('2026-04-22'),
              },
            },
            {
              end_date: {
                gt: new Date('2026-04-20'),
              },
            },
          ],
        },
      });

      expect(mockPrismaService.bookings.create).toHaveBeenCalledWith({
        data: {
          user_id: 2,
          room_id: 1,
          start_date: new Date('2026-04-20'),
          end_date: new Date('2026-04-22'),
          guest_count: 2,
          total_price: 3600,
          status: BookingStatus.PENDING,
        },
        include: {
          room: true,
          user: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
        },
      });

      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith({
        user_id: 2,
        booking_id: 10,
        type: 'BOOKING_CREATED',
        message: 'Booking #10 has been created successfully.',
      });

      expect(result).toEqual({
        ...mock_booking,
        total_price: 3600,
        room: {
          ...mock_room,
          price_per_night: 1800,
        },
      });
    });

    it('should throw BadRequestException for invalid booking dates', async () => {
      const dto = {
        user_id: 2,
        room_id: 1,
        start_date: 'invalid-date',
        end_date: '2026-04-22',
        guest_count: 2,
      };

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      await expect(service.create(dto)).rejects.toThrow('Invalid booking dates');

      expect(mockPrismaService.rooms.findUnique).not.toHaveBeenCalled();
      expect(mockPrismaService.bookings.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when end date is not after start date', async () => {
      const dto = {
        user_id: 2,
        room_id: 1,
        start_date: '2026-04-22',
        end_date: '2026-04-20',
        guest_count: 2,
      };

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      await expect(service.create(dto)).rejects.toThrow(
        'End date must be after start date',
      );

      expect(mockPrismaService.rooms.findUnique).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when room does not exist', async () => {
      const dto = {
        user_id: 2,
        room_id: 999,
        start_date: '2026-04-20',
        end_date: '2026-04-22',
        guest_count: 2,
      };

      mockPrismaService.rooms.findUnique.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
      await expect(service.create(dto)).rejects.toThrow('Room 999 not found');

      expect(mockPrismaService.bookings.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when room is inactive', async () => {
      const dto = {
        user_id: 2,
        room_id: 1,
        start_date: '2026-04-20',
        end_date: '2026-04-22',
        guest_count: 2,
      };

      mockPrismaService.rooms.findUnique.mockResolvedValue({
        ...mock_room,
        is_active: false,
      });

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      await expect(service.create(dto)).rejects.toThrow(
        'Room 1 is not active',
      );

      expect(mockPrismaService.bookings.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when guest count exceeds room capacity', async () => {
      const dto = {
        user_id: 2,
        room_id: 1,
        start_date: '2026-04-20',
        end_date: '2026-04-22',
        guest_count: 3,
      };

      mockPrismaService.rooms.findUnique.mockResolvedValue(mock_room);

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      await expect(service.create(dto)).rejects.toThrow(
        'Guest count exceeds room capacity (2)',
      );

      expect(mockPrismaService.bookings.findFirst).not.toHaveBeenCalled();
      expect(mockPrismaService.bookings.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when booking dates overlap', async () => {
      const dto = {
        user_id: 2,
        room_id: 1,
        start_date: '2026-04-20',
        end_date: '2026-04-22',
        guest_count: 2,
      };

      mockPrismaService.rooms.findUnique.mockResolvedValue(mock_room);
      mockPrismaService.bookings.findFirst.mockResolvedValue({
        id: 99,
      });

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      await expect(service.create(dto)).rejects.toThrow(
        'Room is already booked for the selected dates',
      );

      expect(mockPrismaService.bookings.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all bookings for admin', async () => {
      mockPrismaService.bookings.findMany.mockResolvedValue([mock_booking]);

      const result = await service.findAll(mock_admin);

      expect(mockPrismaService.bookings.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          room: true,
          user: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
        },
        orderBy: {
          created_at: 'asc',
        },
      });

      expect(result).toEqual([
        {
          ...mock_booking,
          total_price: 3600,
          room: {
            ...mock_room,
            price_per_night: 1800,
          },
        },
      ]);
    });

    it('should return only own bookings for normal user', async () => {
      mockPrismaService.bookings.findMany.mockResolvedValue([mock_booking]);

      const result = await service.findAll(mock_user);

      expect(mockPrismaService.bookings.findMany).toHaveBeenCalledWith({
        where: { user_id: 2 },
        include: {
          room: true,
          user: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
        },
        orderBy: {
          created_at: 'asc',
        },
      });

      expect(result).toHaveLength(1);
    });
  });

  describe('searchBookings', () => {
    it('should search bookings with filters for admin', async () => {
      mockPrismaService.bookings.findMany.mockResolvedValue([mock_booking]);

      const result = await service.searchBookings(mock_admin, {
        room_id: '1',
        status: BookingStatus.PENDING,
        start_date: '2026-04-01',
        end_date: '2026-04-30',
        limit: '10',
        offset: '0',
      });

      expect(mockPrismaService.bookings.findMany).toHaveBeenCalledWith({
        where: {
          room_id: 1,
          status: BookingStatus.PENDING,
          AND: [
            {
              start_date: {
                gte: new Date('2026-04-01'),
              },
            },
            {
              end_date: {
                lte: new Date('2026-04-30'),
              },
            },
          ],
        },
        include: {
          room: true,
          user: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
        },
        take: 10,
        skip: 0,
        orderBy: {
          created_at: 'asc',
        },
      });

      expect(result).toHaveLength(1);
    });

    it('should restrict search to own bookings for normal user', async () => {
      mockPrismaService.bookings.findMany.mockResolvedValue([mock_booking]);

      await service.searchBookings(mock_user, {
        status: BookingStatus.PENDING,
      });

      expect(mockPrismaService.bookings.findMany).toHaveBeenCalledWith({
        where: {
          user_id: 2,
          status: BookingStatus.PENDING,
        },
        include: {
          room: true,
          user: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
        },
        orderBy: {
          created_at: 'asc',
        },
      });
    });
  });

  describe('findOne', () => {
    it('should return a booking when admin accesses any booking', async () => {
      mockPrismaService.bookings.findUnique.mockResolvedValue(mock_booking);

      const result = await service.findOne(10, mock_admin);

      expect(mockPrismaService.bookings.findUnique).toHaveBeenCalledWith({
        where: { id: 10 },
        include: {
          room: true,
          user: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
        },
      });

      expect(result).toEqual({
        ...mock_booking,
        total_price: 3600,
        room: {
          ...mock_room,
          price_per_night: 1800,
        },
      });
    });

    it('should return a booking when user accesses own booking', async () => {
      mockPrismaService.bookings.findUnique.mockResolvedValue(mock_booking);

      const result = await service.findOne(10, mock_user);

      expect(result.id).toBe(10);
    });

    it('should throw NotFoundException when booking is not found', async () => {
      mockPrismaService.bookings.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999, mock_user)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne(999, mock_user)).rejects.toThrow(
        'Booking 999 not found',
      );
    });

    it('should throw ForbiddenException when user accesses another user booking', async () => {
      mockPrismaService.bookings.findUnique.mockResolvedValue({
        ...mock_booking,
        user_id: 999,
      });

      await expect(service.findOne(10, mock_user)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.findOne(10, mock_user)).rejects.toThrow(
        'You can only access your own bookings',
      );
    });
  });

  describe('update', () => {
    it('should update own booking successfully', async () => {
      const dto = {
        start_date: '2026-04-21',
        end_date: '2026-04-23',
        guest_count: 2,
      };

      const updated_booking = {
        ...mock_booking,
        start_date: new Date('2026-04-21'),
        end_date: new Date('2026-04-23'),
        total_price: 3600,
      };

      mockPrismaService.bookings.findUnique.mockResolvedValue(mock_booking);
      mockPrismaService.rooms.findUnique.mockResolvedValue(mock_room);
      mockPrismaService.bookings.findFirst.mockResolvedValue(null);
      mockPrismaService.bookings.update.mockResolvedValue(updated_booking);

      const result = await service.update(10, dto, mock_user);

      expect(mockPrismaService.bookings.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: {
          room_id: 1,
          start_date: new Date('2026-04-21'),
          end_date: new Date('2026-04-23'),
          guest_count: 2,
          total_price: 3600,
        },
        include: {
          room: true,
          user: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
        },
      });

      expect(result).toEqual({
        ...updated_booking,
        total_price: 3600,
        room: {
          ...mock_room,
          price_per_night: 1800,
        },
      });
    });

    it('should throw ForbiddenException when user updates another user booking', async () => {
      mockPrismaService.bookings.findUnique.mockResolvedValue({
        ...mock_booking,
        user_id: 999,
      });

      await expect(service.update(10, {}, mock_user)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.update(10, {}, mock_user)).rejects.toThrow(
        'You can only access your own bookings',
      );

      expect(mockPrismaService.bookings.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when updated guest count exceeds room capacity', async () => {
      mockPrismaService.bookings.findUnique.mockResolvedValue(mock_booking);
      mockPrismaService.rooms.findUnique.mockResolvedValue(mock_room);

      await expect(
        service.update(10, { guest_count: 5 }, mock_user),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.update(10, { guest_count: 5 }, mock_user),
      ).rejects.toThrow('Guest count exceeds room capacity (2)');

      expect(mockPrismaService.bookings.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when updated dates overlap another booking', async () => {
      mockPrismaService.bookings.findUnique.mockResolvedValue(mock_booking);
      mockPrismaService.rooms.findUnique.mockResolvedValue(mock_room);
      mockPrismaService.bookings.findFirst.mockResolvedValue({ id: 55 });

      await expect(
        service.update(
          10,
          {
            start_date: '2026-04-21',
            end_date: '2026-04-23',
          },
          mock_user,
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.update(
          10,
          {
            start_date: '2026-04-21',
            end_date: '2026-04-23',
          },
          mock_user,
        ),
      ).rejects.toThrow('Room is already booked for the selected dates');

      expect(mockPrismaService.bookings.update).not.toHaveBeenCalled();
    });
  });

  describe('adminUpdate', () => {
    it('should allow admin to update booking and change status', async () => {
      const dto = {
        status: BookingStatus.APPROVED,
        guest_count: 2,
      };

      const updated_booking = {
        ...mock_booking,
        status: BookingStatus.APPROVED,
      };

      mockPrismaService.bookings.findUnique.mockResolvedValue(mock_booking);
      mockPrismaService.rooms.findUnique.mockResolvedValue(mock_room);
      mockPrismaService.bookings.findFirst.mockResolvedValue(null);
      mockPrismaService.bookings.update.mockResolvedValue(updated_booking);
      mockNotificationsService.createNotification.mockResolvedValue(undefined);

      const result = await service.adminUpdate(10, dto, mock_admin);

      expect(mockPrismaService.bookings.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: {
          room_id: 1,
          start_date: new Date('2026-04-20'),
          end_date: new Date('2026-04-22'),
          guest_count: 2,
          total_price: 3600,
          status: BookingStatus.APPROVED,
        },
        include: {
          room: true,
          user: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
        },
      });

      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith({
        user_id: 2,
        booking_id: 10,
        type: 'BOOKING_APPROVED',
        message: 'Booking #10 has been approved.',
      });

      expect(result).toEqual({
        ...updated_booking,
        total_price: 3600,
        room: {
          ...mock_room,
          price_per_night: 1800,
        },
      });
    });

    it('should allow admin to reassign booking to another user', async () => {
      const dto = {
        user_id: 5,
        status: BookingStatus.PENDING,
      };

      const updated_booking = {
        ...mock_booking,
        user_id: 5,
        user: {
          id: 5,
          username: 'new_user',
          role: Role.USER,
        },
      };

      mockPrismaService.bookings.findUnique.mockResolvedValue(mock_booking);
      mockPrismaService.rooms.findUnique.mockResolvedValue(mock_room);
      mockPrismaService.bookings.findFirst.mockResolvedValue(null);
      mockPrismaService.bookings.update.mockResolvedValue(updated_booking);

      await service.adminUpdate(10, dto, mock_admin);

      expect(mockPrismaService.bookings.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: {
          user_id: 5,
          room_id: 1,
          start_date: new Date('2026-04-20'),
          end_date: new Date('2026-04-22'),
          guest_count: 2,
          total_price: 3600,
          status: BookingStatus.PENDING,
        },
        include: {
          room: true,
          user: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
        },
      });
    });

    it('should throw ForbiddenException when non-admin uses adminUpdate', async () => {
      await expect(
        service.adminUpdate(10, { status: BookingStatus.APPROVED }, mock_user),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.adminUpdate(10, { status: BookingStatus.APPROVED }, mock_user),
      ).rejects.toThrow('Only admin can use this endpoint');

      expect(mockPrismaService.bookings.findUnique).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when booking is not found in adminUpdate', async () => {
      mockPrismaService.bookings.findUnique.mockResolvedValue(null);

      await expect(
        service.adminUpdate(999, { status: BookingStatus.APPROVED }, mock_admin),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.adminUpdate(999, { status: BookingStatus.APPROVED }, mock_admin),
      ).rejects.toThrow('Booking 999 not found');
    });

    it('should not create notification when status does not change', async () => {
      mockPrismaService.bookings.findUnique.mockResolvedValue(mock_booking);
      mockPrismaService.rooms.findUnique.mockResolvedValue(mock_room);
      mockPrismaService.bookings.findFirst.mockResolvedValue(null);
      mockPrismaService.bookings.update.mockResolvedValue(mock_booking);

      await service.adminUpdate(
        10,
        { guest_count: 2, status: BookingStatus.PENDING },
        mock_admin,
      );

      expect(mockNotificationsService.createNotification).not.toHaveBeenCalled();
    });

    it('should create BOOKING_CANCELLED notification when status changes to CANCELLED', async () => {
      const updated_booking = {
        ...mock_booking,
        status: BookingStatus.CANCELLED,
      };

      mockPrismaService.bookings.findUnique.mockResolvedValue(mock_booking);
      mockPrismaService.rooms.findUnique.mockResolvedValue(mock_room);
      mockPrismaService.bookings.findFirst.mockResolvedValue(null);
      mockPrismaService.bookings.update.mockResolvedValue(updated_booking);

      await service.adminUpdate(
        10,
        { status: BookingStatus.CANCELLED },
        mock_admin,
      );

      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith({
        user_id: 2,
        booking_id: 10,
        type: 'BOOKING_CANCELLED',
        message: 'Booking #10 has been cancelled.',
      });
    });

    it('should create BOOKING_PAID notification when status changes to PAID', async () => {
      const updated_booking = {
        ...mock_booking,
        status: BookingStatus.PAID,
      };

      mockPrismaService.bookings.findUnique.mockResolvedValue(mock_booking);
      mockPrismaService.rooms.findUnique.mockResolvedValue(mock_room);
      mockPrismaService.bookings.findFirst.mockResolvedValue(null);
      mockPrismaService.bookings.update.mockResolvedValue(updated_booking);

      await service.adminUpdate(
        10,
        { status: BookingStatus.PAID },
        mock_admin,
      );

      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith({
        user_id: 2,
        booking_id: 10,
        type: 'BOOKING_PAID',
        message: 'Booking #10 has been marked as paid.',
      });
    });
  });

  describe('remove', () => {
    it('should allow user to delete own booking and create notification', async () => {
      mockPrismaService.bookings.findUnique.mockResolvedValue(mock_booking);
      mockPrismaService.bookings.delete.mockResolvedValue(mock_booking);
      mockNotificationsService.createNotification.mockResolvedValue(undefined);

      const result = await service.remove(10, mock_user);

      expect(mockPrismaService.bookings.delete).toHaveBeenCalledWith({
        where: { id: 10 },
        include: {
          room: true,
          user: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
        },
      });

      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith({
        user_id: 2,
        booking_id: 10,
        type: 'BOOKING_DELETED',
        message: 'Booking #10 has been deleted successfully.',
      });

      expect(result).toEqual({
        ...mock_booking,
        total_price: 3600,
        room: {
          ...mock_room,
          price_per_night: 1800,
        },
      });
    });

    it('should allow admin to delete any booking', async () => {
      mockPrismaService.bookings.findUnique.mockResolvedValue(mock_booking);
      mockPrismaService.bookings.delete.mockResolvedValue(mock_booking);

      await service.remove(10, mock_admin);

      expect(mockPrismaService.bookings.delete).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user deletes another user booking', async () => {
      mockPrismaService.bookings.findUnique.mockResolvedValue({
        ...mock_booking,
        user_id: 999,
      });

      await expect(service.remove(10, mock_user)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.remove(10, mock_user)).rejects.toThrow(
        'You can only access your own bookings',
      );

      expect(mockPrismaService.bookings.delete).not.toHaveBeenCalled();
    });
  });
});