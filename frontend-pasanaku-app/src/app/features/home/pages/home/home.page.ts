import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { JoinCodeService } from '@core/services/join-code.service';
import { ThemeService } from '@core/services/theme.service';
import { IonButton, IonContent, IonIcon, IonSpinner } from '@ionic/angular';
import { MoneyPipe } from '@shared/pipes/money.pipe';
import { ActionRowComponent } from '@shared/ui/action-row/action-row.component';
import { AmountCardComponent } from '@shared/ui/amount-card/amount-card.component';
import { AvatarComponent } from '@shared/ui/avatar/avatar.component';
import { BrandHeaderComponent } from '@shared/ui/brand-header/brand-header.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import type { QuickAction } from '@shared/ui/quick-actions/quick-actions.component';
import { QuickActionsComponent } from '@shared/ui/quick-actions/quick-actions.component';
import { formatDate } from '@shared/utils/format';
import {
  addCircleOutline,
  cashOutline,
  checkmarkCircleOutline,
  cloudOfflineOutline,
  diceOutline,
  enterOutline,
  handLeftOutline,
  moonOutline,
  peopleOutline,
  sunnyOutline,
  swapHorizontalOutline,
  walletOutline,
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
    IonButton,
    IonIcon,
    IonSpinner,
    MoneyPipe,
    ActionRowComponent,
    AmountCardComponent,
    AvatarComponent,
    BrandHeaderComponent,
    EmptyStateComponent,
    QuickActionsComponent,
  ],
})
export class HomePage {
  protected readonly store = inject(HomeStore);
  protected readonly theme = inject(ThemeService);
  private readonly auth = inject(AuthService);
  private readonly joinCode = inject(JoinCodeService);

  protected readonly todoIcons = TODO_ICONS;
  protected readonly icons = {
    error: cloudOfflineOutline,
    ok: checkmarkCircleOutline,
    sun: sunnyOutline,
    moon: moonOutline,
    group: peopleOutline,
    payout: cashOutline,
  };
  protected readonly formatDate = formatDate;
  protected readonly userName = computed(() => this.auth.currentUser()?.displayName ?? '');

  /**
   * Tarjeta del encabezado: el próximo aporte; si no hay, el próximo cobro.
   * (Un solo objeto para que la plantilla proyecte un único elemento en el encabezado.)
   */
  protected readonly hero = computed(() => {
    if (!this.store.loaded()) return null;
    const next = this.store.pending()[0];
    if (next) {
      return {
        label: 'Próximo aporte · ' + next.group.name,
        amount: next.group.contributionAmount,
        asset: next.group.asset,
        meta: 'Ronda ' + next.round.number,
        caption:
          next.status === 'LATE'
            ? 'Atrasado: venció el ' + formatDate(next.round.dueDate)
            : 'Vence el ' + formatDate(next.round.dueDate, true),
      };
    }
    const p = this.store.payout();
    if (p) {
      return {
        label: 'Tu próximo cobro · ' + p.group.name,
        amount: p.amount,
        asset: p.group.asset,
        meta: 'Ronda ' + p.round.number,
        caption: p.isCurrent ? '¡Cobras en esta ronda!' : 'Aproximadamente el ' + formatDate(p.round.dueDate, true),
      };
    }
    return null;
  });

  /** Accesos rápidos del kit adaptados a Pasanaku. "Aportar" va al aporte pendiente si hay uno. */
  protected readonly actions = computed<QuickAction[]>(() => {
    const next = this.store.pending()[0];
    return [
      {
        id: 'pay',
        label: 'Aportar',
        icon: walletOutline,
        accent: 'indigo',
        link: next ? ['/tabs/groups', next.group.id, 'contribute'] : '/tabs/groups',
        badge: this.store.pending().length || undefined,
      },
      { id: 'groups', label: 'Mis grupos', icon: peopleOutline, accent: 'teal', link: '/tabs/groups' },
      { id: 'create', label: 'Crear grupo', icon: addCircleOutline, accent: 'orange', link: '/tabs/groups/new' },
      { id: 'join', label: 'Unirme con código', icon: enterOutline, accent: 'blue' },
    ];
  });

  /** Ionic: cada vez que la pestaña aparece, refresca el resumen y pinta la barra de estado en índigo. */
  ionViewWillEnter(): void {
    this.theme.setHeaderTone('brand');
    void this.store.load();
  }

  ionViewWillLeave(): void {
    this.theme.setHeaderTone('surface');
  }

  protected onAction(id: string): void {
    if (id === 'join') {
      void this.joinCode.askAndOpen();
    }
  }

  protected retry(): void {
    void this.store.load();
  }
}
