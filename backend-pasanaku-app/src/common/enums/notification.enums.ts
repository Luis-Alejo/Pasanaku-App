import { registerEnumType } from '@nestjs/graphql';

export enum NotificationType {
  PAYMENT_REMINDER = 'PAYMENT_REMINDER',
  GRACE_WARNING = 'GRACE_WARNING',
  DEFAULT_ALERT = 'DEFAULT_ALERT',
  PAYOUT_RECEIVED = 'PAYOUT_RECEIVED',
  REFERENCE_REQUEST = 'REFERENCE_REQUEST',
}

registerEnumType(NotificationType, { name: 'NotificationType' });
