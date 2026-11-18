import type { MoneyAsset } from '@shared/pipes/money.pipe';
import type { AmountOption } from '@shared/ui/amount-options/amount-options.component';
import type { EmptyStateIllustration } from '@shared/ui/empty-state/empty-state.component';
import type { PaymentStatus } from '@shared/ui/payment-status-badge/payment-status-badge.component';
import type { QuickAction } from '@shared/ui/quick-actions/quick-actions.component';
import type { TimelineStep } from '@shared/ui/turn-timeline/turn-timeline.component';
import { addCircleOutline, peopleOutline, receiptOutline, shuffleOutline, walletOutline } from 'ionicons/icons';

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
  meta?: string;
}

export interface LabEmptyState {
  title: string;
  message?: string;
  withIcon: boolean;
  illustration?: EmptyStateIllustration;
  actionLabel?: string;
}

export interface LabInfoRow {
  label: string;
  value: string;
  brand?: boolean;
}

export interface LabFixture {
  greeting: string;
  statuses: PaymentStatus[];
  amountCards: LabAmountCard[];
  emptyStates: LabEmptyState[];
  steps: TimelineStep[];
  actions: QuickAction[];
  amountOptions: AmountOption[];
  infoRows: LabInfoRow[];
  avatars: string[];
}

const BOB: MoneyAsset = { code: 'BOB', decimals: 7 };
/** Stellar permite códigos de activo de hasta 12 caracteres. */
const LONG_ASSET: MoneyAsset = { code: 'BOBTESTNET12', decimals: 7 };

const DEMO_ACTIONS: QuickAction[] = [
  { id: 'pay', label: 'Aportar', icon: walletOutline, accent: 'indigo' },
  { id: 'turns', label: 'Turnos', icon: shuffleOutline, accent: 'teal' },
  { id: 'invite', label: 'Invitar', icon: addCircleOutline, accent: 'orange' },
  { id: 'history', label: 'Historial', icon: receiptOutline, accent: 'blue' },
];

const DEMO: LabFixture = {
  greeting: 'Hola, Ana',
  statuses: ['PAID', 'PENDING', 'LATE'],
  amountCards: [
    { label: 'Fondo de la ronda', amount: '3000.0000000', asset: BOB, caption: '5 de 6 aportes', meta: 'Ronda 3 de 6' },
  ],
  emptyStates: [
    {
      title: 'Aún no tienes grupos',
      message: 'Crea un pasanaku o únete con un código.',
      withIcon: true,
      illustration: 'ahorro-colectivo',
      actionLabel: 'Crear grupo',
    },
  ],
  steps: [
    { id: '1', title: 'Rosa Mamani', subtitle: '15 sep', state: 'done', avatarName: 'Rosa Mamani' },
    { id: '2', title: 'Jorge Quispe', subtitle: '15 oct', state: 'done', avatarName: 'Jorge Quispe' },
    { id: '3', title: 'Carmen Quispe', subtitle: '15 nov', state: 'current', avatarName: 'Carmen Quispe' },
    {
      id: '4',
      title: 'Ana Quispe Mamani',
      subtitle: '15 dic',
      state: 'upcoming',
      highlight: true,
      avatarName: 'Ana Quispe Mamani',
    },
  ],
  actions: DEMO_ACTIONS,
  amountOptions: [
    { value: '50', label: '50' },
    { value: '100', label: '100' },
    { value: '200', label: '200' },
    { value: '500', label: '500' },
  ],
  infoRows: [
    { label: 'Aporte', value: '500,00 BOB', brand: true },
    { label: 'Periodicidad', value: 'Mensual' },
  ],
  avatars: ['Ana Quispe Mamani', 'Jorge Quispe'],
};

const WORST: LabFixture = {
  greeting: 'Hola, Aleksandra Wiśniewska-Kowalczyk',
  statuses: ['LATE', 'PAID', 'PENDING', 'PAID', 'LATE'],
  amountCards: [
    {
      label: 'Fondo acumulado de la ronda de aportes de noviembre (familia extendida)',
      amount: '1234567890.9900000',
      asset: LONG_ASSET,
      caption: '5 de 6 aportes confirmados en Stellar Testnet · falta Luis Fernando Choque Villarroel',
      meta: 'Ronda 18 de 20',
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
      illustration: 'billetera',
      actionLabel: 'Unirme con un código de invitación',
    },
    { title: 'Sin resultados', withIcon: false },
    { title: 'Sin movimientos', withIcon: true },
  ],
  steps: [
    {
      id: '1',
      title: 'María José de la Cruz y Fernández Villarroel',
      subtitle: '15 de septiembre de 2026',
      state: 'done',
      avatarName: 'María José de la Cruz y Fernández Villarroel',
    },
    { id: '2', title: 'Jo', state: 'done', avatarName: 'Jo' },
    {
      id: '3',
      title: 'Aleksandra Wiśniewska-Kowalczyk',
      subtitle: 'Cobra 1.234.567.890,99 BOBTESTNET12 · vence el 15 de noviembre de 2026',
      state: 'current',
      highlight: true,
      avatarName: 'Aleksandra Wiśniewska-Kowalczyk',
    },
    {
      id: '4',
      title: 'bartholomew.fitzgerald@northwind-industries-holdings.example.com',
      state: 'upcoming',
      avatarName: 'bartholomew.fitzgerald@northwind-industries-holdings.example.com',
    },
    { id: '5', title: 'Đặng Thị Ngọc Hân', subtitle: '15 ene', state: 'upcoming', avatarName: 'Đặng Thị Ngọc Hân' },
    { id: '6', title: '👩🏽‍💻 Priya', subtitle: '15 feb', state: 'upcoming', avatarName: '👩🏽‍💻 Priya' },
    { id: '7', title: 'Seán O’Brien-Ó Súilleabháin <b>&amp;</b>', subtitle: '15 mar', state: 'upcoming' },
  ],
  actions: [
    { id: 'pay', label: 'Aportar mi cuota atrasada de la ronda', icon: walletOutline, accent: 'indigo', badge: 1 },
    { id: 'turns', label: 'Intercambiar turnos', icon: shuffleOutline, accent: 'teal', badge: 120 },
    { id: 'invite', label: 'Invitar', icon: addCircleOutline, accent: 'orange' },
    { id: 'history', label: 'Historial verificable en Stellar', icon: receiptOutline, accent: 'blue' },
    { id: 'members', label: 'Miembros', icon: peopleOutline, accent: 'pink' },
  ],
  amountOptions: [
    { value: '1', label: '1' },
    { value: '1000000', label: '1.000.000' },
    { value: '99999.99', label: '99.999,99 BOBTESTNET12' },
    { value: 'other', label: 'Otro' },
  ],
  infoRows: [
    { label: 'Código de invitación', value: 'QUISPE26', brand: true },
    {
      label: 'Fondo acumulado de la ronda de aportes',
      value: '1.234.567.890,99 BOBTESTNET12 · Mensual',
      brand: true,
    },
    { label: 'Miembros', value: '20 de 20 miembros · Público' },
  ],
  avatars: ['María José de la Cruz y Fernández', 'Jo', '👩🏽‍💻 Priya', 'Ólafur Darri Ólafsson', ''],
};

const EMPTY: LabFixture = {
  greeting: 'Hola,',
  statuses: [],
  amountCards: [],
  emptyStates: [],
  steps: [],
  actions: [],
  amountOptions: [],
  infoRows: [],
  avatars: [],
};

const ONE: LabFixture = {
  greeting: 'Hola, Jo',
  statuses: ['PENDING'],
  amountCards: [{ label: 'Aporte', amount: '1', asset: BOB }],
  emptyStates: [{ title: 'Sin aportes', withIcon: true, illustration: 'alcancia' }],
  steps: [
    {
      id: '1',
      title: 'Ana Quispe Mamani',
      subtitle: '15 dic',
      state: 'current',
      highlight: true,
      avatarName: 'Ana Quispe Mamani',
    },
  ],
  actions: [DEMO_ACTIONS[0]],
  amountOptions: [{ value: '100', label: '100' }],
  infoRows: [{ label: 'Aporte', value: '1,00 BOB', brand: true }],
  avatars: ['Ana'],
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
