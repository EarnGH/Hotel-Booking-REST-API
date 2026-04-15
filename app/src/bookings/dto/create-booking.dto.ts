import {
  IsInt,
  IsNotEmpty,
  IsDateString,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateBookingDto {
  @ApiProperty({
    example: 2,
    description: 'ID of the room being booked',
  })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  room_id: number;

  @ApiProperty({
    example: '2026-04-20',
    description: 'Booking start date',
  })
  @IsDateString()
  @IsNotEmpty()
  start_date: string;

  @ApiProperty({
    example: '2026-04-22',
    description: 'Booking end date',
  })
  @IsDateString()
  @IsNotEmpty()
  end_date: string;

  @ApiProperty({
    example: 2,
    description: 'Number of guests',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  guest_count: number;
}