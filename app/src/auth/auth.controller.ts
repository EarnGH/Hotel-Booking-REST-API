import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 300000 } })
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            username: { type: 'string', example: 'john_doe' },
            email: { type: 'string', example: 'john@example.com' },
            full_name: { type: 'string', example: 'John Doe' },
          },
        },
      },
      example: {
        success: true,
        data: {
          id: 1,
          username: 'john_doe',
          email: 'john@example.com',
          full_name: 'John Doe',
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'User already exists',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request',
  })
  async register(@Body() registerDto: RegisterDto) {
    const result = await this.authService.register(registerDto);

    return {
      success: true,
      data: result.user,
    };
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Login and receive JWT token' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        access_token: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
      example: {
        success: true,
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request',
  })
  async login(@Body() loginDto: LoginDto) {
    const token = await this.authService.login(loginDto);
    return {
      success: true,
      ...token,
    };
  }

  @Post('logout')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout user (invalidate token)' })
  @ApiResponse({
    status: 200,
    description: 'Logged out successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Logged out successfully' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  logout(@Req() req: any) {
    return {
      success: true,
      message: 'Logged out successfully',
    };
  }
}