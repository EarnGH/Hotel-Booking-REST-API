import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../auth/enums/roles.enum';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { AdminUpdateBookingDto } from './dto/admin-update-booking.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}
  private readonly logger = new Logger(BookingsService.name);

  private format_booking(booking: any) {
    if (!booking) return booking;

    return {
      ...booking,
      total_price: Number(booking.total_price),
      room: booking.room
        ? {
            ...booking.room,
            price_per_night: Number(booking.room.price_per_night),
          }
        : booking.room,
    };
  }

  private format_bookings(bookings: any[]) {
    return bookings.map((booking) => this.format_booking(booking));
  }

  private validate_dates(start_date: string | Date, end_date: string | Date) {
    const start = new Date(start_date);
    const end = new Date(end_date);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid booking dates');
    }

    if (start >= end) {
      throw new BadRequestException('End date must be after start date');
    }

    return { start, end };
  }

  private calculate_total_price(
    start_date: Date,
    end_date: Date,
    price_per_night: number,
  ) {
    const diff_ms = end_date.getTime() - start_date.getTime();
    const nights = Math.ceil(diff_ms / (1000 * 60 * 60 * 24));

    if (nights <= 0) {
      throw new BadRequestException('Booking must be at least 1 night');
    }

    return Number((nights * price_per_night).toFixed(2));
  }

  private async check_room_exists(room_id: number) {
    const room = await this.prisma.rooms.findUnique({
      where: { id: room_id },
    });

    if (!room) {
      throw new NotFoundException(`Room ${room_id} not found`);
    }

    if (!room.is_active) {
      throw new BadRequestException(`Room ${room_id} is not active`);
    }

    return room;
  }

  private async check_booking_overlap(
    room_id: number,
    start_date: Date,
    end_date: Date,
    exclude_booking_id?: number,
  ) {
    const overlapping_booking = await this.prisma.bookings.findFirst({
      where: {
        room_id,
        status: {
          in: [BookingStatus.PENDING, BookingStatus.APPROVED, BookingStatus.PAID],
        },
        ...(exclude_booking_id !== undefined && {
          id: {
            not: exclude_booking_id,
          },
        }),
        AND: [
          {
            start_date: {
              lt: end_date,
            },
          },
          {
            end_date: {
              gt: start_date,
            },
          },
        ],
      },
    });

    if (overlapping_booking) {
      throw new BadRequestException('Room is already booked for the selected dates');
    }
  }

  private async get_booking_if_accessible(id: number, user: any) {
    const booking = await this.prisma.bookings.findUnique({
      where: { id },
      include: {
        room: true,
        user: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking ${id} not found`);
    }

    if (user.role !== Role.ADMIN && booking.user_id !== user.id) {
      throw new ForbiddenException('You can only access your own bookings');
    }

    return booking;
  }

  async create(createBookingDto: CreateBookingDto & { user_id: number }) {
    this.logger.log(`Creating booking for user_id=${createBookingDto.user_id}`);

    const { start, end } = this.validate_dates(
      createBookingDto.start_date,
      createBookingDto.end_date,
    );

    const room = await this.check_room_exists(createBookingDto.room_id);

    if (createBookingDto.guest_count > room.capacity) {
      throw new BadRequestException(
        `Guest count exceeds room capacity (${room.capacity})`,
      );
    }

    await this.check_booking_overlap(room.id, start, end);

    const total_price = this.calculate_total_price(
      start,
      end,
      Number(room.price_per_night),
    );

    const booking = await this.prisma.bookings.create({
      data: {
        user_id: createBookingDto.user_id,
        room_id: createBookingDto.room_id,
        start_date: start,
        end_date: end,
        guest_count: createBookingDto.guest_count,
        total_price,
        status: BookingStatus.PENDING,
      },
      include: {
        room: true,
        user: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
    });

    await this.notificationsService.createNotification({
      user_id: booking.user_id,
      booking_id: booking.id,
      type: 'BOOKING_CREATED',
      message: `Booking #${booking.id} has been created successfully.`,
    });

    return this.format_booking(booking);
  }

  async findAll(user: any) {
    this.logger.log(`Fetching bookings for user_id=${user.id}, role=${user.role}`);

    const bookings = await this.prisma.bookings.findMany({
      where: user.role === Role.ADMIN ? {} : { user_id: user.id },
      include: {
        room: true,
        user: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
      orderBy: {
        created_at: 'asc',
      },
    });

    return this.format_bookings(bookings);
  }

  async searchBookings(
    user: any,
    filters: {
      room_id?: string;
      status?: string;
      start_date?: string;
      end_date?: string;
      limit?: string;
      offset?: string;
    },
  ) {
    const { room_id, status, start_date, end_date, limit, offset } = filters;

    const where: any = {};

    if (user.role !== Role.ADMIN) {
      where.user_id = user.id;
    }

    if (room_id) {
      where.room_id = Number(room_id);
    }

    if (status) {
      where.status = status;
    }

    if (start_date || end_date) {
      where.AND = [];
    }

    if (start_date) {
      where.AND.push({
        start_date: {
          gte: new Date(start_date),
        },
      });
    }

    if (end_date) {
      where.AND.push({
        end_date: {
          lte: new Date(end_date),
        },
      });
    }

    const bookings = await this.prisma.bookings.findMany({
      where,
      include: {
        room: true,
        user: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
      ...(limit && { take: Number(limit) }),
      ...(offset && { skip: Number(offset) }),
      orderBy: {
        created_at: 'asc',
      },
    });

    return this.format_bookings(bookings);
  }

  async findOne(id: number, user: any) {
    this.logger.log(`Fetching booking id=${id} for user_id=${user.id}`);

    const booking = await this.get_booking_if_accessible(id, user);

    return this.format_booking(booking);
  }

  async update(id: number, updateBookingDto: UpdateBookingDto, user: any) {
    this.logger.log(`User updating booking id=${id}, user_id=${user.id}`);

    const existing_booking = await this.get_booking_if_accessible(id, user);

    const next_room_id = updateBookingDto.room_id ?? existing_booking.room_id;
    const next_start_date = updateBookingDto.start_date ?? existing_booking.start_date;
    const next_end_date = updateBookingDto.end_date ?? existing_booking.end_date;
    const next_guest_count = updateBookingDto.guest_count ?? existing_booking.guest_count;

    const { start, end } = this.validate_dates(next_start_date, next_end_date);

    const room = await this.check_room_exists(next_room_id);

    if (next_guest_count > room.capacity) {
      throw new BadRequestException(
        `Guest count exceeds room capacity (${room.capacity})`,
      );
    }

    await this.check_booking_overlap(room.id, start, end, id);

    const total_price = this.calculate_total_price(
      start,
      end,
      Number(room.price_per_night),
    );

    const booking = await this.prisma.bookings.update({
      where: { id },
      data: {
        room_id: next_room_id,
        start_date: start,
        end_date: end,
        guest_count: next_guest_count,
        total_price,
      },
      include: {
        room: true,
        user: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
    });

    return this.format_booking(booking);
  }

  async adminUpdate(
    id: number,
    adminUpdateBookingDto: AdminUpdateBookingDto,
    user: any,
  ) {
    this.logger.log(`Admin updating booking id=${id}, user_id=${user.id}`);

    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admin can use this endpoint');
    }

    const existing_booking = await this.prisma.bookings.findUnique({
      where: { id },
      include: {
        room: true,
        user: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
    });

    if (!existing_booking) {
      throw new NotFoundException(`Booking ${id} not found`);
    }

    const old_status = existing_booking.status;
    const new_status = adminUpdateBookingDto.status ?? existing_booking.status;

    const next_room_id = adminUpdateBookingDto.room_id ?? existing_booking.room_id;
    const next_start_date =
      adminUpdateBookingDto.start_date ?? existing_booking.start_date;
    const next_end_date =
      adminUpdateBookingDto.end_date ?? existing_booking.end_date;
    const next_guest_count =
      adminUpdateBookingDto.guest_count ?? existing_booking.guest_count;

    const { start, end } = this.validate_dates(next_start_date, next_end_date);

    const room = await this.check_room_exists(next_room_id);

    if (next_guest_count > room.capacity) {
      throw new BadRequestException(
        `Guest count exceeds room capacity (${room.capacity})`,
      );
    }

    await this.check_booking_overlap(room.id, start, end, id);

    const total_price = this.calculate_total_price(
      start,
      end,
      Number(room.price_per_night),
    );

    const booking = await this.prisma.bookings.update({
      where: { id },
      data: {
        ...(adminUpdateBookingDto.user_id !== undefined && {
          user_id: adminUpdateBookingDto.user_id,
        }),
        room_id: next_room_id,
        start_date: start,
        end_date: end,
        guest_count: next_guest_count,
        total_price,
        status: new_status,
      },
      include: {
        room: true,
        user: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
    });

    if (old_status !== new_status) {
      let notification_type = '';
      let notification_message = '';

      if (new_status === BookingStatus.APPROVED) {
        notification_type = 'BOOKING_APPROVED';
        notification_message = `Booking #${booking.id} has been approved.`;
      } else if (new_status === BookingStatus.CANCELLED) {
        notification_type = 'BOOKING_CANCELLED';
        notification_message = `Booking #${booking.id} has been cancelled.`;
      } else if (new_status === BookingStatus.PAID) {
        notification_type = 'BOOKING_PAID';
        notification_message = `Booking #${booking.id} has been marked as paid.`;
      } else if (new_status === BookingStatus.PENDING) {
        notification_type = 'BOOKING_PENDING';
        notification_message = `Booking #${booking.id} status has been changed to pending.`;
      }

      if (notification_type) {
        await this.notificationsService.createNotification({
          user_id: booking.user_id,
          booking_id: booking.id,
          type: notification_type,
          message: notification_message,
        });
      }
    }

    return this.format_booking(booking);
  }

  async remove(id: number, user: any) {
    this.logger.log(`Deleting booking id=${id}, user_id=${user.id}`);

    await this.get_booking_if_accessible(id, user);

    const booking = await this.prisma.bookings.delete({
      where: { id },
      include: {
        room: true,
        user: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
    });

    await this.notificationsService.createNotification({
      user_id: booking.user_id,
      booking_id: booking.id,
      type: 'BOOKING_DELETED',
      message: `Booking #${booking.id} has been deleted successfully.`,
    });

    return this.format_booking(booking);
  }
}