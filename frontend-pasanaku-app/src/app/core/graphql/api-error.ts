import { CombinedGraphQLErrors } from '@apollo/client';

export type ApiErrorKind =
  'unauthenticated' | 'forbidden' | 'not-found' | 'conflict' | 'invalid' | 'network' | 'unknown';

/** Error de la API ya traducido: `message` se puede mostrar a la persona. */
export class ApiError extends Error {
  constructor(
    readonly kind: ApiErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const NETWORK_ERROR_MESSAGE = 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
export const UNKNOWN_ERROR_MESSAGE = 'Algo salió mal. Inténtalo de nuevo.';

const KIND_BY_STATUS: Record<number, ApiErrorKind> = {
  400: 'invalid',
  401: 'unauthenticated',
  403: 'forbidden',
  404: 'not-found',
  409: 'conflict',
};

const KIND_BY_CODE: Record<string, ApiErrorKind> = {
  BAD_REQUEST: 'invalid',
  BAD_USER_INPUT: 'invalid',
  UNAUTHENTICATED: 'unauthenticated',
  FORBIDDEN: 'forbidden',
  NOT_FOUND: 'not-found',
  CONFLICT: 'conflict',
};

interface NestOriginalError {
  statusCode?: number;
  message?: string | string[];
}

/** Convierte lo que devuelve Apollo/NestJS en un `ApiError`. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  if (!CombinedGraphQLErrors.is(error)) {
    return new ApiError('network', NETWORK_ERROR_MESSAGE);
  }
  const first = error.errors[0];
  const extensions = first?.extensions ?? {};
  const original = (extensions['originalError'] ?? {}) as NestOriginalError;
  const kind = KIND_BY_STATUS[original.statusCode ?? 0] ?? KIND_BY_CODE[String(extensions['code'] ?? '')] ?? 'unknown';
  if (kind === 'unknown') {
    return new ApiError('unknown', UNKNOWN_ERROR_MESSAGE);
  }
  const message = Array.isArray(original.message) ? original.message[0] : original.message;
  return new ApiError(kind, message ?? first?.message ?? UNKNOWN_ERROR_MESSAGE);
}
