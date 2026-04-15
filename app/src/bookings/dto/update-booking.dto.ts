import {
  IsInt,
  IsOptional,
  IsDateString,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateBookingDto {
  @ApiPropertyOptional({
    example: 2,
    description: 'ID of the room being booked',
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  room_id?: number;

  @ApiPropertyOptional({
    example: '2026-04-20',
    description: 'Booking start date',
  })
  @IsDateString()
  @IsOptional()
  start_date?: string;

  @ApiPropertyOptional({
    example: '2026-04-22',
    description: 'Booking end date',
  })
  @IsDateString()
  @IsOptional()
  end_date?: string;

  @ApiPropertyOptional({
    example: 2,
    description: 'Number of guests',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  guest_count?: number;
}