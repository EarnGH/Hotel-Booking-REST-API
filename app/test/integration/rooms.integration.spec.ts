import { INestApplication, ValidationPipe, ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { RoomsModule } from '../../src/rooms/rooms.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../src/auth/guards/roles.guard';
import { CacheInterceptor } from '@nestjs/cache-manager';

describe('Rooms Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let created_room_ids: number[] = [];

  beforeAll(async () => {
    const module_fixture: TestingModule = await Test.createTestingModule({
      imports: [RoomsModule],
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
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }

    if (prisma) {
      await prisma.$disconnect();
    }
  });

  describe('POST /rooms', () => {
    it('should create a room', async () => {
      const dto = {
        name: 'Integration Room 101',
        description: 'Created by integration test',
        capacity: 2,
        price_per_night: 1800,
        image_url: '/images/integration-room-101.jpg',
        is_active: true,
      };

      const response = await request(app.getHttpServer())
        .post('/rooms')
        .send(dto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: expect.any(Number),
        name: dto.name,
        description: dto.description,
        capacity: dto.capacity,
        price_per_night: dto.price_per_night,
        image_url: dto.image_url,
        is_active: dto.is_active,
      });

      const created_id = response.body.data.id;
      created_room_ids.push(created_id);

      const room_in_db = await prisma.rooms.findUnique({
        where: { id: created_id },
      });

      expect(room_in_db).toBeTruthy();
      expect(room_in_db?.name).toBe(dto.name);
      expect(Number(room_in_db?.price_per_night)).toBe(dto.price_per_night);
    });

    it('should reject invalid request body', async () => {
      const invalid_dto = {
        name: '',
        capacity: 'not-a-number',
        price_per_night: 'abc',
      };

      await request(app.getHttpServer())
        .post('/rooms')
        .send(invalid_dto)
        .expect(400);
    });
  });

  describe('GET /rooms', () => {
    it('should return all rooms', async () => {
      const room_1 = await prisma.rooms.create({
        data: {
          name: 'Integration List Room 1',
          description: 'First room',
          capacity: 2,
          price_per_night: 1500,
          image_url: '/images/list-room-1.jpg',
          is_active: true,
        },
      });

      const room_2 = await prisma.rooms.create({
        data: {
          name: 'Integration List Room 2',
          description: 'Second room',
          capacity: 4,
          price_per_night: 2500,
          image_url: '/images/list-room-2.jpg',
          is_active: true,
        },
      });

      created_room_ids.push(room_1.id, room_2.id);

      const response = await request(app.getHttpServer())
        .get('/rooms')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      const room_names = response.body.data.map((room: any) => room.name);
      expect(room_names).toContain('Integration List Room 1');
      expect(room_names).toContain('Integration List Room 2');
    });
  });

  describe('GET /rooms/search', () => {
    it('should return rooms matching filters', async () => {
      const matching_room = await prisma.rooms.create({
        data: {
          name: 'Ocean Integration Suite',
          description: 'Room with ocean view',
          capacity: 3,
          price_per_night: 3000,
          image_url: '/images/ocean-suite.jpg',
          is_active: true,
        },
      });

      const non_matching_room = await prisma.rooms.create({
        data: {
          name: 'Budget Tiny Room',
          description: 'Cheap room',
          capacity: 1,
          price_per_night: 900,
          image_url: '/images/budget-room.jpg',
          is_active: false,
        },
      });

      created_room_ids.push(matching_room.id, non_matching_room.id);

      const response = await request(app.getHttpServer())
        .get('/rooms/search')
        .query({
          keyword: 'Ocean',
          is_active: 'true',
          min_capacity: '2',
          max_price: '3500',
          limit: '10',
          offset: '0',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      const room_names = response.body.data.map((room: any) => room.name);
      expect(room_names).toContain('Ocean Integration Suite');
      expect(room_names).not.toContain('Budget Tiny Room');
    });
  });

  describe('GET /rooms/:id', () => {
    it('should return one room by id', async () => {
      const room = await prisma.rooms.create({
        data: {
          name: 'Integration FindOne Room',
          description: 'Find one room test',
          capacity: 2,
          price_per_night: 1700,
          image_url: '/images/findone-room.jpg',
          is_active: true,
        },
      });

      created_room_ids.push(room.id);

      const response = await request(app.getHttpServer())
        .get(`/rooms/${room.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: room.id,
        name: room.name,
        description: room.description,
        capacity: room.capacity,
        price_per_night: 1700,
        image_url: room.image_url,
        is_active: room.is_active,
      });
    });

    it('should return 404 when room does not exist', async () => {
      await request(app.getHttpServer())
        .get('/rooms/999999')
        .expect(404);
    });
  });

  describe('PUT /rooms/:id', () => {
    it('should update a room', async () => {
      const room = await prisma.rooms.create({
        data: {
          name: 'Old Integration Room',
          description: 'Old description',
          capacity: 2,
          price_per_night: 1600,
          image_url: '/images/old-room.jpg',
          is_active: true,
        },
      });

      created_room_ids.push(room.id);

      const dto = {
        name: 'Updated Integration Room',
        description: 'Updated description',
        capacity: 4,
        price_per_night: 2400,
        image_url: '/images/updated-room.jpg',
        is_active: false,
      };

      const response = await request(app.getHttpServer())
        .put(`/rooms/${room.id}`)
        .send(dto)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: room.id,
        ...dto,
      });

      const updated_room = await prisma.rooms.findUnique({
        where: { id: room.id },
      });

      expect(updated_room).toBeTruthy();
      expect(updated_room?.name).toBe(dto.name);
      expect(updated_room?.description).toBe(dto.description);
      expect(updated_room?.capacity).toBe(dto.capacity);
      expect(Number(updated_room?.price_per_night)).toBe(dto.price_per_night);
      expect(updated_room?.is_active).toBe(dto.is_active);
    });
  });

  describe('PATCH /rooms/:id/disable', () => {
    it('should disable a room', async () => {
      const room = await prisma.rooms.create({
        data: {
          name: 'Room To Disable',
          description: 'Disable test',
          capacity: 2,
          price_per_night: 1800,
          image_url: '/images/disable-room.jpg',
          is_active: true,
        },
      });

      created_room_ids.push(room.id);

      const response = await request(app.getHttpServer())
        .patch(`/rooms/${room.id}/disable`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(room.id);
      expect(response.body.data.is_active).toBe(false);

      const room_in_db = await prisma.rooms.findUnique({
        where: { id: room.id },
      });

      expect(room_in_db?.is_active).toBe(false);
    });
  });

  describe('PATCH /rooms/:id/enable', () => {
    it('should enable a room', async () => {
      const room = await prisma.rooms.create({
        data: {
          name: 'Room To Enable',
          description: 'Enable test',
          capacity: 2,
          price_per_night: 1800,
          image_url: '/images/enable-room.jpg',
          is_active: false,
        },
      });

      created_room_ids.push(room.id);

      const response = await request(app.getHttpServer())
        .patch(`/rooms/${room.id}/enable`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(room.id);
      expect(response.body.data.is_active).toBe(true);

      const room_in_db = await prisma.rooms.findUnique({
        where: { id: room.id },
      });

      expect(room_in_db?.is_active).toBe(true);
    });
  });

  describe('DELETE /rooms/:id', () => {
    it('should delete a room', async () => {
      const room = await prisma.rooms.create({
        data: {
          name: 'Room To Delete',
          description: 'Delete test',
          capacity: 2,
          price_per_night: 1800,
          image_url: '/images/delete-room.jpg',
          is_active: true,
        },
      });

      const response = await request(app.getHttpServer())
        .delete(`/rooms/${room.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(room.id);

      const deleted_room = await prisma.rooms.findUnique({
        where: { id: room.id },
      });

      expect(deleted_room).toBeNull();
    });

    it('should return 404 when deleting a non-existing room', async () => {
      await request(app.getHttpServer())
        .delete('/rooms/999999')
        .expect(404);
    });
  });
});