import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { NotificationsModule } from '../../src/notifications/notifications.module';
import { AuthModule } from '../../src/auth/auth.module';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Notifications Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let created_user_ids: number[] = [];
  let created_notification_ids: number[] = [];
  let user_token: string;
  let admin_token: string;
  let user_id: number;
  let admin_id: number;

  beforeAll(async () => {
    const module_fixture: TestingModule = await Test.createTestingModule({
      imports: [NotificationsModule, AuthModule],
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

    // Create a test regular user and get auth token
    const user_register = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        username: `notif_user_${Date.now()}`,
        email: `notif_user_${Date.now()}@example.com`,
        full_name: 'Notification Test User',
        password: 'password123',
      });

    user_token = user_register.body.access_token;
    user_id = user_register.body.data?.id;
    created_user_ids.push(user_id);

    // Create a test admin user
    const admin_register = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        username: `notif_admin_${Date.now()}`,
        email: `notif_admin_${Date.now()}@example.com`,
        full_name: 'Notification Admin User',
        password: 'password123',
      });

    admin_token = admin_register.body.access_token;
    admin_id = admin_register.body.data?.id;
    created_user_ids.push(admin_id);

    // Update user to admin
    await prisma.users.update({
      where: { id: admin_id },
      data: { role: 'admin' },
    });
  });

  afterEach(async () => {
    // Clean up notifications
    if (created_notification_ids.length > 0) {
      await prisma.notifications.deleteMany({
        where: {
          id: {
            in: created_notification_ids,
          },
        },
      });

      created_notification_ids = [];
    }
  });

  afterAll(async () => {
    // Clean up users
    if (created_user_ids.length > 0) {
      await prisma.users.deleteMany({
        where: {
          id: {
            in: created_user_ids,
          },
        },
      });
    }

    if (app) {
      await app.close();
    }

    if (prisma) {
      await prisma.$disconnect();
    }
  });

  describe('GET /notifications', () => {
    it('should return only user own notifications for regular user', async () => {
      // Create notifications for the user
      const notif1 = await prisma.notifications.create({
        data: {
          user_id,
          type: 'BOOKING_CREATED',
          message: 'Your booking has been created',
        },
      });

      const notif2 = await prisma.notifications.create({
        data: {
          user_id,
          type: 'BOOKING_APPROVED',
          message: 'Your booking has been approved',
        },
      });

      // Create notification for another user (should not be returned)
      const other_user = await prisma.users.create({
        data: {
          username: `other_user_${Date.now()}`,
          email: `other_user_${Date.now()}@example.com`,
          full_name: 'Other User',
          password_hash: 'hashed_password',
        },
      });

      created_user_ids.push(other_user.id);

      const other_notif = await prisma.notifications.create({
        data: {
          user_id: other_user.id,
          type: 'BOOKING_CREATED',
          message: 'Other user booking',
        },
      });

      created_notification_ids.push(notif1.id, notif2.id, other_notif.id);

      const response = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${user_token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(2);

      const returned_ids = response.body.data.map((n) => n.id);
      expect(returned_ids).toContain(notif1.id);
      expect(returned_ids).toContain(notif2.id);
      expect(returned_ids).not.toContain(other_notif.id);

      // Verify structure
      expect(response.body.data[0]).toMatchObject({
        id: expect.any(Number),
        user_id,
        type: expect.any(String),
        message: expect.any(String),
        created_at: expect.any(String),
      });
    });

    it('should return all notifications for admin', async () => {
      // Create notifications for different users
      const notif1 = await prisma.notifications.create({
        data: {
          user_id,
          type: 'BOOKING_CREATED',
          message: 'Booking created for user 1',
        },
      });

      const other_user = await prisma.users.create({
        data: {
          username: `admin_view_user_${Date.now()}`,
          email: `admin_view_user_${Date.now()}@example.com`,
          full_name: 'Admin View User',
          password_hash: 'hashed_password',
        },
      });

      created_user_ids.push(other_user.id);

      const notif2 = await prisma.notifications.create({
        data: {
          user_id: other_user.id,
          type: 'BOOKING_APPROVED',
          message: 'Booking approved for user 2',
        },
      });

      created_notification_ids.push(notif1.id, notif2.id);

      const response = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${admin_token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      // Admin should see both notifications
      const returned_ids = response.body.data.map((n) => n.id);
      expect(returned_ids).toContain(notif1.id);
      expect(returned_ids).toContain(notif2.id);
    });

    it('should return notifications sorted by created_at descending', async () => {
      // Create notifications with slight delays
      const notif1 = await prisma.notifications.create({
        data: {
          user_id,
          type: 'BOOKING_CREATED',
          message: 'First notification',
        },
      });

      // Wait a bit and create another
      await new Promise((resolve) => setTimeout(resolve, 100));

      const notif2 = await prisma.notifications.create({
        data: {
          user_id,
          type: 'BOOKING_APPROVED',
          message: 'Second notification',
        },
      });

      created_notification_ids.push(notif1.id, notif2.id);

      const response = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${user_token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data[0].id).toBe(notif2.id);
      expect(response.body.data[1].id).toBe(notif1.id);
    });

    it('should return empty array when user has no notifications', async () => {
      // Create a new user with no notifications
      const new_user = await prisma.users.create({
        data: {
          username: `no_notif_user_${Date.now()}`,
          email: `no_notif_user_${Date.now()}@example.com`,
          full_name: 'No Notification User',
          password_hash: 'hashed_password',
        },
      });

      created_user_ids.push(new_user.id);

      // Register the user to get a token
      const register_response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: `no_notif_login_${Date.now()}`,
          email: `no_notif_login_${Date.now()}@example.com`,
          full_name: 'No Notif Login',
          password: 'password123',
        });

      const new_user_token = register_response.body.access_token;
      created_user_ids.push(register_response.body.data?.id);

      const response = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${new_user_token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Notification data integrity', () => {
    it('should create notification with all fields', async () => {
      const notif = await prisma.notifications.create({
        data: {
          user_id,
          booking_id: 123,
          type: 'BOOKING_CREATED',
          message: 'Test notification',
        },
      });

      created_notification_ids.push(notif.id);

      expect(notif).toMatchObject({
        id: expect.any(Number),
        user_id,
        booking_id: 123,
        type: 'BOOKING_CREATED',
        message: 'Test notification',
        created_at: expect.any(Date),
      });
    });

    it('should create notification without booking_id', async () => {
      const notif = await prisma.notifications.create({
        data: {
          user_id,
          type: 'PAYMENT_RECEIVED',
          message: 'Payment received',
        },
      });

      created_notification_ids.push(notif.id);

      expect(notif).toMatchObject({
        id: expect.any(Number),
        user_id,
        booking_id: null,
        type: 'PAYMENT_RECEIVED',
        message: 'Payment received',
        created_at: expect.any(Date),
      });
    });
  });
});
