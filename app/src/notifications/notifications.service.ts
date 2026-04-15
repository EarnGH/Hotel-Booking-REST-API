import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../auth/enums/roles.enum';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}
  private readonly logger = new Logger(NotificationsService.name);

  private format_notification(notification: any) {
    if (!notification) return notification;

    return {
      ...notification,
    };
  }

  private format_notifications(notifications: any[]) {
    return notifications.map((notification) => this.format_notification(notification));
  }

  async findAll(current_user: any) {
    this.logger.log(
      `Fetching notifications for user id=${current_user.id}, role=${current_user.role}`,
    );

    const notifications = await this.prisma.notifications.findMany({
      where: current_user.role === Role.ADMIN ? {} : { user_id: current_user.id },
      orderBy: {
        created_at: 'desc',
      },
    });

    return this.format_notifications(notifications);
  }

  async createNotification(data: {
    user_id: number;
    booking_id?: number;
    type: string;
    message: string;
  }) {
    const notification = await this.prisma.notifications.create({
      data: {
        user_id: data.user_id,
        booking_id: data.booking_id,
        type: data.type,
        message: data.message,
      },
    });

    return this.format_notification(notification);
  }
}