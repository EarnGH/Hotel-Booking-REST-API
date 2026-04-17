import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CacheModule } from '@nestjs/cache-manager';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TokenBlacklistService } from './token-blacklist.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
    CacheModule.register(),
  ],
  providers: [JwtAuthGuard, RolesGuard, TokenBlacklistService],
  exports: [JwtModule, JwtAuthGuard, RolesGuard, TokenBlacklistService],
})
export class SecurityModule {}