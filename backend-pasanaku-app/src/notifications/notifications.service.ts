import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import type { NotificationType } from '../common/enums/index.js';
import { NotificationItemType } from './dto/notification.types.js';
import { Notification } from './entities/notification.entity.js';

const toItem = (n: Notification): NotificationItemType => ({
  id: n.id,
  type: n.type,
  groupId: n.groupId,
  title: n.title,
  message: n.message,
  isRead: n.isRead,
  createdAt: n.createdAt,
});

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
  ) {}

  /**
   * Uso interno (listeners y scheduler). Con `dedupeKey` es idempotente: devuelve false si ya existía.
   * Pasa `manager` para escribir dentro de la transacción del indexador.
   */
  async createNotification(
    userId: string,
    groupId: string | null,
    type: NotificationType,
    title: string,
    message: string,
    opts: { dedupeKey?: string; manager?: EntityManager } = {},
  ): Promise<boolean> {
    const result = await (opts.manager ?? this.repo.manager)
      .createQueryBuilder()
      .insert()
      .into(Notification)
      .values({
        userId,
        groupId,
        type,
        title: title.slice(0, 140),
        message,
        dedupeKey: opts.dedupeKey ?? null,
      })
      .orIgnore()
      .returning('id')
      .execute();
    return result.raw.length > 0;
  }

  async myNotifications(
    userId: string,
    unreadOnly = false,
    limit = 20,
    offset = 0,
  ): Promise<NotificationItemType[]> {
    const rows = await this.repo.find({
      where: unreadOnly ? { userId, isRead: false } : { userId },
      order: { createdAt: 'DESC' },
      take: Math.min(Math.max(Math.trunc(limit) || 20, 1), 50),
      skip: Math.max(Math.trunc(offset) || 0, 0),
    });
    return rows.map(toItem);
  }

  unreadNotificationsCount(userId: string): Promise<number> {
    return this.repo.countBy({ userId, isRead: false });
  }

  async markAsRead(
    userId: string,
    notificationId: string,
  ): Promise<NotificationItemType> {
    const r = await this.repo.update(
      { id: notificationId, userId },
      { isRead: true },
    );
    if (!r.affected) throw new NotFoundException('Notificación no encontrada.');
    return toItem(
      await this.repo.findOneByOrFail({ id: notificationId, userId }),
    );
  }

  async markAllAsRead(userId: string): Promise<number> {
    const r = await this.repo.update(
      { userId, isRead: false },
      { isRead: true },
    );
    return r.affected ?? 0;
  }

  /**
   * Enlace wa.me limpio (solo dígitos, mensaje codificado). OJO: el enlace contiene el número;
   * no lo expongas por GraphQL salvo en casos acotados (p. ej. referencias ante incumplimiento activo).
   */
  buildWhatsAppReminderLink(phone: string, message: string): string {
    let digits = phone.replace(/\D/g, '');
    if (digits.length === 8) digits = `591${digits}`; // número local boliviano sin prefijo
    if (digits.length < 8 || digits.length > 15)
      throw new BadRequestException('Número de teléfono inválido.');
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  }
}
