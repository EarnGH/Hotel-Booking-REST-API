import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { UsersModule } from '../../src/users/users.module';
import { AuthModule } from '../../src/auth/auth.module';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Users Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let created_user_ids: number[] = [];
  let auth_token: string;

  beforeAll(async () => {
    const module_fixture: TestingModule = await Test.createTestingModule({
      imports: [UsersModule, AuthModule],
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

    // Create a test user and get auth token
    const register_response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        username: `integration_user_${Date.now()}`,
        email: `integration_${Date.now()}@example.com`,
        full_name: 'Integration Test User',
        password: 'password123',
      });

    auth_token = register_response.body.access_token || register_response.body.data?.access_token;
    created_user_ids.push(register_response.body.data?.id || register_response.body.id);
  });

  afterEach(async () => {
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

  describe('GET /users/me', () => {
    it('should return authenticated user profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${auth_token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: expect.any(Number),
        username: expect.any(String),
        email: expect.any(String),
        full_name: expect.any(String),
        role: 'user',
      });

      expect(response.body.data).not.toHaveProperty('password_hash');
    });

    it('should return 401 without authentication token', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/me')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /users/me', () => {
    it('should update user profile with email', async () => {
      const new_email = `updated_${Date.now()}@example.com`;
      const update_dto = {
        email: new_email,
        full_name: 'Updated Name',
      };

      const response = await request(app.getHttpServer())
        .put('/users/me')
        .set('Authorization', `Bearer ${auth_token}`)
        .send(update_dto)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(new_email);
      expect(response.body.data.full_name).toBe('Updated Name');

      // Verify in database
      const user_in_db = await prisma.users.findUnique({
        where: { email: new_email },
      });

      expect(user_in_db?.email).toBe(new_email);
      expect(user_in_db?.full_name).toBe('Updated Name');
    });

    it('should reject duplicate email', async () => {
      const existing_user = await prisma.users.create({
        data: {
          username: `existing_${Date.now()}`,
          email: `existing_${Date.now()}@example.com`,
          full_name: 'Existing User',
          password_hash: 'hashed_password',
        },
      });

      created_user_ids.push(existing_user.id);

      const response = await request(app.getHttpServer())
        .put('/users/me')
        .set('Authorization', `Bearer ${auth_token}`)
        .send({
          email: existing_user.email,
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should update only email without changing full_name', async () => {
      // First get current user
      const get_response = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${auth_token}`)
        .expect(200);

      const current_full_name = get_response.body.data.full_name;
      const new_email = `only_email_${Date.now()}@example.com`;

      const update_response = await request(app.getHttpServer())
        .put('/users/me')
        .set('Authorization', `Bearer ${auth_token}`)
        .send({
          email: new_email,
        })
        .expect(200);

      expect(update_response.body.data.email).toBe(new_email);
      expect(update_response.body.data.full_name).toBe(current_full_name);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app.getHttpServer())
        .put('/users/me')
        .send({
          email: 'newtest@example.com',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid email format', async () => {
      const response = await request(app.getHttpServer())
        .put('/users/me')
        .set('Authorization', `Bearer ${auth_token}`)
        .send({
          email: 'invalid-email-format',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /users/:id', () => {
    it('should return user by id', async () => {
      // First create a user
      const user = await prisma.users.create({
        data: {
          username: `getuser_${Date.now()}`,
          email: `getuser_${Date.now()}@example.com`,
          full_name: 'Get User Test',
          password_hash: 'hashed_password',
        },
      });

      created_user_ids.push(user.id);

      const response = await request(app.getHttpServer())
        .get(`/users/${user.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
      });

      expect(response.body.data).not.toHaveProperty('password_hash');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/9999999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('GET /users', () => {
    it('should return list of users', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      if (response.body.data.length > 0) {
        expect(response.body.data[0]).toMatchObject({
          id: expect.any(Number),
          username: expect.any(String),
          email: expect.any(String),
        });
        expect(response.body.data[0]).not.toHaveProperty('password_hash');
      }
    });
  });

  describe('DELETE /users/:id', () => {
    it('should delete a user as admin', async () => {
      // Create an admin user
      const admin = await prisma.users.create({
        data: {
          username: `admin_${Date.now()}`,
          email: `admin_${Date.now()}@example.com`,
          full_name: 'Admin User',
          password_hash: 'hashed_password',
          role: 'admin',
        },
      });

      // Create a user to delete
      const user_to_delete = await prisma.users.create({
        data: {
          username: `todelete_${Date.now()}`,
          email: `todelete_${Date.now()}@example.com`,
          full_name: 'To Delete User',
          password_hash: 'hashed_password',
        },
      });

      created_user_ids.push(admin.id);
      created_user_ids.push(user_to_delete.id);

      // Get admin token
      const admin_register = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: `admin_login_${Date.now()}`,
          email: `admin_login_${Date.now()}@example.com`,
          full_name: 'Admin Login',
          password: 'password123',
          role: 'admin',
        });

      const admin_token = admin_register.body.access_token;

      // Update admin to have admin role for this test
      const admin_from_db = await prisma.users.update({
        where: { id: admin_register.body.data.id },
        data: { role: 'admin' },
      });

      const response = await request(app.getHttpServer())
        .delete(`/users/${user_to_delete.id}`)
        .set('Authorization', `Bearer ${admin_token}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify user is deleted
      const deleted_user = await prisma.users.findUnique({
        where: { id: user_to_delete.id },
      });

      expect(deleted_user).toBeNull();
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app.getHttpServer())
        .delete('/users/1')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
