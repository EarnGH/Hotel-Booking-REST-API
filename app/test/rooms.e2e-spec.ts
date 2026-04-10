import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { CreateRoomDto } from '../src/rooms/dto/create-room.dto';
import { UpdateRoomDto } from '../src/rooms/dto/update-room.dto';

import * as bcrypt from 'bcrypt';
import { PrismaService } from '../src/prisma/prisma.service';
import { Role } from '../src/auth/enums/roles.enum';

// Optional: mock redis store if your app uses redis cache and it causes test issues
jest.mock('cache-manager-redis-yet', () => ({
  redisStore: () => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  }),
}));

describe('Rooms E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let access_token: string;
  let created_room_id: number | null = null;
  let created_user_id: number | null = null;
  let test_username: string;

  beforeAll(async () => {
    const module_fixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module_fixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    test_username = `test_admin_${Date.now()}`;
    const raw_password = 'password123';
    const password_hash = await bcrypt.hash(raw_password, 10);

    const created_user = await prisma.users.create({
      data: {
        username: test_username,
        password_hash,
        role: Role.ADMIN,
      },
    });

    created_user_id = created_user.id;

    const login_response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: test_username,
        password: raw_password,
      })
      .expect(200);

    access_token = login_response.body.access_token;
  });

  afterAll(async () => {
    if (created_room_id !== null) {
      try {
        await prisma.rooms.delete({
          where: { id: created_room_id },
        });
      } catch {}
    }

    if (created_user_id !== null) {
      try {
        await prisma.users.delete({
          where: { id: created_user_id },
        });
      } catch {}
    }

    await app.close();
  });

  describe('/rooms (POST)', () => {
    it('should create a room', async () => {
      const dto: CreateRoomDto = {
        name: `E2E Room ${Date.now()}`,
        capacity: 2,
        price_per_night: 1800,
        description: 'E2E test room',
        image_url: '/images/e2e-room.jpg',
        is_active: true,
      };

      const response = await request(app.getHttpServer())
        .post('/rooms')
        .set('Authorization', `Bearer ${access_token}`)
        .send(dto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(dto.name);
      expect(response.body.capacity).toBe(dto.capacity);
      expect(response.body.price_per_night).toBe(dto.price_per_night);
      expect(response.body.description).toBe(dto.description);
      expect(response.body.image_url).toBe(dto.image_url);
      expect(response.body.is_active).toBe(dto.is_active);

      created_room_id = response.body.id;
    });

    it('should return 401 without token', async () => {
      const dto: CreateRoomDto = {
        name: 'Unauthorized Room',
        capacity: 2,
        price_per_night: 1500,
      };

      await request(app.getHttpServer())
        .post('/rooms')
        .send(dto)
        .expect(401);
    });
  });

  describe('/rooms (GET)', () => {
    it('should get all rooms', async () => {
      const response = await request(app.getHttpServer())
        .get('/rooms')
        .set('Authorization', `Bearer ${access_token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      const found_room = response.body.find(
        (room: any) => room.id === created_room_id,
      );
      expect(found_room).toBeDefined();
    });
  });

  describe('/rooms/search (GET)', () => {
    it('should search rooms with filters', async () => {
      const response = await request(app.getHttpServer())
        .get('/rooms/search')
        .query({
          keyword: 'E2E',
          is_active: 'true',
          min_capacity: '2',
          max_price: '2000',
          limit: '10',
          offset: '0',
        })
        .set('Authorization', `Bearer ${access_token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);

      const found_room = response.body.data.find(
        (room: any) => room.id === created_room_id,
      );
      expect(found_room).toBeDefined();
    });
  });

  describe('/rooms/:id (GET)', () => {
    it('should get one room by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/rooms/${created_room_id}`)
        .set('Authorization', `Bearer ${access_token}`)
        .expect(200);

      expect(response.body.id).toBe(created_room_id);
    });

    it('should return 404 for non-existing room', async () => {
      await request(app.getHttpServer())
        .get('/rooms/999999')
        .set('Authorization', `Bearer ${access_token}`)
        .expect(404);
    });
  });

  describe('/rooms/:id (PUT)', () => {
    it('should update a room', async () => {
      const dto: UpdateRoomDto = {
        name: 'Updated E2E Room',
        price_per_night: 2200,
      };

      const response = await request(app.getHttpServer())
        .put(`/rooms/${created_room_id}`)
        .set('Authorization', `Bearer ${access_token}`)
        .send(dto)
        .expect(200);

      expect(response.body.id).toBe(created_room_id);
      expect(response.body.name).toBe(dto.name);
      expect(response.body.price_per_night).toBe(dto.price_per_night);
    });

    it('should return 404 when updating non-existing room', async () => {
      const dto: UpdateRoomDto = {
        name: 'Does not exist',
      };

      await request(app.getHttpServer())
        .put('/rooms/999999')
        .set('Authorization', `Bearer ${access_token}`)
        .send(dto)
        .expect(404);
    });
  });

  describe('/rooms/:id/disable (PATCH)', () => {
    it('should disable a room', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/rooms/${created_room_id}/disable`)
        .set('Authorization', `Bearer ${access_token}`)
        .expect(200);

      expect(response.body.id).toBe(created_room_id);
      expect(response.body.is_active).toBe(false);
    });
  });

  describe('/rooms/:id/enable (PATCH)', () => {
    it('should enable a room', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/rooms/${created_room_id}/enable`)
        .set('Authorization', `Bearer ${access_token}`)
        .expect(200);

      expect(response.body.id).toBe(created_room_id);
      expect(response.body.is_active).toBe(true);
    });
  });

  describe('/rooms/:id (DELETE)', () => {
    it('should delete a room', async () => {
      await request(app.getHttpServer())
        .delete(`/rooms/${created_room_id}`)
        .set('Authorization', `Bearer ${access_token}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/rooms/${created_room_id}`)
        .set('Authorization', `Bearer ${access_token}`)
        .expect(404);

      created_room_id = null;
    });

    it('should return 404 when deleting non-existing room', async () => {
      await request(app.getHttpServer())
        .delete('/rooms/999')
        .set('Authorization', `Bearer ${access_token}`)
        .expect(404);
    });
  });
});