import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { DebtStatus, GroupStatus, RoundPaymentStatus } from '../common/enums/index.js';
import { GroupObligationsPort } from '../users/ports/group-obligations.port.js';
import { GroupMember } from './entities/group-member.entity.js';
import { MemberDebt } from './entities/member-debt.entity.js';
import { PasanakuGroup } from './entities/pasanaku-group.entity.js';
import { RoundPayment } from './entities/round-payment.entity.js';

/** Depende solo de repositorios (no de UsersService) para evitar ciclos con UsersModule. */
@Injectable()
export class GroupObligationsService implements GroupObligationsPort {
  constructor(
    @InjectRepository(PasanakuGroup)
    private readonly groups: Repository<PasanakuGroup>,
    @InjectRepository(GroupMember)
    private readonly members: Repository<GroupMember>,
    @InjectRepository(MemberDebt)
    private readonly debts: Repository<MemberDebt>,
    @InjectRepository(RoundPayment)
    private readonly payments: Repository<RoundPayment>,
  ) {}

  async canViewDefaulterReferences(p: {
    requesterId: string;
    groupId: string;
    memberId: string;
  }): Promise<boolean> {
    const group = await this.groups.findOne({
      where: { id: p.groupId },
      select: { id: true, creatorId: true },
    });
    if (!group || group.creatorId !== p.requesterId) return false;
    if (!(await this.members.existsBy({ id: p.memberId, groupId: p.groupId })))
      return false;

    if (
      await this.debts.existsBy({
        debtorMemberId: p.memberId,
        status: In([DebtStatus.OPEN, DebtStatus.PARTIALLY_PAID]),
      })
    )
      return true;

    // DEFAULTED sin deuda saldada para esa ronda (incumplimiento activo).
    const count = await this.payments
      .createQueryBuilder('p')
      .where('p.memberId = :memberId', { memberId: p.memberId })
      .andWhere('p.status = :st', { st: RoundPaymentStatus.DEFAULTED })
      .andWhere(
        `NOT EXISTS (SELECT 1 FROM member_debts d WHERE d."originalRoundId" = p."roundId"
           AND d."debtorMemberId" = p."memberId" AND d.status = :settled)`,
        { settled: DebtStatus.SETTLED },
      )
      .getCount();
    return count > 0;
  }

  async hasActiveObligations(userId: string): Promise<boolean> {
    const inGroup = await this.members
      .createQueryBuilder('m')
      .innerJoin('m.group', 'g')
      .where('m.userId = :userId', { userId })
      .andWhere('g.status IN (:...st)', {
        st: [GroupStatus.OPEN, GroupStatus.ACTIVE],
      })
      .getCount();
    if (inGroup > 0) return true;

    const pendingDebts = await this.debts
      .createQueryBuilder('d')
      .innerJoin('d.debtorMember', 'dm')
      .where('dm.userId = :userId', { userId })
      .andWhere('d.status IN (:...ds)', {
        ds: [DebtStatus.OPEN, DebtStatus.PARTIALLY_PAID],
      })
      .getCount();
    return pendingDebts > 0;
  }
}
