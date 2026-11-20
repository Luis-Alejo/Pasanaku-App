import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GroupStatus, RoundPaymentStatus } from '../common/enums/index.js';
import { RoundPayment } from '../groups/entities/round-payment.entity.js';
import {
  formatBoliviaDate,
  formatUsdc,
} from '../notifications/notification-format.js';
import { NOTIF_TYPE } from '../notifications/notifications.constants.js';
import { NotificationsService } from '../notifications/notifications.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;

interface PendingRow {
  userId: string;
  groupId: string;
  groupName: string;
  roundDuration: number;
  contribution: string;
  roundId: string;
  roundNumber: number;
  deadline: Date;
  graceEnd: Date;
}

/**
 * Avisos por ronda y usuario, una sola vez (dedupeKey en la notificación):
 *  - PAYMENT_REMINDER: ventana previa al vencimiento (min(24 h, mitad de la ronda)).
 *  - GRACE_WARNING: ya vencida la ronda, dentro del período de gracia.
 * Solo se avisa a quien tiene el pago PENDING en la ronda actual sin liquidar.
 */
@Injectable()
export class RoundAlertsService {
  private readonly logger = new Logger(RoundAlertsService.name);

  constructor(
    @InjectRepository(RoundPayment)
    private readonly payments: Repository<RoundPayment>,
    private readonly notifications: NotificationsService,
  ) {}

  async run(): Promise<number> {
    const now = new Date();
    const rows = await this.payments
      .createQueryBuilder('rp')
      .innerJoin('rp.round', 'r')
      .innerJoin('r.group', 'g')
      .innerJoin('rp.member', 'm')
      .select('m.userId', 'userId')
      .addSelect('g.id', 'groupId')
      .addSelect('g.name', 'groupName')
      .addSelect('g.roundDurationSeconds', 'roundDuration')
      .addSelect('g.contributionStroops', 'contribution')
      .addSelect('r.id', 'roundId')
      .addSelect('r.roundNumber', 'roundNumber')
      .addSelect('r.deadline', 'deadline')
      .addSelect('r.graceEnd', 'graceEnd')
      .where('rp.status = :pending', { pending: RoundPaymentStatus.PENDING })
      .andWhere('g.status = :active', { active: GroupStatus.ACTIVE })
      .andWhere('r.isSettled = false')
      .andWhere('r.roundNumber = g.currentRound')
      .andWhere('r.graceEnd > :now', { now })
      .andWhere('r.deadline <= :horizon', {
        horizon: new Date(now.getTime() + DAY_MS),
      })
      .getRawMany<PendingRow>();

    let sent = 0;
    for (const row of rows) {
      try {
        if (await this.alert(row, now)) sent++;
      } catch (error) {
        this.logger.error(
          `Alerta fallida (ronda ${row.roundId}, usuario ${row.userId}): ${(error as Error).message}`,
        );
      }
    }
    return sent;
  }

  private async alert(r: PendingRow, now: Date): Promise<boolean> {
    const deadline = new Date(r.deadline).getTime();
    const graceEnd = new Date(r.graceEnd).getTime();
    const lead = Math.min(DAY_MS, (Number(r.roundDuration) * 1000) / 2);
    const amount = formatUsdc(r.contribution);

    if (now.getTime() >= deadline) {
      return this.notifications.createNotification(
        r.userId,
        r.groupId,
        NOTIF_TYPE.GRACE_WARNING,
        'Estás en período de gracia',
        `Venció tu cuota de ${amount} USDC en "${r.groupName}" (ronda ${r.roundNumber}). Págala antes del ${formatBoliviaDate(new Date(graceEnd))} o se usará tu garantía.`,
        { dedupeKey: `grace:${r.roundId}:${r.userId}` },
      );
    }
    if (now.getTime() >= deadline - lead) {
      return this.notifications.createNotification(
        r.userId,
        r.groupId,
        NOTIF_TYPE.PAYMENT_REMINDER,
        'Tu cuota vence pronto',
        `Paga ${amount} USDC en "${r.groupName}" (ronda ${r.roundNumber}) antes del ${formatBoliviaDate(new Date(deadline))}.`,
        { dedupeKey: `reminder:${r.roundId}:${r.userId}` },
      );
    }
    return false;
  }
}
