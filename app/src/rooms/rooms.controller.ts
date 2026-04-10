import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Put,
  Param,
  Query,
  Delete,
  ParseIntPipe,
  UseGuards,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/roles.enum';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';

@ApiTags('rooms')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new room' })
  @ApiResponse({
    status: 201,
    description: 'Room created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'Ocean View Suite' },
            description: { type: 'string', example: 'A comfortable ocean-facing room.' },
            capacity: { type: 'number', example: 4 },
            price_per_night: { type: 'number', example: 149.99 },
            image_url: { type: 'string', example: 'images/room111.jpg' },
            is_active: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time', example: '2026-03-21T10:00:00Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2026-03-21T10:00:00Z' },
          },
        },
      },
      example: {
        success: true,
        data: {
          id: 1,
          name: 'Ocean View Suite',
          description: 'A comfortable ocean-facing room.',
          capacity: 4,
          price_per_night: 149.99,
          image_url: 'images/room111.jpg',
          is_active: true,
          createdAt: '2026-03-21T10:00:00Z',
          updatedAt: '2026-03-21T10:00:00Z',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 429, description: 'Too Many Requests' })
  create(@Body() createRoomDto: CreateRoomDto) {
    return this.roomsService.create(createRoomDto);
  }

  @UseInterceptors(CacheInterceptor)
  @CacheTTL(1000 * 60 * 5)
  @Get()
  @ApiOperation({ summary: 'Retrieve all rooms' })
  @ApiResponse({
    status: 200,
    description: 'List of all rooms',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              name: { type: 'string', example: 'Ocean View Suite' },
              description: { type: 'string', example: 'A comfortable ocean-facing room.' },
              capacity: { type: 'number', example: 4 },
              price_per_night: { type: 'number', example: 149.99 },
              image_url: { type: 'string', example: 'https://example.com/room1.jpg' },
              is_active: { type: 'boolean', example: true },
              createdAt: { type: 'string', format: 'date-time', example: '2026-03-21T10:00:00Z' },
              updatedAt: { type: 'string', format: 'date-time', example: '2026-03-21T10:00:00Z' },
            },
          },
        },
      },
      example: {
        success: true,
        data: [
          {
            id: 1,
            name: 'Ocean View Suite',
            description: 'A comfortable ocean-facing room.',
            capacity: 4,
            price_per_night: 149.99,
            image_url: 'https://example.com/room1.jpg',
            is_active: true,
            createdAt: '2026-03-21T10:00:00Z',
            updatedAt: '2026-03-21T10:00:00Z',
          },
          {
            id: 2,
            name: 'City Center Studio',
            description: 'Central location with modern amenities.',
            capacity: 2,
            price_per_night: 99.99,
            image_url: 'https://example.com/room2.jpg',
            is_active: true,
            createdAt: '2026-03-21T10:10:00Z',
            updatedAt: '2026-03-21T10:10:00Z',
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 429, description: 'Too Many Requests' })
  findAll(@Req() req) {
    console.log('caching na');
    return this.roomsService.findAll();
  }

  @UseInterceptors(CacheInterceptor)
  @Get('search')
  @ApiOperation({ summary: 'Search and filter rooms' })
  @ApiQuery({
    name: 'keyword',
    required: false,
    type: String,
    description: 'Search by room name or description',
    example: 'ocean',
  })
  @ApiQuery({
    name: 'is_active',
    required: false,
    type: Boolean,
    description: 'Filter rooms by active status',
    example: true,
  })
  @ApiQuery({
    name: 'min_capacity',
    required: false,
    type: Number,
    description: 'Minimum room capacity',
    example: 2,
  })
  @ApiQuery({
    name: 'max_price',
    required: false,
    type: Number,
    description: 'Maximum price per night',
    example: 200,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of rooms to return',
    example: 10,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of rooms to skip for pagination',
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: 'Filtered list of rooms',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              name: { type: 'string', example: 'Ocean View Suite' },
              description: { type: 'string', example: 'A comfortable ocean-facing room.' },
              capacity: { type: 'number', example: 4 },
              price_per_night: { type: 'number', example: 149.99 },
              image_url: { type: 'string', example: 'https://example.com/room1.jpg' },
              is_active: { type: 'boolean', example: true },
              createdAt: { type: 'string', format: 'date-time', example: '2026-03-21T10:00:00Z' },
              updatedAt: { type: 'string', format: 'date-time', example: '2026-03-21T10:00:00Z' },
            },
          },
        },
      },
      example: {
        success: true,
        data: [
          {
            id: 1,
            name: 'Ocean View Suite',
            description: 'A comfortable ocean-facing room.',
            capacity: 4,
            price_per_night: 149.99,
            image_url: 'https://example.com/room1.jpg',
            is_active: true,
            createdAt: '2026-03-21T10:00:00Z',
            updatedAt: '2026-03-21T10:00:00Z',
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 429, description: 'Too Many Requests' })
  searchRooms(
    @Query('keyword') keyword?: string,
    @Query('is_active') is_active?: string,
    @Query('min_capacity') min_capacity?: string,
    @Query('max_price') max_price?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.roomsService.searchRooms({
      keyword,
      is_active,
      min_capacity,
      max_price,
      limit,
      offset,
    });
  }

  // @UseInterceptors(CacheInterceptor)
  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a specific room by ID' })
  @ApiParam({ name: 'id', description: 'Room ID', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Room details',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'Ocean View Suite' },
            description: { type: 'string', example: 'A comfortable ocean-facing room.' },
            capacity: { type: 'number', example: 4 },
            price_per_night: { type: 'number', example: 149.99 },
            image_url: { type: 'string', example: 'https://example.com/room1.jpg' },
            is_active: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time', example: '2026-03-21T10:00:00Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2026-03-21T10:00:00Z' },
          },
        },
      },
      example: {
        success: true,
        data: {
          id: 1,
          name: 'Ocean View Suite',
          description: 'A comfortable ocean-facing room.',
          capacity: 4,
          price_per_night: 149.99,
          image_url: 'https://example.com/room1.jpg',
          is_active: true,
          createdAt: '2026-03-21T10:00:00Z',
          updatedAt: '2026-03-21T10:00:00Z',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Room not found' })
  @ApiResponse({ status: 429, description: 'Too Many Requests' })
  findOne(@Param('id', ParseIntPipe) id: string) {
    return this.roomsService.findOne(+id);
  }

  @Patch(':id/disable')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Disable a room' })
  @ApiParam({ name: 'id', description: 'Room ID', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Room disabled successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'Ocean View Suite' },
            description: { type: 'string', example: 'A comfortable ocean-facing room.' },
            capacity: { type: 'number', example: 4 },
            price_per_night: { type: 'number', example: 149.99 },
            image_url: { type: 'string', example: 'https://example.com/room1.jpg' },
            is_active: { type: 'boolean', example: false },
            createdAt: { type: 'string', format: 'date-time', example: '2026-03-21T10:00:00Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2026-03-21T10:20:00Z' },
          },
        },
      },
      example: {
        success: true,
        data: {
          id: 1,
          name: 'Ocean View Suite',
          description: 'A comfortable ocean-facing room.',
          capacity: 4,
          price_per_night: 149.99,
          image_url: 'https://example.com/room1.jpg',
          is_active: false,
          createdAt: '2026-03-21T10:00:00Z',
          updatedAt: '2026-03-21T10:20:00Z',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  @ApiResponse({ status: 429, description: 'Too Many Requests' })
  disable(@Param('id', ParseIntPipe) id: string) {
    return this.roomsService.disable(+id);
  }

  @Patch(':id/enable')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Enable a room' })
  @ApiParam({ name: 'id', description: 'Room ID', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Room enabled successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'Ocean View Suite' },
            description: { type: 'string', example: 'A comfortable ocean-facing room.' },
            capacity: { type: 'number', example: 4 },
            price_per_night: { type: 'number', example: 149.99 },
            image_url: { type: 'string', example: 'https://example.com/room1.jpg' },
            is_active: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time', example: '2026-03-21T10:00:00Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2026-03-21T10:25:00Z' },
          },
        },
      },
      example: {
        success: true,
        data: {
          id: 1,
          name: 'Ocean View Suite',
          description: 'A comfortable ocean-facing room.',
          capacity: 4,
          price_per_night: 149.99,
          image_url: 'https://example.com/room1.jpg',
          is_active: true,
          createdAt: '2026-03-21T10:00:00Z',
          updatedAt: '2026-03-21T10:25:00Z',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  @ApiResponse({ status: 429, description: 'Too Many Requests' })
  enable(@Param('id', ParseIntPipe) id: string) {
    return this.roomsService.enable(+id);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a room' })
  @ApiParam({ name: 'id', description: 'Room ID', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Room updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'Updated Ocean View Suite' },
            description: { type: 'string', example: 'Updated room description.' },
            capacity: { type: 'number', example: 5 },
            price_per_night: { type: 'number', example: 179.99 },
            image_url: { type: 'string', example: 'https://example.com/updated-room1.jpg' },
            is_active: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time', example: '2026-03-21T10:00:00Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2026-03-21T11:00:00Z' },
          },
        },
      },
      example: {
        success: true,
        data: {
          id: 1,
          name: 'Updated Ocean View Suite',
          description: 'Updated room description.',
          capacity: 5,
          price_per_night: 179.99,
          image_url: 'https://example.com/updated-room1.jpg',
          is_active: true,
          createdAt: '2026-03-21T10:00:00Z',
          updatedAt: '2026-03-21T11:00:00Z',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  @ApiResponse({ status: 429, description: 'Too Many Requests' })
  update(
    @Param('id', ParseIntPipe) id: string,
    @Body() updateRoomDto: UpdateRoomDto,
  ) {
    return this.roomsService.update(+id, updateRoomDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a room' })
  @ApiParam({ name: 'id', description: 'Room ID', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Room deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
      },
      example: {
        success: true,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  @ApiResponse({ status: 429, description: 'Too Many Requests' })
  remove(@Param('id', ParseIntPipe) id: string) {
    return this.roomsService.remove(+id);
  }
}