// import { PartialType } from '@nestjs/mapped-types';
import { CreateRoomDto } from './create-room.dto';
import { PartialType } from '@nestjs/swagger';

export class UpdateRoomDto extends PartialType(CreateRoomDto) {}
