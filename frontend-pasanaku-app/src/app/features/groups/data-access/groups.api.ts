import { Injectable } from '@angular/core';
import type { Asset, Contribution, CreateGroupInput, Group, User } from '@core/models/domain.models';
import { JoinGroupError } from '@core/models/domain.models';
import { environment } from '@env/environment';

import { MOCK_ASSETS, MOCK_CONTRIBUTIONS, MOCK_GROUPS } from './groups.mock';

/**
 * De dónde salen los datos de grupos. El store solo conoce esta interfaz:
 * hoy se usa la versión mock; en el paso 9 se agrega la de GraphQL y se elige
 * con `environment.useMocks`, sin tocar el store ni las pantallas.
 */
@Injectable({ providedIn: 'root', useFactory: createGroupsApi })
export abstract class GroupsApi {
  /** Grupos donde el usuario es miembro. */
  abstract getMyGroups(userId: string): Promise<Group[]>;
  /** Grupos públicos que todavía aceptan miembros (y donde el usuario no está). */
  abstract getPublicGroups(userId: string): Promise<Group[]>;
  /** Un grupo por id, o null si no existe. */
  abstract getGroup(id: string): Promise<Group | null>;
  /** Un grupo por su código de invitación (sin distinguir mayúsculas), o null. */
  abstract getGroupByCode(code: string): Promise<Group | null>;
  /** Aportes de un grupo (todas las rondas). */
  abstract getContributions(groupId: string): Promise<Contribution[]>;
  /** Monedas disponibles para los aportes (código y decimales vienen de aquí). */
  abstract getAssets(): Promise<Asset[]>;
  /** Crea un grupo con el usuario como primer miembro. */
  abstract createGroup(input: CreateGroupInput, user: User): Promise<Group>;
  /** Une al usuario al grupo. Falla con `JoinGroupError` si no se puede. */
  abstract joinGroup(groupId: string, user: User): Promise<Group>;
}

function createGroupsApi(): GroupsApi {
  if (environment.useMocks) {
    return new MockGroupsApi();
  }
  // Paso 9: devolver aquí la implementación GraphQL.
  throw new Error('GroupsApi: falta la implementación GraphQL (paso 9). Activa useMocks.');
}

/** Demora simulada para que los estados de carga se vean como con la API real. */
const MOCK_DELAY_MS = 300;

function delay<T>(value: T): Promise<T> {
  // structuredClone: las pantallas nunca reciben (ni modifican) los objetos del mock.
  return new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), MOCK_DELAY_MS));
}

function fail(error: Error): Promise<never> {
  return new Promise((_, reject) => setTimeout(() => reject(error), MOCK_DELAY_MS));
}

const isMember = (group: Group, userId: string) => group.members.some((m) => m.userId === userId);

/** Sin 0/O ni 1/I/L, para que el código se pueda dictar sin confusiones. */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Implementación en memoria: los grupos creados y las uniones duran hasta
 * recargar la página. Es una sola instancia para toda la app (providedIn root).
 */
export class MockGroupsApi extends GroupsApi {
  private readonly groups: Group[] = structuredClone(MOCK_GROUPS);
  private readonly contributions: Contribution[] = structuredClone(MOCK_CONTRIBUTIONS);
  private readonly assets: Asset[] = Object.values(MOCK_ASSETS);
  private nextId = 1;

  getMyGroups(userId: string): Promise<Group[]> {
    return delay(this.groups.filter((g) => isMember(g, userId)));
  }

  getPublicGroups(userId: string): Promise<Group[]> {
    return delay(
      this.groups.filter(
        (g) =>
          g.visibility === 'PUBLIC' &&
          g.status === 'FORMING' &&
          g.members.length < g.memberCount &&
          !isMember(g, userId),
      ),
    );
  }

  getGroup(id: string): Promise<Group | null> {
    return delay(this.groups.find((g) => g.id === id) ?? null);
  }

  getGroupByCode(code: string): Promise<Group | null> {
    const wanted = code.trim().toUpperCase();
    return delay(this.groups.find((g) => g.inviteCode?.toUpperCase() === wanted) ?? null);
  }

  getContributions(groupId: string): Promise<Contribution[]> {
    return delay(this.contributions.filter((c) => c.groupId === groupId));
  }

  getAssets(): Promise<Asset[]> {
    return delay(this.assets);
  }

  createGroup(input: CreateGroupInput, user: User): Promise<Group> {
    const asset = this.assets.find((a) => a.code === input.assetCode);
    if (!asset) {
      return fail(new Error(`Moneda desconocida: ${input.assetCode}`));
    }
    const now = new Date().toISOString();
    const id = `group-new-${this.nextId++}`;
    const group: Group = {
      id,
      name: input.name.trim(),
      contributionAmount: input.contributionAmount,
      asset,
      periodicity: input.periodicity,
      memberCount: input.memberCount,
      visibility: input.visibility,
      turnMode: input.turnMode,
      status: 'FORMING',
      inviteCode: input.visibility === 'PRIVATE' ? this.newInviteCode() : undefined,
      members: [
        {
          id: `${id}-m1`,
          userId: user.id,
          displayName: user.displayName,
          walletAddress: user.walletAddress,
          turnNumber: null,
          joinedAt: now,
        },
      ],
      rounds: [],
      currentRound: null,
      createdAt: now,
    };
    this.groups.unshift(group);
    return delay(group);
  }

  joinGroup(groupId: string, user: User): Promise<Group> {
    const group = this.groups.find((g) => g.id === groupId);
    if (!group) {
      return fail(new JoinGroupError('NOT_FOUND'));
    }
    if (isMember(group, user.id)) {
      return fail(new JoinGroupError('ALREADY_MEMBER'));
    }
    if (group.status !== 'FORMING') {
      return fail(new JoinGroupError('CLOSED'));
    }
    if (group.members.length >= group.memberCount) {
      return fail(new JoinGroupError('FULL'));
    }
    group.members.push({
      id: `${group.id}-m${group.members.length + 1}`,
      userId: user.id,
      displayName: user.displayName,
      walletAddress: user.walletAddress,
      turnNumber: null,
      joinedAt: new Date().toISOString(),
    });
    // Grupo completo: pasa a la asignación de turnos (paso 6).
    if (group.members.length === group.memberCount) {
      group.status = 'ASSIGNING_TURNS';
    }
    return delay(group);
  }

  private newInviteCode(): string {
    let code: string;
    do {
      code = Array.from(
        crypto.getRandomValues(new Uint32Array(6)),
        (n) => CODE_ALPHABET[n % CODE_ALPHABET.length],
      ).join('');
    } while (this.groups.some((g) => g.inviteCode === code));
    return code;
  }
}
