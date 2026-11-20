import { Injectable, inject } from '@angular/core';
import { ApiError, UNKNOWN_ERROR_MESSAGE, toApiError } from '@core/graphql/api-error';
import { environment } from '@env/environment';
import {
  MarkAllNotificationsAsReadGQL,
  MarkNotificationAsReadGQL,
  MyNotificationsGQL,
  UnreadNotificationsCountGQL,
} from '@gql';
import type { Observable } from 'rxjs';
import { firstValueFrom } from 'rxjs';

export type NotificationKind = 'PAYMENT_REMINDER' | 'GRACE_WARNING' | 'DEFAULT_ALERT' | 'PAYOUT_RECEIVED' | 'OTHER';

/** Aviso para el usuario (lo genera el backend). */
export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  message: string;
  groupId?: string;
  read: boolean;
  createdAt: string;
}

/** De dónde salen los avisos. `NotificationsService` solo conoce esta interfaz. */
@Injectable({ providedIn: 'root', useFactory: createNotificationsApi })
export abstract class NotificationsApi {
  abstract list(): Promise<AppNotification[]>;
  abstract unreadCount(): Promise<number>;
  abstract markRead(id: string): Promise<void>;
  abstract markAllRead(): Promise<void>;
}

function createNotificationsApi(): NotificationsApi {
  return environment.useMocks ? new MockNotificationsApi() : inject(GraphqlNotificationsApi);
}

const KNOWN: NotificationKind[] = ['PAYMENT_REMINDER', 'GRACE_WARNING', 'DEFAULT_ALERT', 'PAYOUT_RECEIVED'];

async function apiData<T>(request: Observable<{ data?: T | null }>): Promise<T> {
  let data: T | null | undefined;
  try {
    ({ data } = await firstValueFrom(request));
  } catch (error) {
    throw toApiError(error);
  }
  if (!data) throw new ApiError('unknown', UNKNOWN_ERROR_MESSAGE);
  return data;
}

@Injectable({ providedIn: 'root' })
export class GraphqlNotificationsApi extends NotificationsApi {
  private readonly listGql = inject(MyNotificationsGQL);
  private readonly countGql = inject(UnreadNotificationsCountGQL);
  private readonly readGql = inject(MarkNotificationAsReadGQL);
  private readonly readAllGql = inject(MarkAllNotificationsAsReadGQL);

  override async list(): Promise<AppNotification[]> {
    const { myNotifications } = await apiData(this.listGql.fetch({ fetchPolicy: 'no-cache' }));
    return myNotifications.map((n) => ({
      id: n.id,
      kind: KNOWN.includes(n.type as NotificationKind) ? (n.type as NotificationKind) : 'OTHER',
      title: n.title,
      message: n.message,
      groupId: n.groupId ?? undefined,
      read: n.isRead,
      createdAt: n.createdAt,
    }));
  }

  override async unreadCount(): Promise<number> {
    return (await apiData(this.countGql.fetch({ fetchPolicy: 'no-cache' }))).unreadNotificationsCount;
  }

  override async markRead(id: string): Promise<void> {
    await apiData(this.readGql.mutate({ variables: { id } }));
  }

  override async markAllRead(): Promise<void> {
    await apiData(this.readAllGql.mutate());
  }
}

/** Avisos de ejemplo para los datos de prueba. */
export class MockNotificationsApi extends NotificationsApi {
  private items: AppNotification[] = [
    {
      id: 'n1',
      kind: 'PAYMENT_REMINDER',
      title: 'Se acerca tu aporte',
      message: 'Tu aporte de la ronda 3 vence pronto.',
      groupId: 'group-familia-quispe',
      read: false,
      createdAt: '2026-11-14T13:00:00.000Z',
    },
    {
      id: 'n2',
      kind: 'PAYOUT_RECEIVED',
      title: '¡Recibiste el pozo!',
      message: 'Cobraste la ronda 2 de Ahorro compañeros de oficina.',
      groupId: 'group-oficina',
      read: true,
      createdAt: '2026-10-15T15:00:00.000Z',
    },
  ];

  override list(): Promise<AppNotification[]> {
    return Promise.resolve(structuredClone(this.items));
  }

  override unreadCount(): Promise<number> {
    return Promise.resolve(this.items.filter((n) => !n.read).length);
  }

  override markRead(id: string): Promise<void> {
    this.items = this.items.map((n) => (n.id === id ? { ...n, read: true } : n));
    return Promise.resolve();
  }

  override markAllRead(): Promise<void> {
    this.items = this.items.map((n) => ({ ...n, read: true }));
    return Promise.resolve();
  }
}
