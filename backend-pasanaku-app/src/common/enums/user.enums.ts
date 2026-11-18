import { registerEnumType } from '@nestjs/graphql';

export enum KycStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export enum ReferenceRelationship {
  FAMILIAR = 'FAMILIAR',
  AMIGO = 'AMIGO',
  COLEGA = 'COLEGA',
  OTRO = 'OTRO',
}

export enum ReferenceStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  REVOKED = 'REVOKED',
}

registerEnumType(KycStatus, { name: 'KycStatus' });
registerEnumType(ReferenceRelationship, { name: 'ReferenceRelationship' });
registerEnumType(ReferenceStatus, { name: 'ReferenceStatus' });
