import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { AmountCardComponent } from '@shared/ui/amount-card/amount-card.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { PaymentStatusBadgeComponent } from '@shared/ui/payment-status-badge/payment-status-badge.component';
import { TurnTimelineComponent } from '@shared/ui/turn-timeline/turn-timeline.component';
import { peopleOutline } from 'ionicons/icons';

import type { LabDataset } from './ui-lab.fixtures';
import { LAB_FIXTURES } from './ui-lab.fixtures';

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
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    RouterLink,
    PaymentStatusBadgeComponent,
    AmountCardComponent,
    EmptyStateComponent,
    TurnTimelineComponent,
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
  protected readonly icon = peopleOutline;
}
