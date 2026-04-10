import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { RoomsModule } from './rooms/rooms.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { redisStore } from 'cache-manager-redis-yet';

@Module({
  imports: [
    PrismaModule,
    RoomsModule,
    AuthModule,
    UsersModule,

    // Configure CacheManager with Redis
    CacheModule.registerAsync({
      isGlobal: true, // Make cache module available globally
      useFactory: async () => ({
        store: await redisStore({
          socket: {
            host: process.env.REDIS_HOST || 'localhost',
            port: Number(process.env.REDIS_PORT) || 6379
          },
        }),
      }),
    }),
    // Configure Rate Limiting (Throttler)
    ThrottlerModule.forRoot([
      {
        ttl: 1000 * 60, // Time to live in milliseconds (1 minute)
        limit: 10000, // Max number of requests within TTL
      },
    ]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

/*
AI Declaration:
I used ChatGPT to help debug the test files.
I wrote all the other code, and I understand the entire implementation.

Reflection:
i understand how the test work, unit test, integration test, and the end to end test. 
understand the concept of using jest and how to mock things
*/
