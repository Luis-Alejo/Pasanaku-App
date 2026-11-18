import type { User } from '@core/models/domain.models';

/**
 * Usuario con sesión iniciada mientras no exista autenticación real (paso 10).
 * Es miembro de varios grupos en `groups.mock.ts` (userId "user-ana").
 */
export const MOCK_CURRENT_USER: User = {
  id: 'user-ana',
  displayName: 'Ana Quispe Mamani',
  email: 'ana.quispe@example.com',
  walletAddress: 'GIPG6TEOBQC6MMJ6LIRGYCVJJLNKZAZTZXBUZ4SKJSGBVHWV7TJEK4RQ',
};
