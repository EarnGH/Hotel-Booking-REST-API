import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, IsNotEmpty } from 'class-validator';

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
}