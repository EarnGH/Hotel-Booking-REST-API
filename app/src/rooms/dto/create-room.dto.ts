import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  IsNumber,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateRoomDto {
  @ApiProperty({
    example: 'Standard Room 101',
    description: 'Name of the room',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    example: 'Standard room with garden view',
    description: 'Description of the room',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 2,
    description: 'Capacity of the room',
  })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  capacity: number;

  @ApiProperty({
    example: 1800,
    description: 'Price per night',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  price_per_night: number;

  @ApiPropertyOptional({
    example: '/images/room201.jpg',
    description: 'URL of the room image',
  })
  @IsString()
  @IsOptional()
  image_url?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the room is active',
  })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}