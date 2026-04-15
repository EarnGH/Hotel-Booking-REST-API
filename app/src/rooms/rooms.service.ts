import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}
  private readonly logger = new Logger(RoomsService.name);

  private format_room(room: any) {
    if (!room) return room;

    return {
      ...room,
      price_per_night: Number(room.price_per_night),
    };
  }

  private format_rooms(rooms: any[]) {
    return rooms.map((room) => this.format_room(room));
  }

  async create(createRoomDto: CreateRoomDto) {
    this.logger.log(`Creating room: ${createRoomDto.name}`);

    try {
      const room = await this.prisma.rooms.create({
        data: {
          ...createRoomDto,
          is_active: createRoomDto.is_active ?? true,
        },
      });

      return this.format_room(room);
    } catch (e: any) {
      this.logger.error('Create failed');
      throw new BadRequestException(e?.message ?? 'Create failed');
    }
  }

  async findAll() {
    this.logger.log('Fetching all rooms');

    const rooms = await this.prisma.rooms.findMany({
      orderBy: {
        created_at: 'asc',
      },
    });

    return this.format_rooms(rooms);
  }

  async searchRooms(filters: {
    keyword?: string;
    is_active?: string;
    min_capacity?: string;
    max_price?: string;
    limit?: string;
    offset?: string;
  }) {
    const {
      keyword,
      is_active,
      min_capacity,
      max_price,
      limit,
      offset,
    } = filters;

    const where: any = {};

    if (keyword) {
      where.OR = [
        {
          name: {
            contains: keyword,
          },
        },
        {
          description: {
            contains: keyword,
          },
        },
      ];
    }

    if (is_active !== undefined && is_active !== '') {
      where.is_active = is_active === 'true';
    }

    if (min_capacity) {
      where.capacity = {
        gte: Number(min_capacity),
      };
    }

    if (max_price) {
      where.price_per_night = {
        lte: Number(max_price),
      };
    }

    const rooms = await this.prisma.rooms.findMany({
      where,
      ...(limit && { take: Number(limit) }),
      ...(offset && { skip: Number(offset) }),
      orderBy: {
        created_at: 'asc',
      },
    });

    return this.format_rooms(rooms);
  }

  async findOne(id: number) {
    this.logger.log(`Fetching room id=${id}`);

    const room = await this.prisma.rooms.findUnique({
      where: { id },
    });

    if (!room) {
      this.logger.warn(`Room ${id} not found`);
      throw new NotFoundException(`Room ${id} not found`);
    }

    return this.format_room(room);
  }

  async disable(id: number) {
    this.logger.log(`Disabling room id=${id}`);

    await this.findOne(id);

    const room = await this.prisma.rooms.update({
      where: { id },
      data: { is_active: false },
    });

    return this.format_room(room);
  }

  async enable(id: number) {
    this.logger.log(`Enabling room id=${id}`);

    await this.findOne(id);

    const room = await this.prisma.rooms.update({
      where: { id },
      data: { is_active: true },
    });

    return this.format_room(room);
  }

  async update(id: number, updateRoomDto: UpdateRoomDto) {
    this.logger.log(`Updating room id=${id}`);

    await this.findOne(id);

    const room = await this.prisma.rooms.update({
      where: { id },
      data: {
        ...updateRoomDto,
      },
    });

    return this.format_room(room);
  }

  async remove(id: number) {
    this.logger.log(`Deleting room id=${id}`);

    await this.findOne(id);

    const room = await this.prisma.rooms.delete({
      where: { id },
    });

    return this.format_room(room);
  }
}