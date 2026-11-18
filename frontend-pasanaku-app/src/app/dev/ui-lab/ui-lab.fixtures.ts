import type { MoneyAsset } from '@shared/pipes/money.pipe';
import type { PaymentStatus } from '@shared/ui/payment-status-badge/payment-status-badge.component';
import type { TimelineStep } from '@shared/ui/turn-timeline/turn-timeline.component';

/**
 * Datos para el laboratorio de componentes (skill break-ui). SOLO desarrollo.
 * "worst" usa valores reales pero extremos; consérvalo como prueba de regresión.
 */
export type LabDataset = 'demo' | 'worst' | 'empty' | 'one' | 'many';

export interface LabAmountCard {
  label: string;
  amount: string;
  asset: MoneyAsset;
  caption?: string;
}

export interface LabEmptyState {
  title: string;
  message?: string;
  withIcon: boolean;
  actionLabel?: string;
}

export interface LabFixture {
  statuses: PaymentStatus[];
  amountCards: LabAmountCard[];
  emptyStates: LabEmptyState[];
  steps: TimelineStep[];
}

const BOB: MoneyAsset = { code: 'BOB', decimals: 7 };
/** Stellar permite códigos de activo de hasta 12 caracteres. */
const LONG_ASSET: MoneyAsset = { code: 'BOBTESTNET12', decimals: 7 };

const DEMO: LabFixture = {
  statuses: ['PAID', 'PENDING', 'LATE'],
  amountCards: [{ label: 'Fondo de la ronda', amount: '3000.0000000', asset: BOB, caption: '5 de 6 aportes' }],
  emptyStates: [
    {
      title: 'Aún no tienes grupos',
      message: 'Crea un pasanaku o únete con un código.',
      withIcon: true,
      actionLabel: 'Crear grupo',
    },
  ],
  steps: [
    { id: '1', title: 'Rosa Mamani', subtitle: '15 sep', state: 'done' },
    { id: '2', title: 'Jorge Quispe', subtitle: '15 oct', state: 'done' },
    { id: '3', title: 'Carmen Quispe', subtitle: '15 nov', state: 'current' },
    { id: '4', title: 'Ana Quispe Mamani', subtitle: '15 dic', state: 'upcoming', highlight: true },
  ],
};

const WORST: LabFixture = {
  statuses: ['LATE', 'PAID', 'PENDING', 'PAID', 'LATE'],
  amountCards: [
    {
      label: 'Fondo acumulado de la ronda de aportes de noviembre (familia extendida)',
      amount: '1234567890.9900000',
      asset: LONG_ASSET,
      caption: '5 de 6 aportes confirmados en Stellar Testnet · falta Luis Fernando Choque Villarroel',
    },
    { label: 'Cobro', amount: '0', asset: BOB },
    { label: 'Saldo', amount: '-25.5000000', asset: BOB },
    { label: 'Monto inválido de la API', amount: 'NaN', asset: BOB, caption: 'Debe verse vacío, nunca "NaN"' },
  ],
  emptyStates: [
    {
      title: 'Todavía no formas parte de ningún pasanaku de tu familia, tus amigos o tus compañeros de trabajo',
      message:
        'Cuando alguien te invite vas a ver el grupo aquí. También puedes buscar grupos públicos o crear uno nuevo con tus propias reglas: monto, moneda, periodicidad y orden de cobro.',
      withIcon: true,
      actionLabel: 'Unirme con un código de invitación',
    },
    { title: 'Sin resultados', withIcon: false },
  ],
  steps: [
    {
      id: '1',
      title: 'María José de la Cruz y Fernández Villarroel',
      subtitle: '15 de septiembre de 2026',
      state: 'done',
    },
    { id: '2', title: 'Jo', state: 'done' },
    {
      id: '3',
      title: 'Aleksandra Wiśniewska-Kowalczyk',
      subtitle: 'Cobra 1.234.567.890,99 BOBTESTNET12 · vence el 15 de noviembre de 2026',
      state: 'current',
      highlight: true,
    },
    { id: '4', title: 'bartholomew.fitzgerald@northwind-industries-holdings.example.com', state: 'upcoming' },
    { id: '5', title: 'Đặng Thị Ngọc Hân', subtitle: '15 ene', state: 'upcoming' },
    { id: '6', title: 'Seán O’Brien-Ó Súilleabháin <b>&amp;</b>', subtitle: '15 feb', state: 'upcoming' },
  ],
};

const EMPTY: LabFixture = { statuses: [], amountCards: [], emptyStates: [], steps: [] };

const ONE: LabFixture = {
  statuses: ['PENDING'],
  amountCards: [{ label: 'Aporte', amount: '1', asset: BOB }],
  emptyStates: [{ title: 'Sin aportes', withIcon: true }],
  steps: [{ id: '1', title: 'Ana Quispe Mamani', subtitle: '15 dic', state: 'current', highlight: true }],
};

const MANY: LabFixture = {
  ...DEMO,
  steps: Array.from({ length: 120 }, (_, i) => ({
    id: String(i + 1),
    title: `Miembro número ${i + 1}`,
    subtitle: 'Turno mensual',
    state: i < 98 ? 'done' : i === 98 ? 'current' : 'upcoming',
    highlight: i === 110,
  })),
};

export const LAB_FIXTURES: Record<LabDataset, LabFixture> = {
  demo: DEMO,
  worst: WORST,
  empty: EMPTY,
  one: ONE,
  many: MANY,
};
