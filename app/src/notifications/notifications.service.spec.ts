import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../auth/enums/roles.enum';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    notifications: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockNotification = {
    id: 1,
    user_id: 1,
    booking_id: 5,
    type: 'BOOKING_CREATED',
    message: 'Booking #5 has been created successfully.',
    created_at: new Date(),
  };

  const mockNotification2 = {
    id: 2,
    user_id: 1,
    booking_id: 5,
    type: 'BOOKING_DELETED',
    message: 'Booking #5 has been deleted.',
    created_at: new Date(),
  };

  const mockUser = {
    id: 1,
    username: 'john_doe',
    role: Role.USER,
  };

  const mockAdmin = {
    id: 2,
    username: 'admin_user',
    role: Role.ADMIN,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all notifications for admin', async () => {
      mockPrismaService.notifications.findMany.mockResolvedValueOnce([
        mockNotification,
        mockNotification2,
      ]);

      const result = await service.findAll(mockAdmin);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(2);
      expect(prisma.notifications.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: {
          created_at: 'desc',
        },
      });
    });

    it('should return only user notifications for regular user', async () => {
      mockPrismaService.notifications.findMany.mockResolvedValueOnce([
        mockNotification,
      ]);

      const result = await service.findAll(mockUser);

      expect(result).toHaveLength(1);
      expect(result[0].user_id).toBe(1);
      expect(prisma.notifications.findMany).toHaveBeenCalledWith({
        where: { user_id: mockUser.id },
        orderBy: {
          created_at: 'desc',
        },
      });
    });

    it('should return empty array when user has no notifications', async () => {
      mockPrismaService.notifications.findMany.mockResolvedValueOnce([]);

      const result = await service.findAll(mockUser);

      expect(result).toEqual([]);
    });

    it('should order notifications by created_at descending', async () => {
      const notif1 = {
        ...mockNotification,
        created_at: new Date('2026-04-10'),
      };
      const notif2 = {
        ...mockNotification2,
        id: 2,
        created_at: new Date('2026-04-15'),
      };

      mockPrismaService.notifications.findMany.mockResolvedValueOnce([
        notif2,
        notif1,
      ]);

      const result = await service.findAll(mockUser);

      expect(result[0].created_at).toEqual(notif2.created_at);
      expect(result[1].created_at).toEqual(notif1.created_at);
    });
  });

  describe('createNotification', () => {
    it('should create a notification with all fields', async () => {
      const createData = {
        user_id: 1,
        booking_id: 5,
        type: 'BOOKING_CREATED',
        message: 'Booking #5 has been created successfully.',
      };

      mockPrismaService.notifications.create.mockResolvedValueOnce(
        mockNotification,
      );

      const result = await service.createNotification(createData);

      expect(result.id).toBe(1);
      expect(result.user_id).toBe(1);
      expect(result.booking_id).toBe(5);
      expect(result.type).toBe('BOOKING_CREATED');
      expect(result.message).toBe('Booking #5 has been created successfully.');
      expect(prisma.notifications.create).toHaveBeenCalledWith({
        data: createData,
      });
    });

    it('should create a notification without booking_id', async () => {
      const createData = {
        user_id: 1,
        type: 'BOOKING_PENDING',
        message: 'Your booking is pending approval.',
      };

      const notificationWithoutBooking = {
        id: 3,
        user_id: 1,
        booking_id: null,
        type: 'BOOKING_PENDING',
        message: 'Your booking is pending approval.',
        created_at: new Date(),
      };

      mockPrismaService.notifications.create.mockResolvedValueOnce(
        notificationWithoutBooking,
      );

      const result = await service.createNotification(createData);

      expect(result.booking_id).toBeNull();
      expect(result.type).toBe('BOOKING_PENDING');
      expect(prisma.notifications.create).toHaveBeenCalledWith({
        data: createData,
      });
    });

    it('should return formatted notification', async () => {
      const createData = {
        user_id: 2,
        booking_id: 10,
        type: 'BOOKING_APPROVED',
        message: 'Your booking has been approved.',
      };

      const createdNotification = {
        id: 4,
        user_id: 2,
        booking_id: 10,
        type: 'BOOKING_APPROVED',
        message: 'Your booking has been approved.',
        created_at: new Date(),
      };

      mockPrismaService.notifications.create.mockResolvedValueOnce(
        createdNotification,
      );

      const result = await service.createNotification(createData);

      expect(result).toEqual(createdNotification);
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('user_id');
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('created_at');
    });

    it('should handle different notification types', async () => {
      const types = [
        'BOOKING_CREATED',
        'BOOKING_CANCELLED',
        'BOOKING_APPROVED',
        'BOOKING_REJECTED',
        'PAYMENT_RECEIVED',
      ];

      for (const type of types) {
        const createData = {
          user_id: 1,
          booking_id: 5,
          type,
          message: `Notification of type ${type}`,
        };

        const notification = { id: 1, ...createData, created_at: new Date() };

        mockPrismaService.notifications.create.mockResolvedValueOnce(
          notification,
        );

        const result = await service.createNotification(createData);

        expect(result.type).toBe(type);
      }
    });
  });
});
