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
    from_date?: string;
    to_date?: string;
    limit?: string;
    offset?: string;
  }) {
    const {
      keyword,
      is_active,
      min_capacity,
      max_price,
      from_date,
      to_date,
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

    let bookedRoomIds: number[] = [];

    // If date range is provided, filter out booked rooms
    if (from_date && to_date) {
      try {
        const startDate = new Date(from_date);
        const endDate = new Date(to_date);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          throw new BadRequestException('Invalid date format. Use ISO format: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ');
        }

        if (startDate >= endDate) {
          throw new BadRequestException('from_date must be before to_date');
        }

        // Find all bookings that overlap with the requested date range
        // Overlapping condition: booking.start_date < to_date AND booking.end_date > from_date
        const bookedRooms = await this.prisma.bookings.findMany({
          where: {
            start_date: {
              lt: endDate,
            },
            end_date: {
              gt: startDate,
            },
            status: {
              in: ['PENDING', 'APPROVED', 'PAID'],
            },
          },
          select: {
            room_id: true,
          },
          distinct: ['room_id'],
        });

        bookedRoomIds = bookedRooms.map((b) => b.room_id);
      } catch (e) {
        if (e instanceof BadRequestException) {
          throw e;
        }
        this.logger.error('Error filtering bookings', e);
        throw new BadRequestException('Error processing date range');
      }
    }

    // Exclude booked rooms from results
    if (bookedRoomIds.length > 0) {
      where.id = {
        notIn: bookedRoomIds,
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