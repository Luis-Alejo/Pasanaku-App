import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { EntityManager } from 'typeorm';
import {
  SOROBAN_EVENT,
  type FinalPayoutEvent,
  type GuaranteeDefaultedEvent,
  type GuaranteeSlashedEvent,
  type RoundPayoutEvent,
  type SorobanEventBase,
} from '../blockchain/indexer/soroban-event.types.js';
import { PasanakuGroup } from '../groups/entities/pasanaku-group.entity.js';
import { User } from '../users/entities/user.entity.js';
import { formatUsdc } from './notification-format.js';
import { NOTIF_TYPE } from './notifications.constants.js';
import { NotificationsService } from './notifications.service.js';

const OPTS = { suppressErrors: false } as const;

/**
 * Las notificaciones son accesorias: un fallo aquí NO debe bloquear el espejo financiero.
 * Cada handler corre en un SAVEPOINT (transacción anidada de Postgres) dentro de la transacción
 * del indexador; si falla, solo se revierte la notificación y el evento sigue aplicándose.
 */
@Injectable()
export class NotificationEventsListener {
  private readonly logger = new Logger(NotificationEventsListener.name);

  constructor(private readonly notifications: NotificationsService) {}

  @OnEvent(SOROBAN_EVENT.ROUND_PAYOUT, OPTS)
  onPayout(e: RoundPayoutEvent) {
    return this.safely(e, (m) =>
      this.payout(m, e, e.beneficiary, e.amount, e.round),
    );
  }

  @OnEvent(SOROBAN_EVENT.FINAL_PAYOUT, OPTS)
  onFinalPayout(e: FinalPayoutEvent) {
    return this.safely(e, (m) =>
      this.payout(m, e, e.beneficiary, e.amount, e.round),
    );
  }

  @OnEvent(SOROBAN_EVENT.GUARANTEE_SLASHED, OPTS)
  onSlashed(e: GuaranteeSlashedEvent) {
    return this.safely(e, async (m) => {
      const { user, group } = await this.resolve(m, e, e.user);
      if (!user || !group) return;
      await this.notifications.createNotification(
        user.id,
        group.id,
        NOTIF_TYPE.DEFAULT_ALERT,
        'Se usó tu garantía',
        `No pagaste a tiempo la ronda ${e.round} de "${group.name}": se usaron ${formatUsdc(e.amount)} USDC de tu garantía. Esto puede afectar tu reputación.`,
        { dedupeKey: `${e.eventId}:${user.id}`, manager: m },
      );
    });
  }

  @OnEvent(SOROBAN_EVENT.GUARANTEE_DEFAULTED, OPTS)
  onDefaulted(e: GuaranteeDefaultedEvent) {
    return this.safely(e, async (m) => {
      const { user, group } = await this.resolve(m, e, e.user);
      if (!user || !group) return;
      await this.notifications.createNotification(
        user.id,
        group.id,
        NOTIF_TYPE.DEFAULT_ALERT,
        'Quedaste en incumplimiento',
        `No pagaste la ronda ${e.round} de "${group.name}" y tu garantía no alcanzó. Tienes una deuda pendiente: págala para recuperar tu reputación.`,
        { dedupeKey: `${e.eventId}:${user.id}`, manager: m },
      );
      if (group.creatorId !== user.id) {
        await this.notifications.createNotification(
          group.creatorId,
          group.id,
          NOTIF_TYPE.DEFAULT_ALERT,
          'Un miembro incumplió',
          `${user.fullName} no pagó la ronda ${e.round} de "${group.name}".`,
          { dedupeKey: `${e.eventId}:${group.creatorId}`, manager: m },
        );
      }
    });
  }

  private async payout(
    m: EntityManager,
    e: SorobanEventBase,
    publicKey: string,
    amount: string,
    round: number,
  ) {
    const { user, group } = await this.resolve(m, e, publicKey);
    if (!user || !group) return;
    await this.notifications.createNotification(
      user.id,
      group.id,
      NOTIF_TYPE.PAYOUT_RECEIVED,
      '¡Recibiste el pozo!',
      `Recibiste ${formatUsdc(amount)} USDC del grupo "${group.name}" (ronda ${round}).`,
      { dedupeKey: `${e.eventId}:${user.id}`, manager: m },
    );
  }

  private async resolve(
    m: EntityManager,
    e: SorobanEventBase,
    publicKey: string,
  ) {
    const [user, group] = await Promise.all([
      m.findOneBy(User, { stellarPublicKey: publicKey }),
      m.findOneBy(PasanakuGroup, { contractAddress: e.contractId }),
    ]);
    return { user, group };
  }

  private async safely(
    e: SorobanEventBase,
    fn: (m: EntityManager) => Promise<void>,
  ): Promise<void> {
    try {
      await e.manager.transaction(fn);
    } catch (error) {
      this.logger.error(
        `Notificación omitida (evento ${e.eventId}): ${(error as Error).message}`,
      );
    }
  }
}
