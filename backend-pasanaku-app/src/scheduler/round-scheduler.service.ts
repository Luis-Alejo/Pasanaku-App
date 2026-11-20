import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { GroupsService } from '../groups/groups.service.js';
import { PaymentsService } from '../payments/payments.service.js';
import { ClusterLockService } from './cluster-lock.service.js';
import { RoundAlertsService } from './round-alerts.service.js';

const LOCK = { SETTLEMENT: 7001, PAYMENTS: 7002, ALERTS: 7003 } as const;
/** Evita reintentar el mismo grupo mientras el indexador aún no refleja la liquidación. */
const RETRY_GAP_MS = 30_000;

@Injectable()
export class RoundSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(RoundSchedulerService.name);
  private readonly enabled: boolean;
  private isSettling = false;
  private isResumingPayments = false;
  private isAlerting = false;
  private readonly lastAttempt = new Map<string, number>();

  constructor(
    config: ConfigService,
    private readonly groups: GroupsService,
    private readonly payments: PaymentsService,
    private readonly alerts: RoundAlertsService,
    private readonly clusterLock: ClusterLockService,
  ) {
    this.enabled =
      (config.get<string>('SCHEDULER_ENABLED') ?? 'true') !== 'false';
  }

  onModuleInit(): void {
    this.logger.log(
      this.enabled
        ? 'Scheduler ACTIVO'
        : 'Scheduler DESACTIVADO (SCHEDULER_ENABLED=false)',
    );
  }

  /** Liquidación automática: sin esto ninguna ronda se cobra ni se completa el ciclo. */
  @Interval('round-settlement', 15_000)
  async settleDueRounds(): Promise<void> {
    if (!this.enabled || this.isSettling) return;
    this.isSettling = true;
    try {
      await this.clusterLock.run(LOCK.SETTLEMENT, async () => {
        const ids = await this.groups.findGroupIdsDueForSettlement();
        for (const groupId of ids) {
          const last = this.lastAttempt.get(groupId);
          if (last && Date.now() - last < RETRY_GAP_MS) continue;
          this.lastAttempt.set(groupId, Date.now());
          try {
            const result = await this.groups.triggerRoundSettlement(groupId);
            if (result) {
              this.logger.log(
                `Ronda liquidada grupo ${groupId} tx ${result.txHash} beneficiario ${result.beneficiary ?? 'ninguno'}`,
              );
            }
          } catch (error) {
            this.logger.error(
              `Liquidación fallida grupo ${groupId}: ${(error as Error).message}`,
            );
          }
        }
        const cutoff = Date.now() - 10 * 60_000;
        for (const [id, at] of this.lastAttempt)
          if (at < cutoff) this.lastAttempt.delete(id);
      });
    } catch (error) {
      this.logger.error(
        `Tarea de liquidación falló: ${(error as Error).message}`,
      );
    } finally {
      this.isSettling = false;
    }
  }

  /** Reanuda depósitos en BOB confirmados pero sin USDC acreditado. */
  @Interval('stalled-payments', 30_000)
  async resumeStalledPayments(): Promise<void> {
    if (!this.enabled || this.isResumingPayments) return;
    this.isResumingPayments = true;
    try {
      await this.clusterLock.run(LOCK.PAYMENTS, async () => {
        const n = await this.payments.resumeStalledPayments();
        if (n > 0) this.logger.log(`Pagos atascados reintentados: ${n}`);
      });
    } catch (error) {
      this.logger.error(
        `Recuperación de pagos falló: ${(error as Error).message}`,
      );
    } finally {
      this.isResumingPayments = false;
    }
  }

  /** Recordatorios de vencimiento y avisos de período de gracia. */
  @Interval('round-alerts', 60_000)
  async sendRoundAlerts(): Promise<void> {
    if (!this.enabled || this.isAlerting) return;
    this.isAlerting = true;
    try {
      await this.clusterLock.run(LOCK.ALERTS, async () => {
        const n = await this.alerts.run();
        if (n > 0) this.logger.log(`Alertas de ronda enviadas: ${n}`);
      });
    } catch (error) {
      this.logger.error(
        `Alertas de ronda fallaron: ${(error as Error).message}`,
      );
    } finally {
      this.isAlerting = false;
    }
  }
}
