import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '../auth/enums/roles.enum';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  const mockPrismaService = {
    users: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockUser = {
    id: 1,
    username: 'john_doe',
    email: 'john@example.com',
    full_name: 'John Doe',
    password_hash: 'hashed_password',
    role: 'user',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockAdmin = {
    id: 2,
    username: 'admin_user',
    email: 'admin@example.com',
    full_name: 'Admin User',
    password_hash: 'hashed_password',
    role: 'admin',
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a user successfully', async () => {
      const registerDto = {
        username: 'newuser',
        email: 'newuser@example.com',
        full_name: 'New User',
        password: 'password123',
      };

      mockPrismaService.users.findUnique.mockResolvedValueOnce(null);
      mockPrismaService.users.findUnique.mockResolvedValueOnce(null);
      mockPrismaService.users.create.mockResolvedValueOnce({
        ...mockUser,
        username: registerDto.username,
        email: registerDto.email,
        full_name: registerDto.full_name,
      });

      const result = await service.createUser(registerDto as any);

      expect(result.user.username).toBe(registerDto.username);
      expect(result.user.email).toBe(registerDto.email);
      expect(result.user.full_name).toBe(registerDto.full_name);
      expect(result.message).toBe('User registered successfully');
      expect(prisma.users.findUnique).toHaveBeenCalledTimes(2);
      expect(prisma.users.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if username already exists', async () => {
      const registerDto = {
        username: 'john_doe',
        email: 'newuser@example.com',
        full_name: 'New User',
        password: 'password123',
      };

      mockPrismaService.users.findUnique.mockResolvedValueOnce(mockUser);

      await expect(service.createUser(registerDto as any)).rejects.toThrow(
        ConflictException,
      );
      expect(
        mockPrismaService.users.findUnique,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ where: { username: registerDto.username } }),
      );
    });

    it('should throw ConflictException if email already exists', async () => {
      const registerDto = {
        username: 'different_user',
        email: 'john@example.com',
        full_name: 'New User',
        password: 'password123',
      };

      mockPrismaService.users.findUnique.mockResolvedValueOnce(null);
      mockPrismaService.users.findUnique.mockResolvedValueOnce(mockUser);

      await expect(service.createUser(registerDto as any)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findUserByUsername', () => {
    it('should find a user by username', async () => {
      mockPrismaService.users.findUnique.mockResolvedValueOnce(mockUser);

      const result = await service.findUserByUsername('john_doe');

      expect(result).toEqual(mockUser);
      expect(prisma.users.findUnique).toHaveBeenCalledWith({
        where: { username: 'john_doe' },
      });
    });

    it('should return null if user not found', async () => {
      mockPrismaService.users.findUnique.mockResolvedValueOnce(null);

      const result = await service.findUserByUsername('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      mockPrismaService.users.findMany.mockResolvedValueOnce([
        mockUser,
        mockAdmin,
      ]);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].username).toBe('john_doe');
      expect(result[1].username).toBe('admin_user');
      expect(prisma.users.findMany).toHaveBeenCalled();
    });

    it('should not include password_hash in results', async () => {
      mockPrismaService.users.findMany.mockResolvedValueOnce([mockUser]);

      const result = await service.findAll();

      expect(result[0]).not.toHaveProperty('password_hash');
      expect(result[0]).toHaveProperty('email');
      expect(result[0]).toHaveProperty('full_name');
    });
  });

  describe('findMe', () => {
    it('should return current user profile', async () => {
      mockPrismaService.users.findUnique.mockResolvedValueOnce(mockUser);

      const result = await service.findMe({ id: 1 });

      expect(result.id).toBe(1);
      expect(result.username).toBe('john_doe');
      expect(result.email).toBe('john@example.com');
      expect(result.full_name).toBe('John Doe');
      expect(result).not.toHaveProperty('password_hash');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.users.findUnique.mockResolvedValueOnce(null);

      await expect(service.findMe({ id: 999 })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOne', () => {
    it('should return user by ID', async () => {
      mockPrismaService.users.findUnique.mockResolvedValueOnce(mockUser);

      const result = await service.findOne(1);

      expect(result.id).toBe(1);
      expect(result.username).toBe('john_doe');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.users.findUnique.mockResolvedValueOnce(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateMe', () => {
    it('should update current user profile', async () => {
      const updateDto = {
        username: 'john_doe_new',
        email: 'john.new@example.com',
        full_name: 'John Doe Updated',
      };

      mockPrismaService.users.findUnique.mockResolvedValueOnce(mockUser);
      mockPrismaService.users.findUnique.mockResolvedValueOnce(null);
      mockPrismaService.users.findUnique.mockResolvedValueOnce(null);
      mockPrismaService.users.update.mockResolvedValueOnce({
        ...mockUser,
        ...updateDto,
      });

      const result = await service.updateMe({ id: 1 }, updateDto);

      expect(result.username).toBe('john_doe_new');
      expect(result.email).toBe('john.new@example.com');
      expect(result.full_name).toBe('John Doe Updated');
    });

    it('should throw ConflictException if new username already taken', async () => {
      const updateDto = {
        username: 'admin_user',
      };

      mockPrismaService.users.findUnique.mockResolvedValueOnce(mockUser);
      mockPrismaService.users.findUnique.mockResolvedValueOnce(mockAdmin);

      await expect(service.updateMe({ id: 1 }, updateDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException if new email already taken', async () => {
      const updateDto = {
        email: 'admin@example.com',
      };

      mockPrismaService.users.findUnique
        .mockResolvedValueOnce(mockUser) // findOne check
        .mockResolvedValueOnce(mockAdmin); // email uniqueness check

      await expect(service.updateMe({ id: 1 }, updateDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should allow updating only email', async () => {
      const updateDto = {
        email: 'newemail@example.com',
      };

      mockPrismaService.users.findUnique
        .mockResolvedValueOnce(mockUser) // findOne check
        .mockResolvedValueOnce(null); // email uniqueness check
      mockPrismaService.users.update.mockResolvedValueOnce({
        ...mockUser,
        email: updateDto.email,
      });

      const result = await service.updateMe({ id: 1 }, updateDto);

      expect(result.email).toBe('newemail@example.com');
      expect(result.username).toBe('john_doe');
    });
  });

  describe('adminUpdate', () => {
    it('should allow admin to update another user', async () => {
      const updateDto = {
        username: 'updated_user',
        role: 'admin',
      };

      mockPrismaService.users.findUnique
        .mockResolvedValueOnce(mockUser) // findOne check
        .mockResolvedValueOnce(null); // username uniqueness check
      mockPrismaService.users.update.mockResolvedValueOnce({
        ...mockUser,
        ...updateDto,
      });

      const result = await service.adminUpdate(1, updateDto, mockAdmin);

      expect(result.username).toBe('updated_user');
      expect(result.role).toBe('admin');
    });

    it('should throw ForbiddenException if caller is not admin', async () => {
      const updateDto = { username: 'new_name' };

      await expect(
        service.adminUpdate(1, updateDto, mockUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should delete a user', async () => {
      mockPrismaService.users.findUnique.mockResolvedValueOnce(mockUser);
      mockPrismaService.users.delete.mockResolvedValueOnce(mockUser);

      const result = await service.remove(1, mockAdmin);

      expect(result.id).toBe(1);
      expect(prisma.users.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw ForbiddenException if not admin', async () => {
      await expect(service.remove(1, mockUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException if admin tries to delete themselves', async () => {
      await expect(service.remove(2, mockAdmin)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.users.findUnique.mockResolvedValueOnce(null);

      await expect(service.remove(999, mockAdmin)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
