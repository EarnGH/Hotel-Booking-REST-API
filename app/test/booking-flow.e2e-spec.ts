import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppE2eModule } from './app.e2e.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Booking Flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let created_user_ids: number[] = [];
  let created_room_ids: number[] = [];
  let created_booking_ids: number[] = [];

  beforeAll(async () => {
    const module_fixture: TestingModule = await Test.createTestingModule({
      imports: [AppE2eModule],
    }).compile();

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
    if (created_user_ids.length > 0) {
      await prisma.notifications.deleteMany({
        where: {
          user_id: {
            in: created_user_ids,
          },
        },
      });
    }

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
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }

    if (prisma) {
      await prisma.$disconnect();
    }
  });

  async function register_user(data?: Partial<any>) {
    const payload = {
      username:
        data?.username ??
        `user_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      password: data?.password ?? 'password123',
      role: data?.role ?? 'user',
    };

    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send(payload)
      .expect(201);

    expect(response.body.success).toBe(true);

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

    expect(response.body.access_token).toEqual(expect.any(String));

    return response.body.access_token as string;
  }

  describe('user sign-up -> login -> search rooms -> create booking -> check notifications -> delete booking', () => {
    it('should complete the full booking flow successfully', async () => {
      const admin_registered = await register_user({
        username: `admin_e2e_${Date.now()}`,
        password: 'password123',
        role: 'admin',
      });

      const admin_token = await login_user(
        admin_registered.payload.username,
        admin_registered.payload.password,
      );

      const room_dto = {
        name: `E2E Ocean View Suite ${Date.now()}`,
        description: 'Created in E2E test',
        capacity: 2,
        price_per_night: 1800,
        image_url: '/images/e2e-room.jpg',
        is_active: true,
      };

      const create_room_response = await request(app.getHttpServer())
        .post('/rooms')
        .set('Authorization', `Bearer ${admin_token}`)
        .send(room_dto)
        .expect(201);

      expect(create_room_response.body.success).toBe(true);
      expect(create_room_response.body.data).toMatchObject({
        id: expect.any(Number),
        name: room_dto.name,
        capacity: room_dto.capacity,
        price_per_night: room_dto.price_per_night,
        is_active: true,
      });

      const created_room_id = create_room_response.body.data.id;
      created_room_ids.push(created_room_id);

      const room_in_db = await prisma.rooms.findUnique({
        where: { id: created_room_id },
      });

      expect(room_in_db).toBeTruthy();
      expect(room_in_db?.name).toBe(room_dto.name);

      const user_registered = await register_user({
        username: `user_e2e_${Date.now()}`,
        password: 'password123',
        role: 'user',
      });

      const user_token = await login_user(
        user_registered.payload.username,
        user_registered.payload.password,
      );

      const search_response = await request(app.getHttpServer())
        .get('/rooms/search')
        .query({
          keyword: 'Ocean',
          is_active: 'true',
          min_capacity: '2',
          max_price: '2000',
          limit: '10',
          offset: '0',
        })
        .expect(200);

      expect(search_response.body.success).toBe(true);
      expect(Array.isArray(search_response.body.data)).toBe(true);

      const searched_room_ids = search_response.body.data.map((room: any) => room.id);
      expect(searched_room_ids).toContain(created_room_id);

      const booking_dto = {
        room_id: created_room_id,
        start_date: '2026-05-20',
        end_date: '2026-05-22',
        guest_count: 2,
      };

      const create_booking_response = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${user_token}`)
        .send(booking_dto)
        .expect(201);

      expect(create_booking_response.body.success).toBe(true);
      expect(create_booking_response.body.data).toMatchObject({
        id: expect.any(Number),
        user_id: user_registered.user.id,
        room_id: created_room_id,
        guest_count: 2,
        total_price: 3600,
        status: 'PENDING',
      });

      const created_booking_id = create_booking_response.body.data.id;
      created_booking_ids.push(created_booking_id);

      const booking_in_db = await prisma.bookings.findUnique({
        where: { id: created_booking_id },
      });

      expect(booking_in_db).toBeTruthy();
      expect(booking_in_db?.user_id).toBe(user_registered.user.id);
      expect(booking_in_db?.room_id).toBe(created_room_id);
      expect(Number(booking_in_db?.total_price)).toBe(3600);

      const my_bookings_response = await request(app.getHttpServer())
        .get('/bookings')
        .set('Authorization', `Bearer ${user_token}`)
        .expect(200);

      expect(my_bookings_response.body.success).toBe(true);
      expect(Array.isArray(my_bookings_response.body.data)).toBe(true);
      expect(my_bookings_response.body.data).toHaveLength(1);
      expect(my_bookings_response.body.data[0].id).toBe(created_booking_id);
      expect(my_bookings_response.body.data[0].user_id).toBe(user_registered.user.id);

      const notifications_after_create_response = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${user_token}`)
        .expect(200);

      expect(notifications_after_create_response.body.success).toBe(true);
      expect(Array.isArray(notifications_after_create_response.body.data)).toBe(true);

      const created_notification = notifications_after_create_response.body.data.find(
        (notification: any) =>
          notification.booking_id === created_booking_id &&
          notification.type === 'BOOKING_CREATED',
      );

      expect(created_notification).toBeDefined();
      expect(created_notification.message).toContain(
        `Booking #${created_booking_id} has been created`,
      );

      const notification_in_db_after_create = await prisma.notifications.findFirst({
        where: {
          user_id: user_registered.user.id,
          booking_id: created_booking_id,
          type: 'BOOKING_CREATED',
        },
        orderBy: {
          id: 'desc',
        },
      });

      expect(notification_in_db_after_create).toBeTruthy();

      const delete_booking_response = await request(app.getHttpServer())
        .delete(`/bookings/${created_booking_id}`)
        .set('Authorization', `Bearer ${user_token}`)
        .expect(200);

      expect(delete_booking_response.body.success).toBe(true);
      expect(delete_booking_response.body.data.id).toBe(created_booking_id);

      const deleted_booking = await prisma.bookings.findUnique({
        where: { id: created_booking_id },
      });

      expect(deleted_booking).toBeNull();

      created_booking_ids = created_booking_ids.filter(
        (id) => id !== created_booking_id,
      );

      const notifications_after_delete_response = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${user_token}`)
        .expect(200);

      expect(notifications_after_delete_response.body.success).toBe(true);
      expect(Array.isArray(notifications_after_delete_response.body.data)).toBe(true);

      const deleted_notification = notifications_after_delete_response.body.data.find(
        (notification: any) =>
          notification.booking_id === created_booking_id &&
          notification.type === 'BOOKING_DELETED',
      );

      expect(deleted_notification).toBeDefined();
      expect(deleted_notification.message).toContain(
        `Booking #${created_booking_id}`,
      );

      const notification_in_db_after_delete = await prisma.notifications.findFirst({
        where: {
          user_id: user_registered.user.id,
          booking_id: created_booking_id,
          type: 'BOOKING_DELETED',
        },
        orderBy: {
          id: 'desc',
        },
      });

      expect(notification_in_db_after_delete).toBeTruthy();
    });
  });
});