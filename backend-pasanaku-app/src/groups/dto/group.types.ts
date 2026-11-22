import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import {
  DebtStatus,
  Frequency,
  GroupStatus,
  RoundPaymentStatus,
} from '../../common/enums/index.js';

@ObjectType()
export class TxResultType {
  @Field(() => String) txHash: string;
}

@ObjectType('GroupSummary')
export class GroupSummaryType {
  @Field(() => ID) id: string;
  @Field(() => String) name: string;
  @Field(() => String, { nullable: true }) description: string | null;
  @Field(() => Boolean) isPublic: boolean;
  @Field(() => ID) creatorId: string;
  @Field(() => String, { nullable: true }) contractAddress: string | null;
  @Field(() => Boolean) setupCompleted: boolean;
  @Field(() => String) contributionStroops: string;
  @Field(() => String) guaranteeStroops: string;
  @Field(() => Int) maxParticipants: number;
  @Field(() => Int) roundDurationSeconds: number;
  @Field(() => Int) graceDurationSeconds: number;
  @Field(() => Frequency) frequency: Frequency;
  @Field(() => Int) minReputationReq: number;
  @Field(() => GroupStatus) status: GroupStatus;
  @Field(() => Int) currentRound: number;
  @Field(() => Date, { nullable: true }) nextDeadline: Date | null;
  @Field(() => Date, { nullable: true }) graceDeadline: Date | null;
  @Field(() => Date) createdAt: Date;
  @Field(() => Int) memberCount: number;
}

@ObjectType('GroupMember')
export class GroupMemberType {
  @Field(() => ID) id: string;
  @Field(() => ID) userId: string;
  @Field(() => String) fullName: string;
  @Field(() => Int) reputationScore: number;
  @Field(() => Int) initialTurnOrder: number;
  @Field(() => Int) currentQueuePosition: number;
  @Field(() => Boolean) hasReceivedPayout: boolean;
  @Field(() => String) guaranteeBalanceStroops: string;
  @Field(() => String) totalContributedStroops: string;
  @Field(() => String) totalDebtStroops: string;
  @Field(() => String) shortfallStroops: string;
  @Field(() => Boolean) isClean: boolean;
  @Field(() => Date) joinedAt: Date;
}

@ObjectType('RoundPayment')
export class RoundPaymentType {
  @Field(() => ID) id: string;
  @Field(() => ID) memberId: string;
  @Field(() => RoundPaymentStatus) status: RoundPaymentStatus;
  @Field(() => Date, { nullable: true }) paidAt: Date | null;
  @Field(() => String, { nullable: true }) txHash: string | null;
}

@ObjectType('Round')
export class RoundType {
  @Field(() => ID) id: string;
  @Field(() => Int) roundNumber: number;
  @Field(() => ID, { nullable: true }) beneficiaryMemberId: string | null;
  @Field(() => Date) deadline: Date;
  @Field(() => Date) graceEnd: Date;
  @Field(() => String) expectedPoolStroops: string;
  @Field(() => String) actualPayoutStroops: string;
  @Field(() => Boolean) isSettled: boolean;
  @Field(() => String, { nullable: true }) settleTxHash: string | null;
  @Field(() => Date, { nullable: true }) settledAt: Date | null;
  @Field(() => [RoundPaymentType]) payments: RoundPaymentType[];
}

@ObjectType('MemberDebt')
export class MemberDebtType {
  @Field(() => ID) id: string;
  @Field(() => ID) originalRoundId: string;
  @Field(() => ID) debtorMemberId: string;
  @Field(() => ID) beneficiaryMemberId: string;
  @Field(() => String) originalAmountStroops: string;
  @Field(() => String) remainingAmountStroops: string;
  @Field(() => DebtStatus) status: DebtStatus;
  @Field(() => Date) createdAt: Date;
  @Field(() => String, { nullable: true }) lastPaymentTxHash: string | null;
}

@ObjectType('GroupDetail')
export class GroupDetailType extends GroupSummaryType {
  @Field(() => [GroupMemberType]) members: GroupMemberType[];
  @Field(() => [RoundType]) rounds: RoundType[];
  @Field(() => [MemberDebtType]) debts: MemberDebtType[];
}

@ObjectType('GroupPreview')
export class GroupPreviewType extends GroupSummaryType {
  @Field(() => Boolean) isMember: boolean;
  @Field(() => Boolean) isInvited: boolean;
  @Field(() => [GroupPreviewMemberType]) members: GroupPreviewMemberType[];
}

@ObjectType('GroupPreviewMember')
export class GroupPreviewMemberType {
  @Field(() => ID) id: string; // userId (sirve para enlazar al perfil)
  @Field(() => String) fullName: string;
  @Field(() => Int) reputationScore: number;
  @Field(() => Int) completedGroups: number;
  @Field(() => Int) defaultCount: number;
}
