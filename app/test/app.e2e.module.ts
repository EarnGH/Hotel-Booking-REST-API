import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { PrismaModule } from '../src/prisma/prisma.module';
import { RoomsModule } from '../src/rooms/rooms.module';
import { AuthModule } from '../src/auth/auth.module';
import { UsersModule } from '../src/users/users.module';
import { BookingsModule } from '../src/bookings/bookings.module';
import { NotificationsModule } from '../src/notifications/notifications.module';
import { HealthModule } from '../src/health/health.module';

@Module({
  imports: [
    PrismaModule,
    RoomsModule,
    AuthModule,
    UsersModule,
    BookingsModule,
    NotificationsModule,
    HealthModule,

    CacheModule.register({
      isGlobal: true,
      ttl: 10_000,
    }),

    ThrottlerModule.forRoot([
      {
        ttl: 1000 * 60,
        limit: 10000,
      },
    ]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppE2eModule {}