import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Query,
  Delete,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { AdminUpdateBookingDto } from './dto/admin-update-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/roles.enum';

@ApiTags('bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.USER)
  @ApiOperation({ summary: 'Create a new booking' })
  @ApiResponse({
    status: 201,
    description: 'Booking created successfully. New bookings are created with PENDING status by default.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            user_id: { type: 'number', example: 3 },
            room_id: { type: 'number', example: 2 },
            start_date: {
              type: 'string',
              format: 'date-time',
              example: '2026-04-20',
            },
            end_date: {
              type: 'string',
              format: 'date-time',
              example: '2026-04-22',
            },
            guest_count: { type: 'number', example: 2 },
            total_price: { type: 'number', example: 3600 },
            status: { type: 'string', example: 'PENDING' },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-04-14',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-04-14',
            },
            user: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 3 },
                username: { type: 'string', example: 'nanthit' },
                role: { type: 'string', example: 'user' },
              },
            },
            room: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 2 },
                name: { type: 'string', example: 'Ocean View Suite' },
                description: { type: 'string', example: 'A comfortable ocean-facing room.' },
                capacity: { type: 'number', example: 4 },
                price_per_night: { type: 'number', example: 1800 },
                image_url: { type: 'string', example: '/images/room201.jpg' },
                is_active: { type: 'boolean', example: true },
                created_at: {
                  type: 'string',
                  format: 'date-time',
                  example: '2026-04-10',
                },
                updated_at: {
                  type: 'string',
                  format: 'date-time',
                  example: '2026-04-10',
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 429, description: 'Too Many Requests' })
  async create(@Body() createBookingDto: CreateBookingDto, @Req() req) {
    const booking = await this.bookingsService.create({
      ...createBookingDto,
      user_id: req.user.id,
    });

    return {
      success: true,
      data: booking,
    };
  }

  @Get()
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.USER)
  @Throttle({ default: { limit: 100, ttl: 30 * 1000 } })
  @ApiOperation({ summary: 'Retrieve bookings based on user role' })
  @ApiResponse({
    status: 200,
    description: 'Admin gets all bookings, user gets only their own bookings',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 3 },
              user_id: { type: 'number', example: 2 },
              room_id: { type: 'number', example: 4 },
              start_date: {
                type: 'string',
                format: 'date-time',
                example: '2026-04-20T00:00:00.000Z',
              },
              end_date: {
                type: 'string',
                format: 'date-time',
                example: '2026-04-22T00:00:00.000Z',
              },
              guest_count: { type: 'number', example: 2 },
              total_price: { type: 'number', example: 13000 },
              status: { type: 'string', example: 'PENDING' },
              created_at: {
                type: 'string',
                format: 'date-time',
                example: '2026-04-14T09:13:52.057Z',
              },
              updated_at: {
                type: 'string',
                format: 'date-time',
                example: '2026-04-14T09:13:52.057Z',
              },
              room: {
                type: 'object',
                properties: {
                  id: { type: 'number', example: 4 },
                  name: { type: 'string', example: 'Suite Room 401' },
                  description: {
                    type: 'string',
                    example: 'Luxury suite with living area and sea view',
                  },
                  capacity: { type: 'number', example: 3 },
                  price_per_night: { type: 'number', example: 6500 },
                  image_url: { type: 'string', example: '/images/room401.jpg' },
                  is_active: { type: 'boolean', example: true },
                  created_at: {
                    type: 'string',
                    format: 'date-time',
                    example: '2026-04-14T08:29:37.000Z',
                  },
                  updated_at: {
                    type: 'string',
                    format: 'date-time',
                    example: '2026-04-14T08:29:37.000Z',
                  },
                },
              },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'number', example: 2 },
                  username: { type: 'string', example: 'john_doe' },
                  role: { type: 'string', example: 'user' },
                },
              },
            },
          },
        },
      },
      example: {
        success: true,
        data: [
          {
            id: 3,
            user_id: 2,
            room_id: 4,
            start_date: '2026-04-20T00:00:00.000Z',
            end_date: '2026-04-22T00:00:00.000Z',
            guest_count: 2,
            total_price: 13000,
            status: 'PENDING',
            created_at: '2026-04-14T09:13:52.057Z',
            updated_at: '2026-04-14T09:13:52.057Z',
            room: {
              id: 4,
              name: 'Suite Room 401',
              description: 'Luxury suite with living area and sea view',
              capacity: 3,
              price_per_night: 6500,
              image_url: '/images/room401.jpg',
              is_active: true,
              created_at: '2026-04-14T08:29:37.000Z',
              updated_at: '2026-04-14T08:29:37.000Z',
            },
            user: {
              id: 2,
              username: 'john_doe',
              role: 'user',
            },
          },
          {
            id: 4,
            user_id: 2,
            room_id: 4,
            start_date: '2026-04-22T00:00:00.000Z',
            end_date: '2026-04-25T00:00:00.000Z',
            guest_count: 2,
            total_price: 19500,
            status: 'PENDING',
            created_at: '2026-04-14T09:14:59.534Z',
            updated_at: '2026-04-14T09:14:59.534Z',
            room: {
              id: 4,
              name: 'Suite Room 401',
              description: 'Luxury suite with living area and sea view',
              capacity: 3,
              price_per_night: 6500,
              image_url: '/images/room401.jpg',
              is_active: true,
              created_at: '2026-04-14T08:29:37.000Z',
              updated_at: '2026-04-14T08:29:37.000Z',
            },
            user: {
              id: 2,
              username: 'john_doe',
              role: 'user',
            },
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 429, description: 'Too Many Requests' })
  async findAll(@Req() req) {
    const bookings = await this.bookingsService.findAll(req.user);

    return {
      success: true,
      data: bookings,
    };
  }

  @Get('search')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.USER)
  @Throttle({ default: { limit: 100, ttl: 1000 * 30 } })
  @ApiOperation({ summary: 'Search bookings based on user role' })
  @ApiQuery({
    name: 'room_id',
    required: false,
    type: Number,
    description: 'Filter by room ID',
    example: 2,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filter by booking status',
    example: 'PENDING',
  })
  @ApiQuery({
    name: 'start_date',
    required: false,
    type: String,
    description: 'Filter bookings starting from this date',
    example: '2026-04-20',
  })
  @ApiQuery({
    name: 'end_date',
    required: false,
    type: String,
    description: 'Filter bookings ending before this date',
    example: '2026-04-30',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of bookings to return',
    example: 10,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of bookings to skip for pagination',
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: 'Admin searches all bookings, user searches only their own bookings',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 3 },
              user_id: { type: 'number', example: 2 },
              room_id: { type: 'number', example: 4 },
              start_date: {
                type: 'string',
                format: 'date-time',
                example: '2026-04-20T00:00:00.000Z',
              },
              end_date: {
                type: 'string',
                format: 'date-time',
                example: '2026-04-22T00:00:00.000Z',
              },
              guest_count: { type: 'number', example: 2 },
              total_price: { type: 'number', example: 13000 },
              status: { type: 'string', example: 'PENDING' },
              created_at: {
                type: 'string',
                format: 'date-time',
                example: '2026-04-14T09:13:52.057Z',
              },
              updated_at: {
                type: 'string',
                format: 'date-time',
                example: '2026-04-14T09:13:52.057Z',
              },
              room: {
                type: 'object',
                properties: {
                  id: { type: 'number', example: 4 },
                  name: { type: 'string', example: 'Suite Room 401' },
                  description: {
                    type: 'string',
                    example: 'Luxury suite with living area and sea view',
                  },
                  capacity: { type: 'number', example: 3 },
                  price_per_night: { type: 'number', example: 6500 },
                  image_url: { type: 'string', example: '/images/room401.jpg' },
                  is_active: { type: 'boolean', example: true },
                  created_at: {
                    type: 'string',
                    format: 'date-time',
                    example: '2026-04-14T08:29:37.000Z',
                  },
                  updated_at: {
                    type: 'string',
                    format: 'date-time',
                    example: '2026-04-14T08:29:37.000Z',
                  },
                },
              },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'number', example: 2 },
                  username: { type: 'string', example: 'john_doe' },
                  role: { type: 'string', example: 'user' },
                },
              },
            },
          },
        },
      },
      example: {
        success: true,
        data: [
          {
            id: 3,
            user_id: 2,
            room_id: 4,
            start_date: '2026-04-20T00:00:00.000Z',
            end_date: '2026-04-22T00:00:00.000Z',
            guest_count: 2,
            total_price: 13000,
            status: 'PENDING',
            created_at: '2026-04-14T09:13:52.057Z',
            updated_at: '2026-04-14T09:13:52.057Z',
            room: {
              id: 4,
              name: 'Suite Room 401',
              description: 'Luxury suite with living area and sea view',
              capacity: 3,
              price_per_night: 6500,
              image_url: '/images/room401.jpg',
              is_active: true,
              created_at: '2026-04-14T08:29:37.000Z',
              updated_at: '2026-04-14T08:29:37.000Z',
            },
            user: {
              id: 2,
              username: 'john_doe',
              role: 'user',
            },
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 429, description: 'Too Many Requests' })
  async searchBookings(
    @Req() req,
    @Query('room_id') room_id?: string,
    @Query('status') status?: string,
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const bookings = await this.bookingsService.searchBookings(req.user, {
      room_id,
      status,
      start_date,
      end_date,
      limit,
      offset,
    });

    return {
      success: true,
      data: bookings,
    };
  }

  @Get(':id')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.USER)
  @ApiOperation({ summary: 'Retrieve a specific booking by ID' })
  @ApiParam({ name: 'id', description: 'Booking ID', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Booking details (admin can access any booking, user can access only their own)',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 3 },
            user_id: { type: 'number', example: 2 },
            room_id: { type: 'number', example: 4 },
            start_date: {
              type: 'string',
              format: 'date-time',
              example: '2026-04-20T00:00:00.000Z',
            },
            end_date: {
              type: 'string',
              format: 'date-time',
              example: '2026-04-22T00:00:00.000Z',
            },
            guest_count: { type: 'number', example: 2 },
            total_price: { type: 'number', example: 13000 },
            status: { type: 'string', example: 'PENDING' },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-04-14T09:13:52.057Z',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-04-14T09:13:52.057Z',
            },
            room: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 4 },
                name: { type: 'string', example: 'Suite Room 401' },
                description: {
                  type: 'string',
                  example: 'Luxury suite with living area and sea view',
                },
                capacity: { type: 'number', example: 3 },
                price_per_night: { type: 'number', example: 6500 },
                image_url: { type: 'string', example: '/images/room401.jpg' },
                is_active: { type: 'boolean', example: true },
                created_at: {
                  type: 'string',
                  format: 'date-time',
                  example: '2026-04-14T08:29:37.000Z',
                },
                updated_at: {
                  type: 'string',
                  format: 'date-time',
                  example: '2026-04-14T08:29:37.000Z',
                },
              },
            },
            user: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 2 },
                username: { type: 'string', example: 'john_doe' },
                role: { type: 'string', example: 'user' },
              },
            },
          },
        },
      },
      example: {
        success: true,
        data: {
          id: 3,
          user_id: 2,
          room_id: 4,
          start_date: '2026-04-20T00:00:00.000Z',
          end_date: '2026-04-22T00:00:00.000Z',
          guest_count: 2,
          total_price: 13000,
          status: 'PENDING',
          created_at: '2026-04-14T09:13:52.057Z',
          updated_at: '2026-04-14T09:13:52.057Z',
          room: {
            id: 4,
            name: 'Suite Room 401',
            description: 'Luxury suite with living area and sea view',
            capacity: 3,
            price_per_night: 6500,
            image_url: '/images/room401.jpg',
            is_active: true,
            created_at: '2026-04-14T08:29:37.000Z',
            updated_at: '2026-04-14T08:29:37.000Z',
          },
          user: {
            id: 2,
            username: 'john_doe',
            role: 'user',
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Booking not found or access denied' })
  @ApiResponse({ status: 429, description: 'Too Many Requests' })
  async findOne(@Param('id', ParseIntPipe) id: string, @Req() req) {
    const booking = await this.bookingsService.findOne(+id, req.user);

    return {
      success: true,
      data: booking,
    };
  }

  @Put(':id')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @ApiOperation({ summary: 'User update own booking' })
  @ApiParam({ name: 'id', description: 'Booking ID', type: Number })
  @ApiResponse({
    status: 200,
    description: 'User can update only their own booking',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 3 },
            user_id: { type: 'number', example: 2 },
            room_id: { type: 'number', example: 4 },
            start_date: {
              type: 'string',
              format: 'date-time',
              example: '2026-04-21T00:00:00.000Z',
            },
            end_date: {
              type: 'string',
              format: 'date-time',
              example: '2026-04-23T00:00:00.000Z',
            },
            guest_count: { type: 'number', example: 2 },
            total_price: { type: 'number', example: 13000 },
            status: { type: 'string', example: 'PENDING' },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-04-14T09:13:52.057Z',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-04-14T10:20:00.000Z',
            },
            room: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 4 },
                name: { type: 'string', example: 'Suite Room 401' },
                description: {
                  type: 'string',
                  example: 'Luxury suite with living area and sea view',
                },
                capacity: { type: 'number', example: 3 },
                price_per_night: { type: 'number', example: 6500 },
                image_url: { type: 'string', example: '/images/room401.jpg' },
                is_active: { type: 'boolean', example: true },
                created_at: {
                  type: 'string',
                  format: 'date-time',
                  example: '2026-04-14T08:29:37.000Z',
                },
                updated_at: {
                  type: 'string',
                  format: 'date-time',
                  example: '2026-04-14T08:29:37.000Z',
                },
              },
            },
            user: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 2 },
                username: { type: 'string', example: 'john_doe' },
                role: { type: 'string', example: 'user' },
              },
            },
          },
        },
      },
      example: {
        success: true,
        data: {
          id: 3,
          user_id: 2,
          room_id: 4,
          start_date: '2026-04-21T00:00:00.000Z',
          end_date: '2026-04-23T00:00:00.000Z',
          guest_count: 2,
          total_price: 13000,
          status: 'PENDING',
          created_at: '2026-04-14T09:13:52.057Z',
          updated_at: '2026-04-14T10:20:00.000Z',
          room: {
            id: 4,
            name: 'Suite Room 401',
            description: 'Luxury suite with living area and sea view',
            capacity: 3,
            price_per_night: 6500,
            image_url: '/images/room401.jpg',
            is_active: true,
            created_at: '2026-04-14T08:29:37.000Z',
            updated_at: '2026-04-14T08:29:37.000Z',
          },
          user: {
            id: 2,
            username: 'john_doe',
            role: 'user',
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Booking not found or access denied' })
  @ApiResponse({ status: 429, description: 'Too Many Requests' })
  async update(
    @Param('id', ParseIntPipe) id: string,
    @Body() updateBookingDto: UpdateBookingDto,
    @Req() req,
  ) {
    const booking = await this.bookingsService.update(+id, updateBookingDto, req.user);

    return {
      success: true,
      data: booking,
    };
  }

  @Put(':id/admin')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin update booking' })
  @ApiParam({ name: 'id', description: 'Booking ID', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Booking updated successfully by admin (admin can modify status, user, and booking details)',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 3 },
            user_id: { type: 'number', example: 2 },
            room_id: { type: 'number', example: 4 },
            start_date: {
              type: 'string',
              format: 'date-time',
              example: '2026-04-21T00:00:00.000Z',
            },
            end_date: {
              type: 'string',
              format: 'date-time',
              example: '2026-04-23T00:00:00.000Z',
            },
            guest_count: { type: 'number', example: 2 },
            total_price: { type: 'number', example: 13000 },
            status: { type: 'string', example: 'APPROVED' },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-04-14T09:13:52.057Z',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-04-14T10:45:00.000Z',
            },
            room: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 4 },
                name: { type: 'string', example: 'Suite Room 401' },
                description: {
                  type: 'string',
                  example: 'Luxury suite with living area and sea view',
                },
                capacity: { type: 'number', example: 3 },
                price_per_night: { type: 'number', example: 6500 },
                image_url: { type: 'string', example: '/images/room401.jpg' },
                is_active: { type: 'boolean', example: true },
                created_at: {
                  type: 'string',
                  format: 'date-time',
                  example: '2026-04-14T08:29:37.000Z',
                },
                updated_at: {
                  type: 'string',
                  format: 'date-time',
                  example: '2026-04-14T08:29:37.000Z',
                },
              },
            },
            user: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 2 },
                username: { type: 'string', example: 'john_doe' },
                role: { type: 'string', example: 'user' },
              },
            },
          },
        },
      },
      example: {
        success: true,
        data: {
          id: 3,
          user_id: 2,
          room_id: 4,
          start_date: '2026-04-21T00:00:00.000Z',
          end_date: '2026-04-23T00:00:00.000Z',
          guest_count: 2,
          total_price: 13000,
          status: 'APPROVED',
          created_at: '2026-04-14T09:13:52.057Z',
          updated_at: '2026-04-14T10:45:00.000Z',
          room: {
            id: 4,
            name: 'Suite Room 401',
            description: 'Luxury suite with living area and sea view',
            capacity: 3,
            price_per_night: 6500,
            image_url: '/images/room401.jpg',
            is_active: true,
            created_at: '2026-04-14T08:29:37.000Z',
            updated_at: '2026-04-14T08:29:37.000Z',
          },
          user: {
            id: 2,
            username: 'john_doe',
            role: 'user',
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiResponse({ status: 429, description: 'Too Many Requests' })
  async adminUpdate(
    @Param('id', ParseIntPipe) id: string,
    @Body() adminUpdateBookingDto: AdminUpdateBookingDto,
    @Req() req,
  ) {
    const booking = await this.bookingsService.adminUpdate(
      +id,
      adminUpdateBookingDto,
      req.user,
    );

    return {
      success: true,
      data: booking,
    };
  }

  @Delete(':id')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.USER)
  @ApiOperation({ summary: 'Delete a booking' })
  @ApiParam({ name: 'id', description: 'Booking ID', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Admin can delete any booking, user can delete only their own booking',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 3 },
            user_id: { type: 'number', example: 2 },
            room_id: { type: 'number', example: 4 },
            start_date: {
              type: 'string',
              format: 'date-time',
              example: '2026-04-21T00:00:00.000Z',
            },
            end_date: {
              type: 'string',
              format: 'date-time',
              example: '2026-04-23T00:00:00.000Z',
            },
            guest_count: { type: 'number', example: 2 },
            total_price: { type: 'number', example: 13000 },
            status: { type: 'string', example: 'PENDING' },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-04-14T09:13:52.057Z',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-04-14T10:20:00.000Z',
            },
            room: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 4 },
                name: { type: 'string', example: 'Suite Room 401' },
                description: {
                  type: 'string',
                  example: 'Luxury suite with living area and sea view',
                },
                capacity: { type: 'number', example: 3 },
                price_per_night: { type: 'number', example: 6500 },
                image_url: { type: 'string', example: '/images/room401.jpg' },
                is_active: { type: 'boolean', example: true },
                created_at: {
                  type: 'string',
                  format: 'date-time',
                  example: '2026-04-14T08:29:37.000Z',
                },
                updated_at: {
                  type: 'string',
                  format: 'date-time',
                  example: '2026-04-14T08:29:37.000Z',
                },
              },
            },
            user: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 2 },
                username: { type: 'string', example: 'john_doe' },
                role: { type: 'string', example: 'user' },
              },
            },
          },
        },
      },
      example: {
        success: true,
        data: {
          id: 3,
          user_id: 2,
          room_id: 4,
          start_date: '2026-04-21T00:00:00.000Z',
          end_date: '2026-04-23T00:00:00.000Z',
          guest_count: 2,
          total_price: 13000,
          status: 'PENDING',
          created_at: '2026-04-14T09:13:52.057Z',
          updated_at: '2026-04-14T10:20:00.000Z',
          room: {
            id: 4,
            name: 'Suite Room 401',
            description: 'Luxury suite with living area and sea view',
            capacity: 3,
            price_per_night: 6500,
            image_url: '/images/room401.jpg',
            is_active: true,
            created_at: '2026-04-14T08:29:37.000Z',
            updated_at: '2026-04-14T08:29:37.000Z',
          },
          user: {
            id: 2,
            username: 'john_doe',
            role: 'user',
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Booking not found or access denied' })
  @ApiResponse({ status: 429, description: 'Too Many Requests' })
  async remove(@Param('id', ParseIntPipe) id: string, @Req() req) {
    const booking = await this.bookingsService.remove(+id, req.user);

    return {
      success: true,
      data: booking,
    };
  }
}