import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { TokenBlacklistService } from '../security/token-blacklist.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private tokenBlacklistService: TokenBlacklistService,
  ) {}

  async register(registerDto: RegisterDto) {
    return this.usersService.createUser(registerDto);
  }

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findUserByUsername(username);
    if (user && (await bcrypt.compare(pass, user.password_hash))) {
      const { password_hash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.username, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const payload = { id: user.id, username: user.username, role: user.role };

    // Access token: 1 hour expiration
    const access_token = this.jwtService.sign(payload, { expiresIn: '1h' });

    return {
      access_token,
      expiresIn: 3600, // 1 hour in seconds
    };
  }

  /**
   * Logout by blacklisting the access token
   * @param accessToken The access token to invalidate
   */
  async logout(accessToken: string): Promise<void> {
    // Blacklist the access token (1 hour TTL)
    await this.tokenBlacklistService.addToBlacklist(accessToken, 3600);
  }
}

