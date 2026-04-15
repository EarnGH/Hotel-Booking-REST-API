import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  IsNumber,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateRoomDto {
  @ApiProperty({
    example: 'Ocean View Suite',
    description: 'Unique name of the room',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    example: 'A comfortable ocean-facing room.',
    description: 'Detailed description of the room',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 4,
    description: 'Maximum number of guests the room can accommodate',
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  capacity: number;

  @ApiProperty({
    example: 149.99,
    description: 'Price per night (in your system currency)',
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsNotEmpty()
  price_per_night: number;

  @ApiPropertyOptional({
    example: '/images/room111.jpg',
    description: 'Path or URL to the room image',
  })
  @IsString()
  @IsOptional()
  image_url?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the room is available for booking (default: true)',
    default: true,
  })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}