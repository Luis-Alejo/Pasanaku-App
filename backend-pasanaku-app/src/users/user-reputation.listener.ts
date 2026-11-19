import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EntityManager } from 'typeorm';
import { User } from './entities/user.entity.js';

interface RegistryEventBase {
  eventId: string;
  contractId: string;
  txHash: string;
  manager: EntityManager;
}
interface DefaultRecordedEvent extends RegistryEventBase {
  user: string;
  penalty: number;
  score: number;
}
interface CompletionRewardedEvent extends RegistryEventBase {
  user: string;
  score: number;
}

/** Espejo de reputación: el registry es la fuente de verdad; aquí solo se refleja. */
@Injectable()
export class UserReputationListener {
  @OnEvent('soroban.registry.default_recorded', { suppressErrors: false })
  async onDefaultRecorded(e: DefaultRecordedEvent): Promise<void> {
    await e.manager.update(
      User,
      { stellarPublicKey: e.user },
      { reputationScore: e.score },
    );
    await e.manager.increment(
      User,
      { stellarPublicKey: e.user },
      'defaultCount',
      1,
    );
  }

  @OnEvent('soroban.registry.completion_rewarded', { suppressErrors: false })
  async onCompletionRewarded(e: CompletionRewardedEvent): Promise<void> {
    await e.manager.update(
      User,
      { stellarPublicKey: e.user },
      { reputationScore: e.score },
    );
    await e.manager.increment(
      User,
      { stellarPublicKey: e.user },
      'completedGroups',
      1,
    );
  }
}
