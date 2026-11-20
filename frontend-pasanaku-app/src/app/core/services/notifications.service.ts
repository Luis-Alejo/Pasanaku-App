import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { AuthService } from '@core/auth/auth.service';
import { GroupsApi } from '@core/data/groups.api';
import type { AppNotification } from '@core/data/notifications.api';
import { NotificationsApi } from '@core/data/notifications.api';

/** Cada cuánto se revisa si hay avisos nuevos mientras hay sesión. */
const POLL_MS = 30_000;
/** Invitaciones ya vistas (el backend no las guarda como avisos). */
const SEEN_INVITES_KEY = 'pk-seen-invites';
const INVITE_PREFIX = 'invite-';

function readSeenInvites(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_INVITES_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

/**
 * Avisos del usuario: los del backend más las invitaciones a grupos privados,
 * que el backend no manda como aviso. Expone la lista y cuántos faltan leer.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly api = inject(NotificationsApi);
  private readonly groups = inject(GroupsApi);
  private readonly auth = inject(AuthService);
  private readonly _items = signal<AppNotification[]>([]);
  private readonly _unread = signal(0);
  private readonly _loading = signal(false);
  private readonly seenInvites = readSeenInvites();
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
      const [count, invites] = await Promise.all([this.api.unreadCount(), this.invitations()]);
      this._unread.set(count + invites.filter((n) => !n.read).length);
    } catch {
      // Sin conexión: se mantiene el último número.
    }
  }

  async load(): Promise<void> {
    this._loading.set(true);
    try {
      const [items, invites] = await Promise.all([this.api.list(), this.invitations()]);
      const all = [...invites, ...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      this._items.set(all);
      this._unread.set(all.filter((n) => !n.read).length);
    } finally {
      this._loading.set(false);
    }
  }

  async markRead(id: string): Promise<void> {
    const item = this._items().find((n) => n.id === id);
    if (!item || item.read) return;
    this._items.update((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
    this._unread.update((n) => Math.max(0, n - 1));
    if (id.startsWith(INVITE_PREFIX)) {
      this.rememberInvites([id]);
      return;
    }
    await this.api.markRead(id).catch(() => undefined);
  }

  async markAllRead(): Promise<void> {
    this.rememberInvites(
      this._items()
        .filter((n) => n.id.startsWith(INVITE_PREFIX))
        .map((n) => n.id),
    );
    this._items.update((list) => list.map((n) => ({ ...n, read: true })));
    this._unread.set(0);
    await this.api.markAllRead().catch(() => undefined);
  }

  /** Las invitaciones pendientes, como avisos. */
  private async invitations(): Promise<AppNotification[]> {
    const groups = await this.groups.getInvitations().catch(() => []);
    return groups.map((group) => {
      const id = `${INVITE_PREFIX}${group.id}`;
      return {
        id,
        kind: 'INVITATION',
        title: 'Te invitaron a un grupo',
        message: `Te invitaron a "${group.name}". Ábrelo para ver las reglas y unirte.`,
        groupId: group.id,
        read: this.seenInvites.has(id),
        createdAt: group.createdAt,
      };
    });
  }

  private rememberInvites(ids: string[]): void {
    ids.forEach((id) => this.seenInvites.add(id));
    try {
      localStorage.setItem(SEEN_INVITES_KEY, JSON.stringify([...this.seenInvites]));
    } catch {
      // Solo se pierde el "visto" de las invitaciones.
    }
  }
}
