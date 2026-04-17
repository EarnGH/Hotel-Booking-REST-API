import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import * as bcrypt from 'bcrypt';

import { AuthModule } from '../../src/auth/auth.module';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Auth Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let created_user_ids: number[] = [];

  beforeAll(async () => {
    const module_fixture: TestingModule = await Test.createTestingModule({
      imports: [AuthModule],
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

  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const dto = {
        username: `integration_user_${Date.now()}`,
        email: `user_${Date.now()}@example.com`,
        full_name: 'Test User',
        password: 'password123',
        role: 'user',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(dto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: expect.any(Number),
        username: dto.username,
        role: 'user',
      });

      const created_id = response.body.data.id;
      created_user_ids.push(created_id);

      const user_in_db = await prisma.users.findUnique({
        where: { id: created_id },
      });

      expect(user_in_db).toBeTruthy();
      expect(user_in_db?.username).toBe(dto.username);
      expect(user_in_db?.role).toBe('user');
      expect(user_in_db?.password_hash).not.toBe(dto.password);

      const password_matches = await bcrypt.compare(
        dto.password,
        user_in_db!.password_hash,
      );
      expect(password_matches).toBe(true);
    });

    it('should reject duplicate username', async () => {
      const username = `duplicate_user_${Date.now()}`;
      const email = `duplicate_${Date.now()}@example.com`;

      const first_response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username,
          email,
          full_name: 'Test User',
          password: 'password123',
          role: 'user',
        })
        .expect(201);

      created_user_ids.push(first_response.body.data.id);

      const second_response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username,
          email: `different_${Date.now()}@example.com`,
          full_name: 'Test User 2',
          password: 'password123',
          role: 'user',
        })
        .expect(409);

      expect(second_response.body.message).toBe(
        'User with this username already exists',
      );
    });

    it('should reject missing username and password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({})
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([
          expect.stringContaining('username'),
          expect.stringContaining('password'),
        ]),
      );
    });

    it('should reject invalid password length', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: `shortpass_user_${Date.now()}`,
          email: `short_${Date.now()}@example.com`,
          full_name: 'Test User',
          password: '123',
          role: 'user',
        })
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([
          'password must be longer than or equal to 6 characters',
        ]),
      );
    });
  });

  describe('POST /auth/login', () => {
    it('should login successfully and return access token', async () => {
      const username = `login_user_${Date.now()}`;
      const email = `login_${Date.now()}@example.com`;
      const password = 'password123';

      const register_response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username,
          email,
          full_name: 'Test User',
          password,
          role: 'user',
        })
        .expect(201);

      created_user_ids.push(register_response.body.data.id);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username,
          password,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toMatchObject({
        access_token: expect.any(String),
        expiresIn: 3600,
      });

      expect(response.body.access_token.length).toBeGreaterThan(0);
    });

    it('should reject invalid credentials', async () => {
      const username = `invalid_login_user_${Date.now()}`;
      const email = `invalid_${Date.now()}@example.com`;
      const password = 'password123';

      const register_response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username,
          email,
          full_name: 'Test User',
          password,
          role: 'user',
        })
        .expect(201);

      created_user_ids.push(register_response.body.data.id);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.message).toBe('Invalid credentials');
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      const username = `logout_user_${Date.now()}`;
      const email = `logout_${Date.now()}@example.com`;
      const password = 'password123';

      // Register and login
      const register_response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username,
          email,
          full_name: 'Test User',
          password,
          role: 'user',
        })
        .expect(201);

      created_user_ids.push(register_response.body.data.id);

      const login_response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username,
          password,
        })
        .expect(200);

      const access_token = login_response.body.access_token;

      // Logout
      const logout_response = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${access_token}`)
        .expect(200);

      expect(logout_response.body.success).toBe(true);
      expect(logout_response.body.message).toBe('Logged out successfully');
    });

    it('should invalidate token after logout', async () => {
      const username = `logout_invalidate_user_${Date.now()}`;
      const email = `logout_inv_${Date.now()}@example.com`;
      const password = 'password123';

      // Register and login
      const register_response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username,
          email,
          full_name: 'Test User',
          password,
          role: 'user',
        })
        .expect(201);

      created_user_ids.push(register_response.body.data.id);

      const login_response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username,
          password,
        })
        .expect(200);

      const access_token = login_response.body.access_token;

      // Logout
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${access_token}`)
        .expect(200);

      // Try to use the token again - should fail
      const reuse_response = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${access_token}`)
        .expect(401);

      expect(reuse_response.body.message).toBe('Token has been revoked');
    });

    it('should reject logout without authorization header', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .expect(401);

      expect(response.body.message).toBe('Authorization header missing');
    });
  });
});
