import { Field, ID, ObjectType } from '@nestjs/graphql';
import { NotificationType } from '../../common/enums/index.js';

@ObjectType('AppNotification')
export class NotificationItemType {
  @Field(() => ID) id: string;
  @Field(() => NotificationType) type: NotificationType;
  @Field(() => ID, { nullable: true }) groupId: string | null;
  @Field(() => String) title: string;
  @Field(() => String) message: string;
  @Field(() => Boolean) isRead: boolean;
  @Field(() => Date) createdAt: Date;
}
