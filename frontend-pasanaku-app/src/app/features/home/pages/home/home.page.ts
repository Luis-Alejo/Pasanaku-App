import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { MoneyPipe } from '@shared/pipes/money.pipe';
import { AmountCardComponent } from '@shared/ui/amount-card/amount-card.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { formatDate } from '@shared/utils/format';
import {
  checkmarkCircleOutline,
  cloudOfflineOutline,
  diceOutline,
  handLeftOutline,
  peopleOutline,
  swapHorizontalOutline,
} from 'ionicons/icons';

import type { TodoKind } from '../../data-access/home-view';
import { HomeStore } from '../../data-access/home.store';

const TODO_ICONS: Record<TodoKind, string> = {
  swap: swapHorizontalOutline,
  'choose-turn': handLeftOutline,
  draw: diceOutline,
};

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  imports: [
    RouterLink,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonButton,
    IonIcon,
    IonSpinner,
    MoneyPipe,
    AmountCardComponent,
    EmptyStateComponent,
  ],
})
export class HomePage {
  protected readonly store = inject(HomeStore);

  protected readonly todoIcons = TODO_ICONS;
  protected readonly icons = { error: cloudOfflineOutline, empty: peopleOutline, ok: checkmarkCircleOutline };
  protected readonly formatDate = formatDate;

  /** Ionic: cada vez que la pestaña aparece, refresca el resumen. */
  ionViewWillEnter(): void {
    void this.store.load();
  }

  protected retry(): void {
    void this.store.load();
  }
}
