import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Check system health status' })
  @ApiResponse({
    status: 200,
    description: 'System is healthy',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'ok' },
            database: { type: 'string', example: 'connected' },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2026-04-14T10:50:00.000Z',
            },
          },
        },
      },
      example: {
        success: true,
        data: {
          status: 'ok',
          database: 'connected',
          timestamp: '2026-04-14T10:50:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'System is unhealthy',
  })
  async getHealth() {
    await this.prisma.$queryRaw`SELECT 1`;

    return {
      success: true,
      data: {
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
      },
    };
  }
}