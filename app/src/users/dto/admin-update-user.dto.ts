import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { UpdateUserDto } from './update-user.dto';
import { Role } from '../../auth/enums/roles.enum';

export class AdminUpdateUserDto extends UpdateUserDto {
  @ApiPropertyOptional({
    enum: Role,
    example: Role.ADMIN,
    description: 'User role',
  })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}