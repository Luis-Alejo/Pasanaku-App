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

export type Frequency =
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'WEEKLY';

export type GroupStatus =
  | 'ACTIVE'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'OPEN';

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

export type GroupDetailFieldsFragment = { id: string, name: string, creatorId: string, contributionStroops: string, frequency: Frequency, maxParticipants: number, memberCount: number, isPublic: boolean, status: GroupStatus, currentRound: number, roundDurationSeconds: number, createdAt: string, members: Array<{ id: string, userId: string, fullName: string, initialTurnOrder: number, currentQueuePosition: number, hasReceivedPayout: boolean, joinedAt: string }>, rounds: Array<{ id: string, roundNumber: number, deadline: string, isSettled: boolean, beneficiaryMemberId: string | null, settleTxHash: string | null, settledAt: string | null, payments: Array<{ id: string, memberId: string, status: RoundPaymentStatus, paidAt: string | null }> }> };

export type MyGroupsQueryVariables = Exact<{ [key: string]: never; }>;


export type MyGroupsQuery = { myGroups: Array<{ id: string, name: string, creatorId: string, contributionStroops: string, frequency: Frequency, maxParticipants: number, memberCount: number, isPublic: boolean, status: GroupStatus, currentRound: number, roundDurationSeconds: number, createdAt: string }> };

export type PublicGroupsQueryVariables = Exact<{ [key: string]: never; }>;


export type PublicGroupsQuery = { publicGroups: Array<{ id: string, name: string, creatorId: string, contributionStroops: string, frequency: Frequency, maxParticipants: number, memberCount: number, isPublic: boolean, status: GroupStatus, currentRound: number, roundDurationSeconds: number, createdAt: string }> };

export type GroupDetailQueryVariables = Exact<{
  groupId: string | number;
}>;


export type GroupDetailQuery = { groupDetail: { id: string, name: string, creatorId: string, contributionStroops: string, frequency: Frequency, maxParticipants: number, memberCount: number, isPublic: boolean, status: GroupStatus, currentRound: number, roundDurationSeconds: number, createdAt: string, members: Array<{ id: string, userId: string, fullName: string, initialTurnOrder: number, currentQueuePosition: number, hasReceivedPayout: boolean, joinedAt: string }>, rounds: Array<{ id: string, roundNumber: number, deadline: string, isSettled: boolean, beneficiaryMemberId: string | null, settleTxHash: string | null, settledAt: string | null, payments: Array<{ id: string, memberId: string, status: RoundPaymentStatus, paidAt: string | null }> }> } };

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
    }
  }
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