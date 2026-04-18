import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { BookingStatus } from '@prisma/client';

import { BookingsModule } from '../../src/bookings/bookings.module';
import { AuthModule } from '../../src/auth/auth.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { NotificationsService } from '../../src/notifications/notifications.service';

describe('Bookings Integration (Real Auth)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let created_booking_ids: number[] = [];
  let created_room_ids: number[] = [];
  let created_user_ids: number[] = [];

  const mockNotificationsService = {
    createNotification: jest.fn(),
  };

  beforeAll(async () => {
    const module_fixture: TestingModule = await Test.createTestingModule({
      imports: [AuthModule, BookingsModule],
    })
      .overrideProvider(NotificationsService)
      .useValue(mockNotificationsService)
      .compile();

    app = module_fixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
    prisma = app.get(PrismaService);
  });

  afterEach(async () => {
    if (created_booking_ids.length > 0) {
      await prisma.bookings.deleteMany({
        where: {
          id: {
            in: created_booking_ids,
          },
        },
      });
      created_booking_ids = [];
    }

    if (created_room_ids.length > 0) {
      await prisma.rooms.deleteMany({
        where: {
          id: {
            in: created_room_ids,
          },
        },
      });
      created_room_ids = [];
    }

    if (created_user_ids.length > 0) {
      await prisma.users.deleteMany({
        where: {
          id: {
            in: created_user_ids,
          },
        },
      });
      created_user_ids = [];
    }

    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }

    if (prisma) {
      await prisma.$disconnect();
    }
  });

  async function create_test_room(data?: Partial<any>) {
    const room = await prisma.rooms.create({
      data: {
        name:
          data?.name ??
          `Booking Room ${Date.now()} ${Math.floor(Math.random() * 10000)}`,
        description: data?.description ?? 'Booking integration test room',
        capacity: data?.capacity ?? 2,
        price_per_night: data?.price_per_night ?? 1800,
        image_url: data?.image_url ?? '/images/booking-room.jpg',
        is_active: data?.is_active ?? true,
      },
    });

    created_room_ids.push(room.id);
    return room;
  }

  async function create_test_booking(data: {
    user_id: number;
    room_id: number;
    start_date?: Date;
    end_date?: Date;
    guest_count?: number;
    total_price?: number;
    status?: BookingStatus;
  }) {
    const booking = await prisma.bookings.create({
      data: {
        user_id: data.user_id,
        room_id: data.room_id,
        start_date: data.start_date ?? new Date('2026-05-10'),
        end_date: data.end_date ?? new Date('2026-05-12'),
        guest_count: data.guest_count ?? 2,
        total_price: data.total_price ?? 3600,
        status: data.status ?? BookingStatus.PENDING,
      },
    });

    created_booking_ids.push(booking.id);
    return booking;
  }

  async function register_user(data?: Partial<any>) {
    const payload = {
      username:
        data?.username ??
        `user_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      email:
        data?.email ??
        `email_${Date.now()}_${Math.floor(Math.random() * 10000)}@example.com`,
      full_name: data?.full_name ?? 'Test User',
      password: data?.password ?? 'password123',
    };

    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send(payload)
      .expect(201);

    const created_user = await prisma.users.findFirst({
      where: {
        username: payload.username,
      },
      orderBy: {
        id: 'desc',
      },
    });

    if (!created_user) {
      throw new Error('Failed to find registered user in database');
    }

    // Promote to admin via database if requested
    if (data?.role === 'admin') {
      await prisma.users.update({
        where: { id: created_user.id },
        data: { role: 'admin' },
      });
      created_user.role = 'admin';
    }

    created_user_ids.push(created_user.id);

    return {
      payload,
      user: created_user,
      response,
    };
  }

  async function login_user(username: string, password: string) {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username,
        password,
      })
      .expect(200);

    const access_token = response.body.access_token;

    if (!access_token) {
      throw new Error('Could not find access_token in login response');
    }

    return access_token;
  }

  describe('POST /bookings', () => {
    it('should create a booking with real JWT auth', async () => {
      const { payload, user } = await register_user({
        username: 'booking_real_auth_create_user',
        password: 'password123',
        role: 'user',
      });

      const token = await login_user(payload.username, payload.password);

      const room = await create_test_room({
        name: 'Booking Create Room',
        capacity: 2,
        price_per_night: 1800,
        is_active: true,
      });

      const dto = {
        room_id: room.id,
        start_date: '2026-05-20',
        end_date: '2026-05-22',
        guest_count: 2,
      };

      const response = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send(dto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: expect.any(Number),
        user_id: user.id,
        room_id: room.id,
        guest_count: 2,
        total_price: 3600,
        status: 'PENDING',
      });

      const created_id = response.body.data.id;
      created_booking_ids.push(created_id);

      const booking_in_db = await prisma.bookings.findUnique({
        where: { id: created_id },
      });

      expect(booking_in_db).toBeTruthy();
      expect(booking_in_db?.user_id).toBe(user.id);
      expect(booking_in_db?.room_id).toBe(room.id);
      expect(Number(booking_in_db?.total_price)).toBe(3600);
      expect(mockNotificationsService.createNotification).toHaveBeenCalled();
    });

    it('should reject booking when dates overlap', async () => {
      const user_1_registered = await register_user({
        username: 'booking_overlap_user_1',
        password: 'password123',
        role: 'user',
      });

      const user_2_registered = await register_user({
        username: 'booking_overlap_user_2',
        password: 'password123',
        role: 'user',
      });

      const token_user_2 = await login_user(
        user_2_registered.payload.username,
        user_2_registered.payload.password,
      );

      const room = await create_test_room({
        name: 'Overlap Room',
        capacity: 2,
        price_per_night: 1800,
      });

      await create_test_booking({
        user_id: user_1_registered.user.id,
        room_id: room.id,
        start_date: new Date('2026-05-20'),
        end_date: new Date('2026-05-22'),
        guest_count: 2,
        total_price: 3600,
        status: BookingStatus.APPROVED,
      });

      const response = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${token_user_2}`)
        .send({
          room_id: room.id,
          start_date: '2026-05-21',
          end_date: '2026-05-23',
          guest_count: 2,
        })
        .expect(400);

      expect(response.body.message).toBe(
        'Room is already booked for the selected dates',
      );
    });

    it('should reject booking when guest count exceeds capacity', async () => {
      const registered = await register_user({
        username: 'booking_guest_count_user',
        password: 'password123',
        role: 'user',
      });

      const token = await login_user(
        registered.payload.username,
        registered.payload.password,
      );

      const room = await create_test_room({
        capacity: 2,
      });

      const response = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          room_id: room.id,
          start_date: '2026-05-20',
          end_date: '2026-05-22',
          guest_count: 5,
        })
        .expect(400);

      expect(response.body.message).toBe(
        `Guest count exceeds room capacity (${room.capacity})`,
      );
    });

    it('should reject invalid date range', async () => {
      const registered = await register_user({
        username: 'booking_invalid_date_user',
        password: 'password123',
        role: 'user',
      });

      const token = await login_user(
        registered.payload.username,
        registered.payload.password,
      );

      const room = await create_test_room();

      const response = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          room_id: room.id,
          start_date: '2026-05-22',
          end_date: '2026-05-20',
          guest_count: 2,
        })
        .expect(400);

      expect(response.body.message).toBe('End date must be after start date');
    });
  });

  describe('GET /bookings', () => {
    it('should return only own bookings for normal user', async () => {
      const user_1_registered = await register_user({
        username: 'booking_findall_user_1',
        password: 'password123',
        role: 'user',
      });

      const user_2_registered = await register_user({
        username: 'booking_findall_user_2',
        password: 'password123',
        role: 'user',
      });

      const token_user_1 = await login_user(
        user_1_registered.payload.username,
        user_1_registered.payload.password,
      );

      const room_1 = await create_test_room({
        name: 'Booking List Room 1',
      });

      const room_2 = await create_test_room({
        name: 'Booking List Room 2',
      });

      await create_test_booking({
        user_id: user_1_registered.user.id,
        room_id: room_1.id,
      });

      await create_test_booking({
        user_id: user_2_registered.user.id,
        room_id: room_2.id,
        start_date: new Date('2026-05-15'),
        end_date: new Date('2026-05-17'),
        total_price: 3600,
      });

      const response = await request(app.getHttpServer())
        .get('/bookings')
        .set('Authorization', `Bearer ${token_user_1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].user_id).toBe(user_1_registered.user.id);
    });

    it('should return all bookings for admin', async () => {
      const admin_registered = await register_user({
        username: 'booking_admin_findall',
        password: 'password123',
        role: 'admin',
      });

      const user_registered = await register_user({
        username: 'booking_regular_findall',
        password: 'password123',
        role: 'user',
      });

      const admin_token = await login_user(
        admin_registered.payload.username,
        admin_registered.payload.password,
      );

      const room_1 = await create_test_room({
        name: 'Booking Admin List Room 1',
      });

      const room_2 = await create_test_room({
        name: 'Booking Admin List Room 2',
      });

      await create_test_booking({
        user_id: admin_registered.user.id,
        room_id: room_1.id,
      });

      await create_test_booking({
        user_id: user_registered.user.id,
        room_id: room_2.id,
        start_date: new Date('2026-05-15'),
        end_date: new Date('2026-05-17'),
        total_price: 3600,
      });

      const response = await request(app.getHttpServer())
        .get('/bookings')
        .set('Authorization', `Bearer ${admin_token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('GET /bookings/search', () => {
    it('should search only own bookings for user', async () => {
      const user_registered = await register_user({
        username: 'booking_search_user',
        password: 'password123',
        role: 'user',
      });

      const other_registered = await register_user({
        username: 'booking_search_other_user',
        password: 'password123',
        role: 'user',
      });

      const user_token = await login_user(
        user_registered.payload.username,
        user_registered.payload.password,
      );

      const room = await create_test_room({
        name: 'Booking Search Room Match',
      });

      await create_test_booking({
        user_id: user_registered.user.id,
        room_id: room.id,
        start_date: new Date('2026-05-20'),
        end_date: new Date('2026-05-22'),
        guest_count: 2,
        total_price: 3600,
        status: BookingStatus.PENDING,
      });

      await create_test_booking({
        user_id: other_registered.user.id,
        room_id: room.id,
        start_date: new Date('2026-05-25'),
        end_date: new Date('2026-05-27'),
        guest_count: 2,
        total_price: 3600,
        status: BookingStatus.PENDING,
      });

      const response = await request(app.getHttpServer())
        .get('/bookings/search')
        .set('Authorization', `Bearer ${user_token}`)
        .query({
          room_id: room.id,
          status: 'PENDING',
          start_date: '2026-05-01',
          end_date: '2026-05-30',
          limit: '10',
          offset: '0',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].user_id).toBe(user_registered.user.id);
    });
  });

  describe('GET /bookings/:id', () => {
    it('should allow owner to get own booking', async () => {
      const registered = await register_user({
        username: 'booking_findone_user',
        password: 'password123',
        role: 'user',
      });

      const token = await login_user(
        registered.payload.username,
        registered.payload.password,
      );

      const room = await create_test_room();

      const booking = await create_test_booking({
        user_id: registered.user.id,
        room_id: room.id,
      });

      const response = await request(app.getHttpServer())
        .get(`/bookings/${booking.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: booking.id,
        user_id: registered.user.id,
        room_id: room.id,
      });
    });

    it('should reject access to another user booking', async () => {
      const owner_registered = await register_user({
        username: 'booking_owner_user',
        password: 'password123',
        role: 'user',
      });

      const other_registered = await register_user({
        username: 'booking_other_user',
        password: 'password123',
        role: 'user',
      });

      const other_token = await login_user(
        other_registered.payload.username,
        other_registered.payload.password,
      );

      const room = await create_test_room();

      const booking = await create_test_booking({
        user_id: owner_registered.user.id,
        room_id: room.id,
      });

      const response = await request(app.getHttpServer())
        .get(`/bookings/${booking.id}`)
        .set('Authorization', `Bearer ${other_token}`)
        .expect(403);

      expect(response.body.message).toBe(
        'You can only access your own bookings',
      );
    });
  });

  describe('PUT /bookings/:id', () => {
    it('should allow user to update own booking', async () => {
      const registered = await register_user({
        username: 'booking_update_user',
        password: 'password123',
        role: 'user',
      });

      const token = await login_user(
        registered.payload.username,
        registered.payload.password,
      );

      const room_1 = await create_test_room({
        name: 'Booking Update Room 1',
        capacity: 2,
        price_per_night: 1800,
      });

      const room_2 = await create_test_room({
        name: 'Booking Update Room 2',
        capacity: 4,
        price_per_night: 2500,
      });

      const booking = await create_test_booking({
        user_id: registered.user.id,
        room_id: room_1.id,
        start_date: new Date('2026-05-20'),
        end_date: new Date('2026-05-22'),
        guest_count: 2,
        total_price: 3600,
      });

      const response = await request(app.getHttpServer())
        .put(`/bookings/${booking.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          room_id: room_2.id,
          start_date: '2026-05-21',
          end_date: '2026-05-23',
          guest_count: 3,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: booking.id,
        room_id: room_2.id,
        guest_count: 3,
        total_price: 5000,
      });

      const updated_booking = await prisma.bookings.findUnique({
        where: { id: booking.id },
      });

      expect(updated_booking).toBeTruthy();
      expect(updated_booking?.room_id).toBe(room_2.id);
      expect(updated_booking?.guest_count).toBe(3);
      expect(Number(updated_booking?.total_price)).toBe(5000);
    });
  });

  describe('PUT /bookings/:id/admin', () => {
    it('should allow admin to update booking status', async () => {
      const admin_registered = await register_user({
        username: 'booking_admin_update_admin',
        password: 'password123',
        role: 'admin',
      });

      const user_registered = await register_user({
        username: 'booking_admin_update_user',
        password: 'password123',
        role: 'user',
      });

      const admin_token = await login_user(
        admin_registered.payload.username,
        admin_registered.payload.password,
      );

      const room = await create_test_room();

      const booking = await create_test_booking({
        user_id: user_registered.user.id,
        room_id: room.id,
        status: BookingStatus.PENDING,
      });

      const response = await request(app.getHttpServer())
        .put(`/bookings/${booking.id}/admin`)
        .set('Authorization', `Bearer ${admin_token}`)
        .send({
          status: 'APPROVED',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(booking.id);
      expect(response.body.data.status).toBe('APPROVED');

      const updated_booking = await prisma.bookings.findUnique({
        where: { id: booking.id },
      });

      expect(updated_booking?.status).toBe(BookingStatus.APPROVED);
      expect(mockNotificationsService.createNotification).toHaveBeenCalled();
    });

    it('should reject normal user using admin update endpoint', async () => {
      const registered = await register_user({
        username: 'booking_admin_update_denied_user',
        password: 'password123',
        role: 'user',
      });

      const token = await login_user(
        registered.payload.username,
        registered.payload.password,
      );

      const room = await create_test_room();

      const booking = await create_test_booking({
        user_id: registered.user.id,
        room_id: room.id,
        status: BookingStatus.PENDING,
      });

      const response = await request(app.getHttpServer())
        .put(`/bookings/${booking.id}/admin`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          status: 'APPROVED',
        })
        .expect(403);

      expect(response.body.message).toBe('Forbidden resource');
    });
  });

  describe('DELETE /bookings/:id', () => {
    it('should allow owner to delete own booking', async () => {
      const registered = await register_user({
        username: 'booking_delete_user',
        password: 'password123',
        role: 'user',
      });

      const token = await login_user(
        registered.payload.username,
        registered.payload.password,
      );

      const room = await create_test_room();

      const booking = await create_test_booking({
        user_id: registered.user.id,
        room_id: room.id,
      });

      const response = await request(app.getHttpServer())
        .delete(`/bookings/${booking.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(booking.id);

      const deleted_booking = await prisma.bookings.findUnique({
        where: { id: booking.id },
      });

      expect(deleted_booking).toBeNull();
      expect(mockNotificationsService.createNotification).toHaveBeenCalled();
    });

    it('should reject deleting another user booking', async () => {
      const owner_registered = await register_user({
        username: 'booking_delete_owner',
        password: 'password123',
        role: 'user',
      });

      const other_registered = await register_user({
        username: 'booking_delete_other',
        password: 'password123',
        role: 'user',
      });

      const other_token = await login_user(
        other_registered.payload.username,
        other_registered.payload.password,
      );

      const room = await create_test_room();

      const booking = await create_test_booking({
        user_id: owner_registered.user.id,
        room_id: room.id,
      });

      const response = await request(app.getHttpServer())
        .delete(`/bookings/${booking.id}`)
        .set('Authorization', `Bearer ${other_token}`)
        .expect(403);

      expect(response.body.message).toBe(
        'You can only access your own bookings',
      );
    });
  });
});