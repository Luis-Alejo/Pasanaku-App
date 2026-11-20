import { Component, inject, signal } from '@angular/core';
import type { AppNotification, NotificationKind } from '@core/data/notifications.api';
import { NotificationsService } from '@core/services/notifications.service';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonSpinner,
  IonTitle,
  IonToolbar,
  NavController,
} from '@ionic/angular';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { formatDateTime } from '@shared/utils/format';
import { alarmOutline, alertCircleOutline, cashOutline, hourglassOutline, notificationsOutline } from 'ionicons/icons';

const KIND_ICONS: Record<NotificationKind, string> = {
  PAYMENT_REMINDER: alarmOutline,
  GRACE_WARNING: hourglassOutline,
  DEFAULT_ALERT: alertCircleOutline,
  PAYOUT_RECEIVED: cashOutline,
  OTHER: notificationsOutline,
};

const KIND_ACCENTS: Record<NotificationKind, string> = {
  PAYMENT_REMINDER: 'indigo',
  GRACE_WARNING: 'yellow',
  DEFAULT_ALERT: 'pink',
  PAYOUT_RECEIVED: 'teal',
  OTHER: 'blue',
};

/** Avisos del usuario: recordatorios de pago, atrasos y cobros recibidos. */
@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonButton,
    IonContent,
    IonIcon,
    IonSpinner,
    EmptyStateComponent,
  ],
})
export class NotificationsPage {
  protected readonly notifications = inject(NotificationsService);
  private readonly nav = inject(NavController);

  protected readonly kindIcons = KIND_ICONS;
  protected readonly kindAccents = KIND_ACCENTS;
  protected readonly formatDateTime = formatDateTime;
  protected readonly loadFailed = signal(false);

  async ionViewWillEnter(): Promise<void> {
    try {
      await this.notifications.load();
      this.loadFailed.set(false);
    } catch {
      this.loadFailed.set(true);
    }
  }

  protected async open(item: AppNotification): Promise<void> {
    await this.notifications.markRead(item.id);
    if (item.groupId) {
      await this.nav.navigateForward(['/tabs/groups', item.groupId]);
    }
  }
}
