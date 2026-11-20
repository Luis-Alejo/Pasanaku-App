import type { User } from '@core/models/domain.models';

/**
 * Usuario con sesión iniciada en modo de datos de prueba (`useMocks`).
 * Es miembro de varios grupos en `groups.mock.ts` (userId "user-ana").
 */
export const MOCK_CURRENT_USER: User = {
  id: 'user-ana',
  displayName: 'Ana María',
  phone: '+59170000000',
  email: 'ana@example.com',
  walletAddress: 'GIPG6TEOBQC6MMJ6LIRGYCVJJLNKZAZTZXBUZ4SKJSGBVHWV7TJEK4RQ',
  kycStatus: 'VERIFIED',
  reputation: 120,
  completedGroups: 2,
  defaultCount: 0,
};
