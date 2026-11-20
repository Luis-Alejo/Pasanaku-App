import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { AuthService } from '@core/auth/auth.service';
import type { AppNotification } from '@core/data/notifications.api';
import { NotificationsApi } from '@core/data/notifications.api';

/** Cada cuánto se revisa si hay avisos nuevos mientras hay sesión. */
const POLL_MS = 30_000;

/** Avisos del usuario: lista y cuántos faltan leer (para la campana con insignia). */
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly api = inject(NotificationsApi);
  private readonly auth = inject(AuthService);
  private readonly _items = signal<AppNotification[]>([]);
  private readonly _unread = signal(0);
  private readonly _loading = signal(false);
  private timer: ReturnType<typeof setInterval> | undefined;

  readonly items = this._items.asReadonly();
  readonly unread = this._unread.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly hasItems = computed(() => this._items().length > 0);

  constructor() {
    // Con sesión revisa periódicamente; sin sesión olvida los avisos.
    effect(() => {
      clearInterval(this.timer);
      if (this.auth.isAuthenticated()) {
        void this.refreshCount();
        this.timer = setInterval(() => void this.refreshCount(), POLL_MS);
      } else {
        this._items.set([]);
        this._unread.set(0);
      }
    });
  }

  async refreshCount(): Promise<void> {
    try {
      this._unread.set(await this.api.unreadCount());
    } catch {
      // Sin conexión: se mantiene el último número.
    }
  }

  async load(): Promise<void> {
    this._loading.set(true);
    try {
      const items = await this.api.list();
      this._items.set(items);
      this._unread.set(items.filter((n) => !n.read).length);
    } finally {
      this._loading.set(false);
    }
  }

  async markRead(id: string): Promise<void> {
    const item = this._items().find((n) => n.id === id);
    if (!item || item.read) return;
    this._items.update((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
    this._unread.update((n) => Math.max(0, n - 1));
    await this.api.markRead(id).catch(() => undefined);
  }

  async markAllRead(): Promise<void> {
    this._items.update((list) => list.map((n) => ({ ...n, read: true })));
    this._unread.set(0);
    await this.api.markAllRead().catch(() => undefined);
  }
}
