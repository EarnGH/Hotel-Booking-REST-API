import {
  IsNotEmpty,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
  IsEmail,
  MaxLength,
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
    example: 'john@example.com',
    description: 'Email address of the user',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Full name of the user',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  full_name: string;

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
    example: Role.USER,
    description: 'Role of the user (optional)',
  })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}