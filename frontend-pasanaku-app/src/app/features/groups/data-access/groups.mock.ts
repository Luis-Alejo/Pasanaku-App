import type {
  Asset,
  Contribution,
  ContributionStatus,
  Group,
  Member,
  Round,
  TurnSwap,
} from '@core/models/domain.models';

/**
 * Datos de prueba de grupos, aportes e intercambios (se usan con
 * `environment.useMocks`). Fecha de referencia: mediados de noviembre de 2026.
 *
 * Grupos:
 * - Familia Quispe: privado, acuerdo, BOB, en la ronda 3 (hay un aporte
 *   atrasado y un intercambio de turno propuesto a Ana).
 * - Oficina: privado, sorteo, USDC, ronda 1 (Ana tiene el aporte pendiente).
 * - Emprendedores y Útiles escolares: públicos, sumando miembros.
 * - Viaje de promo: ciclo cerrado (historial completo).
 *
 * Las direcciones Stellar y los hashes son inventados: no existen en la red.
 */

export const MOCK_ASSETS = {
  USDC: { code: 'USDC', decimals: 7 },
  BOB: { code: 'BOB', decimals: 7 },
} satisfies Record<string, Asset>;

/** Hash de transacción falso pero estable (64 caracteres hex). */
function mockTxHash(seed: string): string {
  let h = 2166136261;
  let out = '';
  while (out.length < 64) {
    for (const ch of seed + out.length) {
      h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
    }
    out += h.toString(16).padStart(8, '0');
  }
  return out.slice(0, 64);
}

function member(
  id: string,
  userId: string,
  displayName: string,
  walletAddress: string,
  turnNumber: number | null,
  joinedAt: string,
): Member {
  return { id, userId, displayName, walletAddress, turnNumber, joinedAt };
}

/** Aportes de una ronda. `statuses` permite marcar a alguien como pendiente o atrasado. */
function roundContributions(
  groupId: string,
  roundNumber: number,
  memberIds: string[],
  amount: string,
  paidAt: string,
  statuses: Record<string, ContributionStatus> = {},
): Contribution[] {
  return memberIds.map((memberId) => {
    const status = statuses[memberId] ?? 'PAID';
    const id = `${groupId}-r${roundNumber}-${memberId}`;
    return {
      id,
      groupId,
      memberId,
      roundNumber,
      amount,
      status,
      ...(status === 'PAID' ? { paidAt, txHash: mockTxHash(id) } : {}),
    };
  });
}

function paidOutRound(groupId: string, number: number, dueDate: string, recipientMemberId: string): Round {
  return {
    number,
    dueDate,
    recipientMemberId,
    status: 'PAID_OUT',
    payoutTxHash: mockTxHash(`${groupId}-payout-${number}`),
    paidOutAt: dueDate,
  };
}

// ---------------------------------------------------------------------------
// Familia Quispe: privado, acuerdo, BOB, ronda 3 de 6
// ---------------------------------------------------------------------------
const FAMILY_ID = 'group-familia-quispe';
const familyMembers: Member[] = [
  member(
    'm-fam-1',
    'user-rosa',
    'Rosa Mamani',
    'G4X7YXM3HP327AKNBTVU7L7TPOZLOMJAM6HNYK7Y4GWXGW7C5Z7LLP4R',
    1,
    '2026-08-20T14:00:00Z',
  ),
  member(
    'm-fam-2',
    'user-jorge',
    'Jorge Quispe',
    'GHO6PLC4P7LJWT5FWCQCKHQQGGOKF7M7GYYCZEUX46BMD44SK77DYOHL',
    2,
    '2026-08-20T14:05:00Z',
  ),
  member(
    'm-fam-3',
    'user-carmen',
    'Carmen Quispe',
    'GM3OVX72Z5F7CYDNFAJ24QCYWNEZ2OFQWIGMDL7TJPYJA5DP7PT4EEKL',
    3,
    '2026-08-20T15:10:00Z',
  ),
  member(
    'm-fam-4',
    'user-ana',
    'Ana Quispe Mamani',
    'GIPG6TEOBQC6MMJ6LIRGYCVJJLNKZAZTZXBUZ4SKJSGBVHWV7TJEK4RQ',
    4,
    '2026-08-20T15:12:00Z',
  ),
  member(
    'm-fam-5',
    'user-luis',
    'Luis Fernando Choque',
    'G5B4MCMH3ARBKHD7QW2EHRZZHGPYDRNRTJSJAQ5RC2DO2RAZ3ZTIA5P4',
    5,
    '2026-08-21T09:30:00Z',
  ),
  member(
    'm-fam-6',
    'user-maria',
    'María Elena Gutiérrez',
    'GN53E66IFD2CJOAEE25JYJWTYILB3VBQZATRSFZBP3AQIBM44QFJ6WRN',
    6,
    '2026-08-22T18:45:00Z',
  ),
];
const familyIds = familyMembers.map((m) => m.id);

// ---------------------------------------------------------------------------
// Oficina: privado, sorteo, USDC, ronda 1 de 5
// ---------------------------------------------------------------------------
const OFFICE_ID = 'group-oficina';
const officeMembers: Member[] = [
  member(
    'm-ofi-1',
    'user-diego',
    'Diego Rojas',
    'GVTHMBAWJWGJWRC6TZRFOMKABTLVFLH7V6SBFCJNRAMLBMQRJC2TJ2VH',
    1,
    '2026-11-01T13:00:00Z',
  ),
  member(
    'm-ofi-2',
    'user-ana',
    'Ana Quispe Mamani',
    'GIPG6TEOBQC6MMJ6LIRGYCVJJLNKZAZTZXBUZ4SKJSGBVHWV7TJEK4RQ',
    2,
    '2026-11-01T13:20:00Z',
  ),
  member(
    'm-ofi-3',
    'user-valeria',
    'Valeria Flores',
    'GD4HZ2LQ2JYQU4NIFDDFXUKSQ3G5USQ4EM7Z5LR3KYVQ5NH3J4M6DHUY',
    3,
    '2026-11-02T08:15:00Z',
  ),
  member(
    'm-ofi-4',
    'user-marco',
    'Marco Antonio Vargas',
    'GBWI6R2326HWSVGOBLUMNCI6UIQYVNDZMVZ6ELVOOJMIX4JULOTVPWCV',
    4,
    '2026-11-02T10:40:00Z',
  ),
  member(
    'm-ofi-5',
    'user-paola',
    'Paola Céspedes',
    'GORBK7BMQGPFJXEF2VINUBVNHOT4OHEUMXWBIKBDK6WDFNTOVSWPBNWF',
    5,
    '2026-11-03T19:05:00Z',
  ),
];

// ---------------------------------------------------------------------------
// Viaje de promo: privado, acuerdo, BOB, ciclo cerrado (4 de 4)
// ---------------------------------------------------------------------------
const PROMO_ID = 'group-viaje-promo';
const promoMembers: Member[] = [
  member(
    'm-pro-1',
    'user-ana',
    'Ana Quispe Mamani',
    'GIPG6TEOBQC6MMJ6LIRGYCVJJLNKZAZTZXBUZ4SKJSGBVHWV7TJEK4RQ',
    1,
    '2026-02-10T16:00:00Z',
  ),
  member(
    'm-pro-2',
    'user-sofia',
    'Sofía Aguilar',
    'GSFC66HUF5W3D6CJ43HT5EGUKTFBMEQFIT4IQMV2TNRHVSEU3RLJGSJC',
    2,
    '2026-02-10T16:30:00Z',
  ),
  member(
    'm-pro-3',
    'user-daniel',
    'Daniel Torrez',
    'GM5UXAAEH57N2DTJNUWC2OOOQEBH7WMWA6JEZKBG3IJUBL2QI2Y7URF4',
    3,
    '2026-02-11T11:00:00Z',
  ),
  member(
    'm-pro-4',
    'user-jorge',
    'Jorge Quispe',
    'GHO6PLC4P7LJWT5FWCQCKHQQGGOKF7M7GYYCZEUX46BMD44SK77DYOHL',
    4,
    '2026-02-12T20:20:00Z',
  ),
];
const promoIds = promoMembers.map((m) => m.id);

// ---------------------------------------------------------------------------
// Públicos: todavía sumando miembros (sin turnos ni rondas)
// ---------------------------------------------------------------------------
const ENTREPRENEURS_ID = 'group-emprendedores-scz';
const entrepreneurMembers: Member[] = [
  member(
    'm-emp-1',
    'user-rodrigo',
    'Rodrigo Suárez',
    'GVTHMBAWJWGJWRC6TZRFOMKABTLVFLH7V6SBFCJNRAMLBMQRJC2TJ2VH',
    null,
    '2026-11-05T12:00:00Z',
  ),
  member(
    'm-emp-2',
    'user-gabriela',
    'Gabriela Antelo',
    'GD4HZ2LQ2JYQU4NIFDDFXUKSQ3G5USQ4EM7Z5LR3KYVQ5NH3J4M6DHUY',
    null,
    '2026-11-06T09:10:00Z',
  ),
  member(
    'm-emp-3',
    'user-ernesto',
    'Ernesto Justiniano',
    'GBWI6R2326HWSVGOBLUMNCI6UIQYVNDZMVZ6ELVOOJMIX4JULOTVPWCV',
    null,
    '2026-11-08T17:25:00Z',
  ),
  member(
    'm-emp-4',
    'user-lucia',
    'Lucía Paz',
    'GORBK7BMQGPFJXEF2VINUBVNHOT4OHEUMXWBIKBDK6WDFNTOVSWPBNWF',
    null,
    '2026-11-10T21:00:00Z',
  ),
  member(
    'm-emp-5',
    'user-hugo',
    'Hugo Cuéllar',
    'GSFC66HUF5W3D6CJ43HT5EGUKTFBMEQFIT4IQMV2TNRHVSEU3RLJGSJC',
    null,
    '2026-11-12T08:45:00Z',
  ),
  member(
    'm-emp-6',
    'user-natalia',
    'Natalia Ribera',
    'GM5UXAAEH57N2DTJNUWC2OOOQEBH7WMWA6JEZKBG3IJUBL2QI2Y7URF4',
    null,
    '2026-11-14T14:30:00Z',
  ),
];

const SCHOOL_ID = 'group-utiles-escolares';
const schoolMembers: Member[] = [
  member(
    'm-esc-1',
    'user-patricia',
    'Patricia Rocha',
    'G4X7YXM3HP327AKNBTVU7L7TPOZLOMJAM6HNYK7Y4GWXGW7C5Z7LLP4R',
    null,
    '2026-11-09T10:00:00Z',
  ),
  member(
    'm-esc-2',
    'user-wilson',
    'Wilson Calle',
    'GHO6PLC4P7LJWT5FWCQCKHQQGGOKF7M7GYYCZEUX46BMD44SK77DYOHL',
    null,
    '2026-11-11T15:30:00Z',
  ),
  member(
    'm-esc-3',
    'user-veronica',
    'Verónica Limachi',
    'GM3OVX72Z5F7CYDNFAJ24QCYWNEZ2OFQWIGMDL7TJPYJA5DP7PT4EEKL',
    null,
    '2026-11-15T19:15:00Z',
  ),
];

export const MOCK_GROUPS: Group[] = [
  {
    id: FAMILY_ID,
    name: 'Pasanaku familia Quispe',
    contributionAmount: '500.0000000',
    asset: MOCK_ASSETS.BOB,
    periodicity: 'MONTHLY',
    memberCount: 6,
    visibility: 'PRIVATE',
    turnMode: 'AGREEMENT',
    status: 'ACTIVE',
    inviteCode: 'QUISPE26',
    members: familyMembers,
    currentRound: 3,
    createdAt: '2026-08-20T14:00:00Z',
    rounds: [
      paidOutRound(FAMILY_ID, 1, '2026-09-15', 'm-fam-1'),
      paidOutRound(FAMILY_ID, 2, '2026-10-15', 'm-fam-2'),
      { number: 3, dueDate: '2026-11-15', recipientMemberId: 'm-fam-3', status: 'OPEN' },
      { number: 4, dueDate: '2026-12-15', recipientMemberId: 'm-fam-4', status: 'UPCOMING' },
      { number: 5, dueDate: '2027-01-15', recipientMemberId: 'm-fam-5', status: 'UPCOMING' },
      { number: 6, dueDate: '2027-02-15', recipientMemberId: 'm-fam-6', status: 'UPCOMING' },
    ],
  },
  {
    id: OFFICE_ID,
    name: 'Ahorro compañeros de oficina',
    contributionAmount: '50.0000000',
    asset: MOCK_ASSETS.USDC,
    periodicity: 'BIWEEKLY',
    memberCount: 5,
    visibility: 'PRIVATE',
    turnMode: 'DRAW',
    status: 'ACTIVE',
    inviteCode: 'OFI7K2',
    members: officeMembers,
    currentRound: 1,
    createdAt: '2026-11-01T13:00:00Z',
    rounds: [
      { number: 1, dueDate: '2026-11-30', recipientMemberId: 'm-ofi-1', status: 'OPEN' },
      { number: 2, dueDate: '2026-12-14', recipientMemberId: 'm-ofi-2', status: 'UPCOMING' },
      { number: 3, dueDate: '2026-12-28', recipientMemberId: 'm-ofi-3', status: 'UPCOMING' },
      { number: 4, dueDate: '2027-01-11', recipientMemberId: 'm-ofi-4', status: 'UPCOMING' },
      { number: 5, dueDate: '2027-01-25', recipientMemberId: 'm-ofi-5', status: 'UPCOMING' },
    ],
  },
  {
    id: ENTREPRENEURS_ID,
    name: 'Pasanaku emprendedores Santa Cruz',
    contributionAmount: '25.0000000',
    asset: MOCK_ASSETS.USDC,
    periodicity: 'MONTHLY',
    memberCount: 10,
    visibility: 'PUBLIC',
    turnMode: 'DRAW',
    status: 'FORMING',
    members: entrepreneurMembers,
    currentRound: null,
    createdAt: '2026-11-05T12:00:00Z',
    rounds: [],
  },
  {
    id: SCHOOL_ID,
    name: 'Ahorro para útiles escolares',
    contributionAmount: '150.0000000',
    asset: MOCK_ASSETS.BOB,
    periodicity: 'BIWEEKLY',
    memberCount: 8,
    visibility: 'PUBLIC',
    turnMode: 'AGREEMENT',
    status: 'FORMING',
    members: schoolMembers,
    currentRound: null,
    createdAt: '2026-11-09T10:00:00Z',
    rounds: [],
  },
  {
    id: PROMO_ID,
    name: 'Viaje de promo 2025',
    contributionAmount: '200.0000000',
    asset: MOCK_ASSETS.BOB,
    periodicity: 'MONTHLY',
    memberCount: 4,
    visibility: 'PRIVATE',
    turnMode: 'AGREEMENT',
    status: 'COMPLETED',
    inviteCode: 'PROMO25',
    members: promoMembers,
    currentRound: null,
    createdAt: '2026-02-10T16:00:00Z',
    rounds: [
      paidOutRound(PROMO_ID, 1, '2026-03-10', 'm-pro-1'),
      paidOutRound(PROMO_ID, 2, '2026-04-10', 'm-pro-2'),
      paidOutRound(PROMO_ID, 3, '2026-05-10', 'm-pro-3'),
      paidOutRound(PROMO_ID, 4, '2026-06-10', 'm-pro-4'),
    ],
  },
];

export const MOCK_CONTRIBUTIONS: Contribution[] = [
  // Familia Quispe: rondas 1 y 2 completas; en la 3 Luis está atrasado.
  ...roundContributions(FAMILY_ID, 1, familyIds, '500.0000000', '2026-09-12T20:00:00Z'),
  ...roundContributions(FAMILY_ID, 2, familyIds, '500.0000000', '2026-10-13T18:30:00Z'),
  ...roundContributions(FAMILY_ID, 3, familyIds, '500.0000000', '2026-11-14T21:10:00Z', {
    'm-fam-5': 'LATE',
  }),
  // Oficina: ronda 1 abierta; Ana y Marco todavía no aportaron.
  ...roundContributions(
    OFFICE_ID,
    1,
    officeMembers.map((m) => m.id),
    '50.0000000',
    '2026-11-16T12:00:00Z',
    {
      'm-ofi-2': 'PENDING',
      'm-ofi-4': 'PENDING',
    },
  ),
  // Viaje de promo: ciclo completo.
  ...roundContributions(PROMO_ID, 1, promoIds, '200.0000000', '2026-03-08T19:00:00Z'),
  ...roundContributions(PROMO_ID, 2, promoIds, '200.0000000', '2026-04-07T19:00:00Z'),
  ...roundContributions(PROMO_ID, 3, promoIds, '200.0000000', '2026-05-09T19:00:00Z'),
  ...roundContributions(PROMO_ID, 4, promoIds, '200.0000000', '2026-06-08T19:00:00Z'),
];

export const MOCK_TURN_SWAPS: TurnSwap[] = [
  {
    // Antes de empezar, Luis (turno 6) y María (turno 5) se cambiaron.
    id: 'swap-fam-1',
    groupId: FAMILY_ID,
    fromMemberId: 'm-fam-5',
    toMemberId: 'm-fam-6',
    fromTurn: 6,
    toTurn: 5,
    status: 'ACCEPTED',
    createdAt: '2026-08-25T10:00:00Z',
    respondedAt: '2026-08-25T19:30:00Z',
  },
  {
    // Pendiente de respuesta: María (turno 6) le propone a Ana (turno 4) cambiar.
    id: 'swap-fam-2',
    groupId: FAMILY_ID,
    fromMemberId: 'm-fam-6',
    toMemberId: 'm-fam-4',
    fromTurn: 6,
    toTurn: 4,
    status: 'PROPOSED',
    createdAt: '2026-11-16T22:15:00Z',
  },
];
