import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from '../auth/dto/register.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async createUser(registerDto: RegisterDto) {
    const { username, password, role } = registerDto;

    const existingUser = await this.prisma.users.findUnique({
      where: { username },
    });

    if (existingUser) {
      throw new ConflictException('User with this username already exists');
    }

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = await this.prisma.users.create({
      data: {
        username,
        password_hash: hashedPassword,
        role: role || 'user',
      },
    });

    return {
      message: 'User registered successfully',
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  }

  async findUserByUsername(username: string) {
    return this.prisma.users.findUnique({
      where: { username },
    });
  }
}
