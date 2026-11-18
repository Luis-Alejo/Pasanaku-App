import { Injectable } from '@angular/core';
import type { Contribution, Group } from '@core/models/domain.models';
import { environment } from '@env/environment';

import { MOCK_CONTRIBUTIONS, MOCK_GROUPS } from './groups.mock';

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
  /** Aportes de un grupo (todas las rondas). */
  abstract getContributions(groupId: string): Promise<Contribution[]>;
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

const isMember = (group: Group, userId: string) => group.members.some((m) => m.userId === userId);

export class MockGroupsApi extends GroupsApi {
  getMyGroups(userId: string): Promise<Group[]> {
    return delay(MOCK_GROUPS.filter((g) => isMember(g, userId)));
  }

  getPublicGroups(userId: string): Promise<Group[]> {
    return delay(
      MOCK_GROUPS.filter(
        (g) =>
          g.visibility === 'PUBLIC' &&
          g.status === 'FORMING' &&
          g.members.length < g.memberCount &&
          !isMember(g, userId),
      ),
    );
  }

  getGroup(id: string): Promise<Group | null> {
    return delay(MOCK_GROUPS.find((g) => g.id === id) ?? null);
  }

  getContributions(groupId: string): Promise<Contribution[]> {
    return delay(MOCK_CONTRIBUTIONS.filter((c) => c.groupId === groupId));
  }
}
