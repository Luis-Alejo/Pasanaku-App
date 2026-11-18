import { registerEnumType } from '@nestjs/graphql';

export enum GroupStatus {
  OPEN = 'OPEN',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum Frequency {
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
}

export enum RoundPaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  PAID_IN_GRACE = 'PAID_IN_GRACE',
  COVERED_BY_GUARANTEE = 'COVERED_BY_GUARANTEE',
  DEFAULTED = 'DEFAULTED',
  EXEMPT = 'EXEMPT',
}

export enum DebtStatus {
  OPEN = 'OPEN',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  SETTLED = 'SETTLED',
}

registerEnumType(GroupStatus, { name: 'GroupStatus' });
registerEnumType(Frequency, { name: 'Frequency' });
registerEnumType(RoundPaymentStatus, { name: 'RoundPaymentStatus' });
registerEnumType(DebtStatus, { name: 'DebtStatus' });
