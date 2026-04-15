import { PartialType } from '@nestjs/swagger';
import { UpdateBookingDto } from './update-booking.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { BookingStatus } from '@prisma/client';

export class AdminUpdateBookingDto extends PartialType(UpdateBookingDto) {
  @ApiPropertyOptional({
    example: 1,
    description: 'ID of the user who owns this booking',
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  user_id?: number;

  @ApiPropertyOptional({
    enum: BookingStatus,
    example: BookingStatus.APPROVED,
    description: 'Booking status',
  })
  @IsEnum(BookingStatus)
  @IsOptional()
  status?: BookingStatus;
}