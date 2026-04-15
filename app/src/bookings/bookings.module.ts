import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { PrismaService } from '../prisma/prisma.service';
import { SecurityModule } from '../security/security.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [SecurityModule, NotificationsModule],
  controllers: [BookingsController],
  providers: [BookingsService, PrismaService],
})
export class BookingsModule {}
