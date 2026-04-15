import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/roles.enum';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.USER)
  @ApiOperation({ summary: 'Retrieve notifications based on user role' })
  @ApiResponse({
    status: 200,
    description: 'Admin gets all notifications, user gets only their own notifications',
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
              user_id: { type: 'number', example: 2 },
              booking_id: { type: 'number', example: 5 },
              type: { type: 'string', example: 'BOOKING_CREATED' },
              message: {
                type: 'string',
                example: 'Booking #5 has been created successfully.',
              },
              created_at: {
                type: 'string',
                format: 'date-time',
                example: '2026-04-14T10:45:00.000Z',
              },
            },
          },
        },
      },
      example: {
        success: true,
        data: [
          {
            id: 1,
            user_id: 2,
            booking_id: 5,
            type: 'BOOKING_CREATED',
            message: 'Booking #5 has been created successfully.',
            created_at: '2026-04-14T10:45:00.000Z',
          },
          {
            id: 2,
            user_id: 2,
            booking_id: 5,
            type: 'BOOKING_DELETED',
            message: 'Booking #5 has been deleted.',
            created_at: '2026-04-15T08:20:00.000Z',
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 429, description: 'Too Many Requests' })
  async findAll(@Req() req) {
    const notifications = await this.notificationsService.findAll(req.user);

    return {
      success: true,
      data: notifications,
    };
  }
}