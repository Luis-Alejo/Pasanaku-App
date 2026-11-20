import { Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MOCK_GROUPS } from '@core/data/groups.mock';
import type { Group } from '@core/models/domain.models';
import { GroupCardComponent } from '@features/groups/components/group-card/group-card.component';
import { IonButton, IonContent } from '@ionic/angular';
import { AmountCardComponent } from '@shared/ui/amount-card/amount-card.component';
import { AmountOptionsComponent } from '@shared/ui/amount-options/amount-options.component';
import { AvatarComponent } from '@shared/ui/avatar/avatar.component';
import { BrandHeaderComponent } from '@shared/ui/brand-header/brand-header.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { InfoRowComponent } from '@shared/ui/info-row/info-row.component';
import { PaymentStatusBadgeComponent } from '@shared/ui/payment-status-badge/payment-status-badge.component';
import { QuickActionsComponent } from '@shared/ui/quick-actions/quick-actions.component';
import { TurnTimelineComponent } from '@shared/ui/turn-timeline/turn-timeline.component';
import { peopleOutline } from 'ionicons/icons';

import type { LabDataset } from './ui-lab.fixtures';
import { LAB_FIXTURES } from './ui-lab.fixtures';

const FAMILY = MOCK_GROUPS.find((g) => g.id === 'group-familia') as Group;
const WORST_GROUP: Group = {
  ...FAMILY,
  id: 'lab-worst',
  name: 'Pasanaku intergeneracional de la familia, los vecinos y los amigos del barrio',
  contributionAmount: '99999.9900000',
  asset: { code: 'BOBTESTNET12', decimals: 7 },
  status: 'ASSIGNING_TURNS',
  memberCount: 20,
};

/**
 * Laboratorio de componentes de shared/ui (skill break-ui). SOLO desarrollo:
 * la ruta /dev/ui-lab no existe en el build de producción.
 * El conjunto de datos se elige con ?data=demo|worst|empty|one|many.
 */
@Component({
  selector: 'app-ui-lab',
  templateUrl: './ui-lab.page.html',
  styleUrls: ['./ui-lab.page.scss'],
  imports: [
    IonContent,
    IonButton,
    RouterLink,
    PaymentStatusBadgeComponent,
    AmountCardComponent,
    EmptyStateComponent,
    TurnTimelineComponent,
    BrandHeaderComponent,
    QuickActionsComponent,
    AmountOptionsComponent,
    InfoRowComponent,
    AvatarComponent,
    GroupCardComponent,
  ],
})
export class UiLabPage {
  /** Viene del query param ?data= (withComponentInputBinding). */
  readonly data = input<string>();

  protected readonly datasets: { id: LabDataset; label: string }[] = [
    { id: 'demo', label: 'Demo' },
    { id: 'worst', label: 'Peor caso' },
    { id: 'empty', label: 'Vacío' },
    { id: 'one', label: 'Uno' },
    { id: 'many', label: '120 filas' },
  ];

  protected readonly active = computed<LabDataset>(() => {
    const d = this.data();
    return d && d in LAB_FIXTURES ? (d as LabDataset) : 'demo';
  });

  protected readonly fixture = computed(() => LAB_FIXTURES[this.active()]);
  protected readonly groups = computed(() =>
    this.active() === 'empty' ? [] : this.active() === 'worst' ? [WORST_GROUP, FAMILY] : [FAMILY],
  );
  protected readonly amount = signal<string | null>('100');
  protected readonly lastAction = signal('');
  protected readonly icon = peopleOutline;
}
