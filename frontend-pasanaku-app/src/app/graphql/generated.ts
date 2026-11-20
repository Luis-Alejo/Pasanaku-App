/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { gql } from 'apollo-angular';
import { Injectable } from '@angular/core';
import * as Apollo from 'apollo-angular';
export type CreateGroupInput = {
  /** Cuota en USDC, p. ej. "25" o "12.5" */
  contributionUsdc: string;
  description?: string | null | undefined;
  frequency: Frequency;
  /** Solo Testnet/demo */
  graceDurationSeconds?: number | null | undefined;
  isPublic?: boolean;
  maxParticipants: number;
  name: string;
  /** Solo Testnet/demo */
  roundDurationSeconds?: number | null | undefined;
};

export type DebtStatus =
  | 'OPEN'
  | 'PARTIALLY_PAID'
  | 'SETTLED';

export type Frequency =
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'WEEKLY';

export type GroupStatus =
  | 'ACTIVE'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'OPEN';

export type InitiateQrPaymentInput = {
  /** Solo TOPUP, p. ej. "100" o "55.50" */
  amountBob?: string | null | undefined;
  /** Requerido salvo TOPUP */
  groupId?: string | number | null | undefined;
  /** Reintentos del cliente sin duplicar el cobro */
  idempotencyKey?: string | null | undefined;
  purpose: PaymentPurpose;
  /** Ronda original de la deuda (ARREARS) */
  round?: number | null | undefined;
};

export type InviteMemberInput = {
  groupId: string | number;
  phone: string;
};

export type KycStatus =
  | 'PENDING'
  | 'REJECTED'
  | 'VERIFIED';

export type LoginInput = {
  password: string;
  phone: string;
};

export type NotificationType =
  | 'DEFAULT_ALERT'
  | 'GRACE_WARNING'
  | 'PAYMENT_REMINDER'
  | 'PAYOUT_RECEIVED'
  | 'REFERENCE_REQUEST';

export type PayArrearsInput = {
  /** USDC; si se omite, paga el saldo completo */
  amountUsdc?: string | null | undefined;
  groupId: string | number;
  /** Número de la ronda original de la deuda */
  round: number;
};

export type PaymentPurpose =
  | 'ARREARS'
  | 'CONTRIBUTION'
  | 'JOIN'
  | 'TOPUP';

export type RegisterInput = {
  email?: string | null | undefined;
  fullName: string;
  password: string;
  phone: string;
};

export type RoundPaymentStatus =
  | 'COVERED_BY_GUARANTEE'
  | 'DEFAULTED'
  | 'EXEMPT'
  | 'PAID'
  | 'PAID_IN_GRACE'
  | 'PENDING';

export type SetTurnOrderInput = {
  groupId: string | number;
  /** userId de TODOS los miembros, en orden de turno */
  userIds: Array<string | number>;
};

export type SubmitKycInput = {
  ciNumber: string;
};

export type TransactionStatus =
  | 'CONFIRMED'
  | 'FAILED'
  | 'PENDING_CHAIN'
  | 'PENDING_FIAT';

export type UpdateGroupInput = {
  description?: string | null | undefined;
  groupId: string | number;
  name?: string | null | undefined;
};

export type SessionUserFragment = { id: string, fullName: string, phone: string, email: string | null, stellarPublicKey: string, kycStatus: KycStatus };

export type LoginMutationVariables = Exact<{
  input: LoginInput;
}>;


export type LoginMutation = { login: { accessToken: string, user: { id: string, fullName: string, phone: string, email: string | null, stellarPublicKey: string, kycStatus: KycStatus } } };

export type RegisterMutationVariables = Exact<{
  input: RegisterInput;
}>;


export type RegisterMutation = { register: { accessToken: string, user: { id: string, fullName: string, phone: string, email: string | null, stellarPublicKey: string, kycStatus: KycStatus } } };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { me: { id: string, fullName: string, phone: string, email: string | null, stellarPublicKey: string, kycStatus: KycStatus } };

export type SubmitKycMutationVariables = Exact<{
  input: SubmitKycInput;
}>;


export type SubmitKycMutation = { submitKyc: { id: string, fullName: string, phone: string, email: string | null, stellarPublicKey: string, kycStatus: KycStatus } };

export type GroupSummaryFieldsFragment = { id: string, name: string, creatorId: string, contributionStroops: string, frequency: Frequency, maxParticipants: number, memberCount: number, isPublic: boolean, status: GroupStatus, currentRound: number, roundDurationSeconds: number, createdAt: string };

export type GroupDetailFieldsFragment = { id: string, name: string, creatorId: string, contributionStroops: string, frequency: Frequency, maxParticipants: number, memberCount: number, isPublic: boolean, status: GroupStatus, currentRound: number, roundDurationSeconds: number, createdAt: string, members: Array<{ id: string, userId: string, fullName: string, initialTurnOrder: number, currentQueuePosition: number, hasReceivedPayout: boolean, joinedAt: string }>, rounds: Array<{ id: string, roundNumber: number, deadline: string, isSettled: boolean, beneficiaryMemberId: string | null, settleTxHash: string | null, settledAt: string | null, payments: Array<{ id: string, memberId: string, status: RoundPaymentStatus, paidAt: string | null, txHash: string | null }> }>, debts: Array<{ id: string, debtorMemberId: string, beneficiaryMemberId: string, originalRoundId: string, originalAmountStroops: string, remainingAmountStroops: string, status: DebtStatus, lastPaymentTxHash: string | null }> };

export type GroupPreviewFieldsFragment = { id: string, name: string, creatorId: string, contributionStroops: string, frequency: Frequency, maxParticipants: number, memberCount: number, isPublic: boolean, status: GroupStatus, currentRound: number, roundDurationSeconds: number, createdAt: string, isInvited: boolean, isMember: boolean };

export type GroupPreviewQueryVariables = Exact<{
  groupId: string | number;
}>;


export type GroupPreviewQuery = { groupPreview: { id: string, name: string, creatorId: string, contributionStroops: string, frequency: Frequency, maxParticipants: number, memberCount: number, isPublic: boolean, status: GroupStatus, currentRound: number, roundDurationSeconds: number, createdAt: string, isInvited: boolean, isMember: boolean } };

export type MyInvitationsQueryVariables = Exact<{ [key: string]: never; }>;


export type MyInvitationsQuery = { myInvitations: Array<{ id: string, name: string, creatorId: string, contributionStroops: string, frequency: Frequency, maxParticipants: number, memberCount: number, isPublic: boolean, status: GroupStatus, currentRound: number, roundDurationSeconds: number, createdAt: string }> };

export type UpdateGroupMutationVariables = Exact<{
  input: UpdateGroupInput;
}>;


export type UpdateGroupMutation = { updateGroup: { id: string, name: string } };

export type CancelGroupMutationVariables = Exact<{
  groupId: string | number;
}>;


export type CancelGroupMutation = { cancelGroup: { id: string, status: GroupStatus } };

export type MyGroupsQueryVariables = Exact<{ [key: string]: never; }>;


export type MyGroupsQuery = { myGroups: Array<{ id: string, name: string, creatorId: string, contributionStroops: string, frequency: Frequency, maxParticipants: number, memberCount: number, isPublic: boolean, status: GroupStatus, currentRound: number, roundDurationSeconds: number, createdAt: string }> };

export type PublicGroupsQueryVariables = Exact<{ [key: string]: never; }>;


export type PublicGroupsQuery = { publicGroups: Array<{ id: string, name: string, creatorId: string, contributionStroops: string, frequency: Frequency, maxParticipants: number, memberCount: number, isPublic: boolean, status: GroupStatus, currentRound: number, roundDurationSeconds: number, createdAt: string }> };

export type GroupDetailQueryVariables = Exact<{
  groupId: string | number;
}>;


export type GroupDetailQuery = { groupDetail: { id: string, name: string, creatorId: string, contributionStroops: string, frequency: Frequency, maxParticipants: number, memberCount: number, isPublic: boolean, status: GroupStatus, currentRound: number, roundDurationSeconds: number, createdAt: string, members: Array<{ id: string, userId: string, fullName: string, initialTurnOrder: number, currentQueuePosition: number, hasReceivedPayout: boolean, joinedAt: string }>, rounds: Array<{ id: string, roundNumber: number, deadline: string, isSettled: boolean, beneficiaryMemberId: string | null, settleTxHash: string | null, settledAt: string | null, payments: Array<{ id: string, memberId: string, status: RoundPaymentStatus, paidAt: string | null, txHash: string | null }> }>, debts: Array<{ id: string, debtorMemberId: string, beneficiaryMemberId: string, originalRoundId: string, originalAmountStroops: string, remainingAmountStroops: string, status: DebtStatus, lastPaymentTxHash: string | null }> } };

export type CreateGroupMutationVariables = Exact<{
  input: CreateGroupInput;
}>;


export type CreateGroupMutation = { createGroup: { id: string, name: string, creatorId: string, contributionStroops: string, frequency: Frequency, maxParticipants: number, memberCount: number, isPublic: boolean, status: GroupStatus, currentRound: number, roundDurationSeconds: number, createdAt: string } };

export type JoinGroupMutationVariables = Exact<{
  groupId: string | number;
}>;


export type JoinGroupMutation = { joinGroup: { txHash: string } };

export type InviteMemberMutationVariables = Exact<{
  input: InviteMemberInput;
}>;


export type InviteMemberMutation = { inviteMember: { txHash: string } };

export type SetTurnOrderMutationVariables = Exact<{
  input: SetTurnOrderInput;
}>;


export type SetTurnOrderMutation = { setTurnOrder: { txHash: string } };

export type StartGroupMutationVariables = Exact<{
  groupId: string | number;
}>;


export type StartGroupMutation = { startGroup: { txHash: string } };

export type PayRoundMutationVariables = Exact<{
  groupId: string | number;
}>;


export type PayRoundMutation = { payRound: { txHash: string } };

export type MyNotificationsQueryVariables = Exact<{ [key: string]: never; }>;


export type MyNotificationsQuery = { myNotifications: Array<{ id: string, type: NotificationType, title: string, message: string, groupId: string | null, isRead: boolean, createdAt: string }> };

export type UnreadNotificationsCountQueryVariables = Exact<{ [key: string]: never; }>;


export type UnreadNotificationsCountQuery = { unreadNotificationsCount: number };

export type MarkNotificationAsReadMutationVariables = Exact<{
  id: string | number;
}>;


export type MarkNotificationAsReadMutation = { markNotificationAsRead: { id: string, isRead: boolean } };

export type MarkAllNotificationsAsReadMutationVariables = Exact<{ [key: string]: never; }>;


export type MarkAllNotificationsAsReadMutation = { markAllNotificationsAsRead: number };

export type InitiateQrPaymentMutationVariables = Exact<{
  input: InitiateQrPaymentInput;
}>;


export type InitiateQrPaymentMutation = { initiateQrPayment: { transactionId: string, pollarReference: string, amountBob: string, amountStroops: string, exchangeRate: string, qrPayload: string, qrImageBase64: string | null, expiresAt: string | null, mock: boolean } };

export type SimulateQrPaymentMutationVariables = Exact<{
  reference: string;
}>;


export type SimulateQrPaymentMutation = { simulateQrPayment: { id: string, status: TransactionStatus, stellarTxHash: string | null } };

export type PayArrearsMutationVariables = Exact<{
  input: PayArrearsInput;
}>;


export type PayArrearsMutation = { payArrears: { txHash: string } };

export const SessionUserFragmentDoc = gql`
    fragment SessionUser on User {
  id
  fullName
  phone
  email
  stellarPublicKey
  kycStatus
}
    `;
export const GroupSummaryFieldsFragmentDoc = gql`
    fragment GroupSummaryFields on GroupSummary {
  id
  name
  creatorId
  contributionStroops
  frequency
  maxParticipants
  memberCount
  isPublic
  status
  currentRound
  roundDurationSeconds
  createdAt
}
    `;
export const GroupDetailFieldsFragmentDoc = gql`
    fragment GroupDetailFields on GroupDetail {
  id
  name
  creatorId
  contributionStroops
  frequency
  maxParticipants
  memberCount
  isPublic
  status
  currentRound
  roundDurationSeconds
  createdAt
  members {
    id
    userId
    fullName
    initialTurnOrder
    currentQueuePosition
    hasReceivedPayout
    joinedAt
  }
  rounds {
    id
    roundNumber
    deadline
    isSettled
    beneficiaryMemberId
    settleTxHash
    settledAt
    payments {
      id
      memberId
      status
      paidAt
      txHash
    }
  }
  debts {
    id
    debtorMemberId
    beneficiaryMemberId
    originalRoundId
    originalAmountStroops
    remainingAmountStroops
    status
    lastPaymentTxHash
  }
}
    `;
export const GroupPreviewFieldsFragmentDoc = gql`
    fragment GroupPreviewFields on GroupPreview {
  id
  name
  creatorId
  contributionStroops
  frequency
  maxParticipants
  memberCount
  isPublic
  status
  currentRound
  roundDurationSeconds
  createdAt
  isInvited
  isMember
}
    `;
export const LoginDocument = gql`
    mutation Login($input: LoginInput!) {
  login(input: $input) {
    accessToken
    user {
      ...SessionUser
    }
  }
}
    ${SessionUserFragmentDoc}`;

  @Injectable({
    providedIn: 'root'
  })
  export class LoginGQL extends Apollo.Mutation<LoginMutation, LoginMutationVariables> {
    override document = LoginDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const RegisterDocument = gql`
    mutation Register($input: RegisterInput!) {
  register(input: $input) {
    accessToken
    user {
      ...SessionUser
    }
  }
}
    ${SessionUserFragmentDoc}`;

  @Injectable({
    providedIn: 'root'
  })
  export class RegisterGQL extends Apollo.Mutation<RegisterMutation, RegisterMutationVariables> {
    override document = RegisterDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const MeDocument = gql`
    query Me {
  me {
    ...SessionUser
  }
}
    ${SessionUserFragmentDoc}`;

  @Injectable({
    providedIn: 'root'
  })
  export class MeGQL extends Apollo.Query<MeQuery, MeQueryVariables> {
    override document = MeDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const SubmitKycDocument = gql`
    mutation SubmitKyc($input: SubmitKycInput!) {
  submitKyc(input: $input) {
    ...SessionUser
  }
}
    ${SessionUserFragmentDoc}`;

  @Injectable({
    providedIn: 'root'
  })
  export class SubmitKycGQL extends Apollo.Mutation<SubmitKycMutation, SubmitKycMutationVariables> {
    override document = SubmitKycDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const GroupPreviewDocument = gql`
    query GroupPreview($groupId: ID!) {
  groupPreview(groupId: $groupId) {
    ...GroupPreviewFields
  }
}
    ${GroupPreviewFieldsFragmentDoc}`;

  @Injectable({
    providedIn: 'root'
  })
  export class GroupPreviewGQL extends Apollo.Query<GroupPreviewQuery, GroupPreviewQueryVariables> {
    override document = GroupPreviewDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const MyInvitationsDocument = gql`
    query MyInvitations {
  myInvitations {
    ...GroupSummaryFields
  }
}
    ${GroupSummaryFieldsFragmentDoc}`;

  @Injectable({
    providedIn: 'root'
  })
  export class MyInvitationsGQL extends Apollo.Query<MyInvitationsQuery, MyInvitationsQueryVariables> {
    override document = MyInvitationsDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const UpdateGroupDocument = gql`
    mutation UpdateGroup($input: UpdateGroupInput!) {
  updateGroup(input: $input) {
    id
    name
  }
}
    `;

  @Injectable({
    providedIn: 'root'
  })
  export class UpdateGroupGQL extends Apollo.Mutation<UpdateGroupMutation, UpdateGroupMutationVariables> {
    override document = UpdateGroupDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const CancelGroupDocument = gql`
    mutation CancelGroup($groupId: ID!) {
  cancelGroup(groupId: $groupId) {
    id
    status
  }
}
    `;

  @Injectable({
    providedIn: 'root'
  })
  export class CancelGroupGQL extends Apollo.Mutation<CancelGroupMutation, CancelGroupMutationVariables> {
    override document = CancelGroupDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const MyGroupsDocument = gql`
    query MyGroups {
  myGroups {
    ...GroupSummaryFields
  }
}
    ${GroupSummaryFieldsFragmentDoc}`;

  @Injectable({
    providedIn: 'root'
  })
  export class MyGroupsGQL extends Apollo.Query<MyGroupsQuery, MyGroupsQueryVariables> {
    override document = MyGroupsDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const PublicGroupsDocument = gql`
    query PublicGroups {
  publicGroups(limit: 50) {
    ...GroupSummaryFields
  }
}
    ${GroupSummaryFieldsFragmentDoc}`;

  @Injectable({
    providedIn: 'root'
  })
  export class PublicGroupsGQL extends Apollo.Query<PublicGroupsQuery, PublicGroupsQueryVariables> {
    override document = PublicGroupsDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const GroupDetailDocument = gql`
    query GroupDetail($groupId: ID!) {
  groupDetail(groupId: $groupId) {
    ...GroupDetailFields
  }
}
    ${GroupDetailFieldsFragmentDoc}`;

  @Injectable({
    providedIn: 'root'
  })
  export class GroupDetailGQL extends Apollo.Query<GroupDetailQuery, GroupDetailQueryVariables> {
    override document = GroupDetailDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const CreateGroupDocument = gql`
    mutation CreateGroup($input: CreateGroupInput!) {
  createGroup(input: $input) {
    ...GroupSummaryFields
  }
}
    ${GroupSummaryFieldsFragmentDoc}`;

  @Injectable({
    providedIn: 'root'
  })
  export class CreateGroupGQL extends Apollo.Mutation<CreateGroupMutation, CreateGroupMutationVariables> {
    override document = CreateGroupDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const JoinGroupDocument = gql`
    mutation JoinGroup($groupId: ID!) {
  joinGroup(groupId: $groupId) {
    txHash
  }
}
    `;

  @Injectable({
    providedIn: 'root'
  })
  export class JoinGroupGQL extends Apollo.Mutation<JoinGroupMutation, JoinGroupMutationVariables> {
    override document = JoinGroupDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const InviteMemberDocument = gql`
    mutation InviteMember($input: InviteMemberInput!) {
  inviteMember(input: $input) {
    txHash
  }
}
    `;

  @Injectable({
    providedIn: 'root'
  })
  export class InviteMemberGQL extends Apollo.Mutation<InviteMemberMutation, InviteMemberMutationVariables> {
    override document = InviteMemberDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const SetTurnOrderDocument = gql`
    mutation SetTurnOrder($input: SetTurnOrderInput!) {
  setTurnOrder(input: $input) {
    txHash
  }
}
    `;

  @Injectable({
    providedIn: 'root'
  })
  export class SetTurnOrderGQL extends Apollo.Mutation<SetTurnOrderMutation, SetTurnOrderMutationVariables> {
    override document = SetTurnOrderDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const StartGroupDocument = gql`
    mutation StartGroup($groupId: ID!) {
  startGroup(groupId: $groupId) {
    txHash
  }
}
    `;

  @Injectable({
    providedIn: 'root'
  })
  export class StartGroupGQL extends Apollo.Mutation<StartGroupMutation, StartGroupMutationVariables> {
    override document = StartGroupDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const PayRoundDocument = gql`
    mutation PayRound($groupId: ID!) {
  payRound(groupId: $groupId) {
    txHash
  }
}
    `;

  @Injectable({
    providedIn: 'root'
  })
  export class PayRoundGQL extends Apollo.Mutation<PayRoundMutation, PayRoundMutationVariables> {
    override document = PayRoundDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const MyNotificationsDocument = gql`
    query MyNotifications {
  myNotifications(limit: 30) {
    id
    type
    title
    message
    groupId
    isRead
    createdAt
  }
}
    `;

  @Injectable({
    providedIn: 'root'
  })
  export class MyNotificationsGQL extends Apollo.Query<MyNotificationsQuery, MyNotificationsQueryVariables> {
    override document = MyNotificationsDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const UnreadNotificationsCountDocument = gql`
    query UnreadNotificationsCount {
  unreadNotificationsCount
}
    `;

  @Injectable({
    providedIn: 'root'
  })
  export class UnreadNotificationsCountGQL extends Apollo.Query<UnreadNotificationsCountQuery, UnreadNotificationsCountQueryVariables> {
    override document = UnreadNotificationsCountDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const MarkNotificationAsReadDocument = gql`
    mutation MarkNotificationAsRead($id: ID!) {
  markNotificationAsRead(notificationId: $id) {
    id
    isRead
  }
}
    `;

  @Injectable({
    providedIn: 'root'
  })
  export class MarkNotificationAsReadGQL extends Apollo.Mutation<MarkNotificationAsReadMutation, MarkNotificationAsReadMutationVariables> {
    override document = MarkNotificationAsReadDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const MarkAllNotificationsAsReadDocument = gql`
    mutation MarkAllNotificationsAsRead {
  markAllNotificationsAsRead
}
    `;

  @Injectable({
    providedIn: 'root'
  })
  export class MarkAllNotificationsAsReadGQL extends Apollo.Mutation<MarkAllNotificationsAsReadMutation, MarkAllNotificationsAsReadMutationVariables> {
    override document = MarkAllNotificationsAsReadDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const InitiateQrPaymentDocument = gql`
    mutation InitiateQrPayment($input: InitiateQrPaymentInput!) {
  initiateQrPayment(input: $input) {
    transactionId
    pollarReference
    amountBob
    amountStroops
    exchangeRate
    qrPayload
    qrImageBase64
    expiresAt
    mock
  }
}
    `;

  @Injectable({
    providedIn: 'root'
  })
  export class InitiateQrPaymentGQL extends Apollo.Mutation<InitiateQrPaymentMutation, InitiateQrPaymentMutationVariables> {
    override document = InitiateQrPaymentDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const SimulateQrPaymentDocument = gql`
    mutation SimulateQrPayment($reference: String!) {
  simulateQrPayment(pollarReference: $reference) {
    id
    status
    stellarTxHash
  }
}
    `;

  @Injectable({
    providedIn: 'root'
  })
  export class SimulateQrPaymentGQL extends Apollo.Mutation<SimulateQrPaymentMutation, SimulateQrPaymentMutationVariables> {
    override document = SimulateQrPaymentDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const PayArrearsDocument = gql`
    mutation PayArrears($input: PayArrearsInput!) {
  payArrears(input: $input) {
    txHash
  }
}
    `;

  @Injectable({
    providedIn: 'root'
  })
  export class PayArrearsGQL extends Apollo.Mutation<PayArrearsMutation, PayArrearsMutationVariables> {
    override document = PayArrearsDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }