import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, IsNotEmpty, IsEmail } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({
    example: 'john_doe_new',
    description: 'New username',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @MaxLength(100)
  username?: string;

  @ApiPropertyOptional({
    example: 'john.new@example.com',
    description: 'New email address',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    example: 'John Doe Updated',
    description: 'New full name',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @MaxLength(255)
  full_name?: string;
}