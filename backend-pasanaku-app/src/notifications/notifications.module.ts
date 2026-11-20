import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationEventsListener } from './notification-events.listener.js';
import { Notification } from './entities/notification.entity.js';
import { NotificationsResolver } from './notifications.resolver.js';
import { NotificationsService } from './notifications.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Notification])],
  providers: [
    NotificationsService,
    NotificationsResolver,
    NotificationEventsListener,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
