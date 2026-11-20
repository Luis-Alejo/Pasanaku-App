import { BadRequestException, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Args, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { NotificationItemType } from './dto/notification.types.js';
import { NotificationsService } from './notifications.service.js';

@Resolver()
@UseGuards(JwtAuthGuard)
export class NotificationsResolver {
  constructor(private readonly notifications: NotificationsService) {}

  @Query(() => [NotificationItemType])
  myNotifications(
    @CurrentUser('id') userId: string,
    @Args('unreadOnly', { type: () => Boolean, defaultValue: false })
    unreadOnly: boolean,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
    @Args('offset', { type: () => Int, defaultValue: 0 }) offset: number,
  ) {
    return this.notifications.myNotifications(
      userId,
      unreadOnly,
      limit,
      offset,
    );
  }

  @Query(() => Int)
  unreadNotificationsCount(@CurrentUser('id') userId: string) {
    return this.notifications.unreadNotificationsCount(userId);
  }

  @Mutation(() => NotificationItemType)
  markNotificationAsRead(
    @CurrentUser('id') userId: string,
    @Args(
      'notificationId',
      { type: () => ID },
      new ParseUUIDPipe({
        exceptionFactory: () =>
          new BadRequestException('Identificador inválido.'),
      }),
    )
    notificationId: string,
  ) {
    return this.notifications.markAsRead(userId, notificationId);
  }

  /** Devuelve cuántas se marcaron. */
  @Mutation(() => Int)
  markAllNotificationsAsRead(@CurrentUser('id') userId: string) {
    return this.notifications.markAllAsRead(userId);
  }
}
