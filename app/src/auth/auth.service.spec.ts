import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { TokenBlacklistService } from '../security/token-blacklist.service';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;
  let tokenBlacklistService: TokenBlacklistService;

  const mockUser = {
    id: 1,
    username: 'john_doe',
    email: 'john@example.com',
    full_name: 'John Doe',
    password_hash: 'hashed_password_123',
    role: 'user',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockUsersService = {
    createUser: jest.fn(),
    findUserByUsername: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const mockTokenBlacklistService = {
    addToBlacklist: jest.fn(),
    isBlacklisted: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: TokenBlacklistService, useValue: mockTokenBlacklistService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    tokenBlacklistService = module.get<TokenBlacklistService>(TokenBlacklistService);

    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const registerDto = {
        username: 'newuser',
        email: 'newuser@example.com',
        full_name: 'New User',
        password: 'password123',
      };

      const registeredUser = {
        message: 'User registered successfully',
        user: {
          id: 2,
          username: registerDto.username,
          email: registerDto.email,
          full_name: registerDto.full_name,
          role: 'user',
          created_at: new Date(),
          updated_at: new Date(),
        },
      };

      mockUsersService.createUser.mockResolvedValueOnce(registeredUser);

      const result = await service.register(registerDto as any);

      expect(result.user.username).toBe('newuser');
      expect(result.message).toBe('User registered successfully');
      expect(usersService.createUser).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('validateUser', () => {
    it('should validate user with correct password', async () => {
      mockUsersService.findUserByUsername.mockResolvedValueOnce(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

      const result = await service.validateUser('john_doe', 'correct_password');

      expect(result.id).toBe(1);
      expect(result.username).toBe('john_doe');
      expect(result).not.toHaveProperty('password_hash');
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'correct_password',
        mockUser.password_hash,
      );
    });

    it('should return null with incorrect password', async () => {
      mockUsersService.findUserByUsername.mockResolvedValueOnce(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      const result = await service.validateUser(
        'john_doe',
        'incorrect_password',
      );

      expect(result).toBeNull();
    });

    it('should return null if user not found', async () => {
      mockUsersService.findUserByUsername.mockResolvedValueOnce(null);

      const result = await service.validateUser(
        'nonexistent',
        'any_password',
      );

      expect(result).toBeNull();
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should return access token on successful login', async () => {
      const loginDto = {
        username: 'john_doe',
        password: 'correct_password',
      };

      mockUsersService.findUserByUsername.mockResolvedValueOnce(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
      mockJwtService.sign.mockReturnValueOnce('test_jwt_token');

      const result = await service.login(loginDto);

      expect(result.access_token).toBe('test_jwt_token');
      expect(result.expiresIn).toBe(3600);
      expect(jwtService.sign).toHaveBeenCalledWith(
        {
          id: mockUser.id,
          username: mockUser.username,
          role: mockUser.role,
        },
        { expiresIn: '1h' },
      );
    });

    it('should throw UnauthorizedException with invalid credentials', async () => {
      const loginDto = {
        username: 'john_doe',
        password: 'wrong_password',
      };

      mockUsersService.findUserByUsername.mockResolvedValueOnce(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const loginDto = {
        username: 'nonexistent',
        password: 'any_password',
      };

      mockUsersService.findUserByUsername.mockResolvedValueOnce(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should include user role in JWT payload', async () => {
      const loginDto = {
        username: 'john_doe',
        password: 'correct_password',
      };

      const adminUser = { ...mockUser, role: 'admin' };
      mockUsersService.findUserByUsername.mockResolvedValueOnce(adminUser);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
      mockJwtService.sign.mockReturnValueOnce('admin_jwt_token');

      await service.login(loginDto);

      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'admin',
        }),
        { expiresIn: '1h' },
      );
    });
  });

  describe('logout', () => {
    it('should blacklist access token on logout', async () => {
      const accessToken = 'access_token_to_revoke';

      mockTokenBlacklistService.addToBlacklist.mockResolvedValueOnce(undefined);

      await service.logout(accessToken);

      expect(tokenBlacklistService.addToBlacklist).toHaveBeenCalledWith(
        accessToken,
        3600,
      );
    });
  });
});
