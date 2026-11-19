/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { gql } from 'apollo-angular';
import { Injectable } from '@angular/core';
import * as Apollo from 'apollo-angular';
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