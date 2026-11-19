import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { SorobanContractError } from '../blockchain/index.js';

type ExceptionCtor = new (message: string) => HttpException;

// Códigos de PasanakuContract (sección 5 del contexto).
const PASANAKU_ERRORS: Record<number, [ExceptionCtor, string]> = {
  3: [
    ForbiddenException,
    'Operación no autorizada por el contrato (permisos o reputación insuficiente).',
  ],
  4: [BadRequestException, 'Monto inválido.'],
  7: [ConflictException, 'El grupo ya no está abierto.'],
  8: [ConflictException, 'El grupo no está activo.'],
  9: [ConflictException, 'El grupo está lleno.'],
  10: [ForbiddenException, 'No tienes invitación para este grupo.'],
  11: [ConflictException, 'Ya eres miembro de este grupo.'],
  12: [ForbiddenException, 'No eres miembro de este grupo.'],
  13: [BadRequestException, 'Orden de turnos inválido.'],
  14: [BadRequestException, 'Se necesitan al menos 2 miembros.'],
  15: [ConflictException, 'Ya pagaste esta ronda.'],
  16: [BadRequestException, 'El período de gracia ya terminó.'],
  17: [ConflictException, 'Todavía no termina el período de gracia.'],
  18: [ConflictException, 'Estado inválido para esta operación.'],
  20: [NotFoundException, 'Deuda no encontrada.'],
  21: [BadRequestException, 'El monto excede la deuda pendiente.'],
  23: [
    BadRequestException,
    'Reputación insuficiente para ocupar los primeros turnos.',
  ],
};

export function chainErrorCode(err: unknown): number | null {
  return err instanceof SorobanContractError && err.contract === 'pasanaku'
    ? Number(err.code)
    : null;
}

/** Ejecuta una llamada on-chain traduciendo errores conocidos del contrato a excepciones HTTP/GraphQL. */
export async function chainCall<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const code = chainErrorCode(err);
    const entry = code === null ? undefined : PASANAKU_ERRORS[code];
    if (entry) throw new entry[0](entry[1]);
    throw err;
  }
}
