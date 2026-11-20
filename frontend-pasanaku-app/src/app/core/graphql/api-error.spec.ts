import { CombinedGraphQLErrors } from '@apollo/client';

import { ApiError, NETWORK_ERROR_MESSAGE, toApiError } from './api-error';

const graphqlError = (extensions: Record<string, unknown>, message = 'Mensaje') =>
  new CombinedGraphQLErrors({ errors: [{ message, extensions }] });

describe('toApiError', () => {
  it('usa el estado y el mensaje original de NestJS', () => {
    const error = toApiError(
      graphqlError({
        code: 'INTERNAL_SERVER_ERROR',
        originalError: { statusCode: 409, message: 'Este celular ya está registrado' },
      }),
    );
    expect(error.kind).toBe('conflict');
    expect(error.message).toBe('Este celular ya está registrado');
  });

  it('toma el primer mensaje de los errores de validación', () => {
    const error = toApiError(
      graphqlError({ originalError: { statusCode: 400, message: ['Celular inválido', 'Otro'] } }),
    );
    expect(error.kind).toBe('invalid');
    expect(error.message).toBe('Celular inválido');
  });

  it('reconoce la sesión vencida por su código', () => {
    expect(toApiError(graphqlError({ code: 'UNAUTHENTICATED' })).kind).toBe('unauthenticated');
  });

  it('no muestra los errores internos del servidor', () => {
    const error = toApiError(graphqlError({ code: 'INTERNAL_SERVER_ERROR' }, 'relation users does not exist'));
    expect(error.kind).toBe('unknown');
    expect(error.message).not.toContain('relation');
  });

  it('trata lo demás como un problema de conexión', () => {
    const error = toApiError(new TypeError('Failed to fetch'));
    expect(error.kind).toBe('network');
    expect(error.message).toBe(NETWORK_ERROR_MESSAGE);
  });

  it('respeta un ApiError ya traducido', () => {
    const original = new ApiError('forbidden', 'No');
    expect(toApiError(original)).toBe(original);
  });
});
