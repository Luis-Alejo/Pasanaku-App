import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { DebtStatus, GroupStatus } from '../common/enums/index.js';
import { WatchedContractsPort } from '../blockchain/indexer/watched-contracts.port.js';
import { PasanakuGroup } from './entities/pasanaku-group.entity.js';

@Injectable()
export class WatchedContractsProvider implements WatchedContractsPort {
  constructor(
    @InjectRepository(PasanakuGroup)
    private readonly groups: Repository<PasanakuGroup>,
  ) {}

  /** OPEN/ACTIVE, y COMPLETED con deudas abiertas (pay_arrears no valida el estado del grupo). */
  async getGroupContractIds(): Promise<string[]> {
    const rows = await this.groups
      .createQueryBuilder('g')
      .select('g.contractAddress', 'contractAddress')
      .where('g.contractAddress IS NOT NULL')
      .andWhere(
        new Brackets((qb) =>
          qb
            .where('g.status IN (:...live)', {
              live: [GroupStatus.OPEN, GroupStatus.ACTIVE],
            })
            .orWhere(
              `g.status = :done AND EXISTS (SELECT 1 FROM member_debts d
                 WHERE d."groupId" = g.id AND d.status IN (:...openDebt))`,
              {
                done: GroupStatus.COMPLETED,
                openDebt: [DebtStatus.OPEN, DebtStatus.PARTIALLY_PAID],
              },
            ),
        ),
      )
      .getRawMany<{ contractAddress: string }>();
    return rows.map((r) => r.contractAddress);
  }
}
