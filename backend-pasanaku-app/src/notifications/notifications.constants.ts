import { NotificationType } from '../common/enums/index.js';

/** Único punto que referencia miembros del enum NotificationType; ajusta aquí si difieren. */
export const NOTIF_TYPE = {
  PAYOUT_RECEIVED: NotificationType.PAYOUT_RECEIVED,
  DEFAULT_ALERT: NotificationType.DEFAULT_ALERT,
  PAYMENT_REMINDER: NotificationType.PAYMENT_REMINDER,
  GRACE_WARNING: NotificationType.GRACE_WARNING,
} as const;
