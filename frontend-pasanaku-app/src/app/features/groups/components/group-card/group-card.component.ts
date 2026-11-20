import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Group } from '@core/models/domain.models';
import { IonCard } from '@ionic/angular';
import { MoneyPipe } from '@shared/pipes/money.pipe';
import { InfoRowComponent } from '@shared/ui/info-row/info-row.component';

import {
  VISIBILITY_LABELS,
  groupProgressLabel,
  membersLabel,
  periodicityLabel,
  statusLabel,
} from '../../data-access/group-view';

/** Tarjeta de un grupo en la lista. Toda la tarjeta lleva al detalle. */
@Component({
  selector: 'app-group-card',
  templateUrl: './group-card.component.html',
  styleUrls: ['./group-card.component.scss'],
  imports: [IonCard, RouterLink, MoneyPipe, InfoRowComponent],
})
export class GroupCardComponent {
  readonly group = input.required<Group>();
  /** Usuario actual, para mensajes como "Tu cobro: 15 dic". */
  readonly userId = input.required<string>();

  protected readonly statusLabel = computed(() => statusLabel(this.group()));
  protected readonly periodicityLabel = computed(() => periodicityLabel(this.group()));
  protected readonly visibilityLabel = computed(() => VISIBILITY_LABELS[this.group().visibility]);
  protected readonly membersLabel = computed(() => membersLabel(this.group()));
  protected readonly progressLabel = computed(() => groupProgressLabel(this.group(), this.userId()));
}
