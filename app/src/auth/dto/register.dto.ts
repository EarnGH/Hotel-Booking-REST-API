import {
  IsNotEmpty,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../enums/roles.enum';

export class RegisterDto {
  @ApiProperty({
    example: 'john_doe',
    description: 'Username of the user',
  })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    example: 'password123',
    description: 'Password (minimum 6 characters)',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({
    enum: Role,
    example: Role.USER, // or 'user' depending on enum
    description: 'Role of the user (optional)',
  })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}