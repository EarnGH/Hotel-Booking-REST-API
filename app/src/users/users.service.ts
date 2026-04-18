import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from '../auth/dto/register.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '../auth/enums/roles.enum';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}
  private readonly logger = new Logger(UsersService.name);

  private format_user(user: any) {
    if (!user) return user;

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }

  private format_users(users: any[]) {
    return users.map((user) => this.format_user(user));
  }

  async createUser(registerDto: RegisterDto) {
    const { username, email, full_name, password } = registerDto;

    const existingUser = await this.prisma.users.findUnique({
      where: { username },
    });

    if (existingUser) {
      throw new ConflictException('User with this username already exists');
    }

    const existingEmail = await this.prisma.users.findUnique({
      where: { email },
    });

    if (existingEmail) {
      throw new ConflictException('User with this email already exists');
    }

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = await this.prisma.users.create({
      data: {
        username,
        email,
        full_name,
        password_hash: hashedPassword,
        role: 'user',
      },
    });

    return {
      message: 'User registered successfully',
      user: this.format_user(user),
    };
  }

  async findUserByUsername(username: string) {
    return this.prisma.users.findUnique({
      where: { username },
    });
  }

  async findAll() {
    this.logger.log('Fetching all users');

    const users = await this.prisma.users.findMany({
      orderBy: {
        created_at: 'asc',
      },
    });

    return this.format_users(users);
  }

  async findMe(current_user: any) {
    this.logger.log(`Fetching current user id=${current_user.id}`);

    const user = await this.prisma.users.findUnique({
      where: { id: current_user.id },
    });

    if (!user) {
      throw new NotFoundException(`User ${current_user.id} not found`);
    }

    return this.format_user(user);
  }

  async findOne(id: number) {
    this.logger.log(`Fetching user id=${id}`);

    const user = await this.prisma.users.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return this.format_user(user);
  }

  async updateMe(current_user: any, updateUserDto: UpdateUserDto) {
    this.logger.log(`Updating own profile user id=${current_user.id}`);

    await this.findOne(current_user.id);

    if (updateUserDto.username) {
      const existingUser = await this.prisma.users.findUnique({
        where: { username: updateUserDto.username },
      });

      if (existingUser && existingUser.id !== current_user.id) {
        throw new ConflictException('User with this username already exists');
      }
    }

    if (updateUserDto.email) {
      const existingEmail = await this.prisma.users.findUnique({
        where: { email: updateUserDto.email },
      });

      if (existingEmail && existingEmail.id !== current_user.id) {
        throw new ConflictException('User with this email already exists');
      }
    }

    const user = await this.prisma.users.update({
      where: { id: current_user.id },
      data: {
        ...updateUserDto,
      },
    });

    return this.format_user(user);
  }

  async adminUpdate(id: number, adminUpdateUserDto: AdminUpdateUserDto, current_user: any) {
    this.logger.log(`Admin id=${current_user.id} updating user id=${id}`);

    if (current_user.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admin can use this endpoint');
    }

    await this.findOne(id);

    if (adminUpdateUserDto.username) {
      const existingUser = await this.prisma.users.findUnique({
        where: { username: adminUpdateUserDto.username },
      });

      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('User with this username already exists');
      }
    }

    const user = await this.prisma.users.update({
      where: { id },
      data: {
        ...adminUpdateUserDto,
      },
    });

    return this.format_user(user);
  }

  async remove(id: number, current_user: any) {
    this.logger.log(`Admin id=${current_user.id} deleting user id=${id}`);

    if (current_user.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admin can use this endpoint');
    }

    if (current_user.id === id) {
      throw new ForbiddenException('Admin cannot delete their own account');
    }

    await this.findOne(id);

    const user = await this.prisma.users.delete({
      where: { id },
    });

    return this.format_user(user);
  }
}