import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { SegmentCustomEvent } from '@ionic/angular';
import {
  AlertController,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { add, cloudOfflineOutline, globeOutline, peopleOutline } from 'ionicons/icons';

import { GroupCardComponent } from '../../components/group-card/group-card.component';
import { GroupsStore } from '../../data-access/groups.store';

type Segment = 'mine' | 'public';

@Component({
  selector: 'app-group-list',
  templateUrl: './group-list.page.html',
  styleUrls: ['./group-list.page.scss'],
  imports: [
    RouterLink,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonSegment,
    IonSegmentButton,
    IonSpinner,
    EmptyStateComponent,
    GroupCardComponent,
  ],
})
export class GroupListPage {
  protected readonly store = inject(GroupsStore);
  private readonly alerts = inject(AlertController);
  private readonly router = inject(Router);

  protected readonly segment = signal<Segment>('mine');
  protected readonly groups = computed(() =>
    this.segment() === 'mine' ? this.store.myGroups() : this.store.publicGroups(),
  );
  /** Spinner solo la primera vez: al volver a la pestaña se refresca sin parpadeo. */
  protected readonly showSpinner = computed(
    () => this.store.listLoading() && this.store.myGroups().length === 0 && this.store.publicGroups().length === 0,
  );

  protected readonly icons = { add, mine: peopleOutline, public: globeOutline, error: cloudOfflineOutline };

  /** Ionic: se llama cada vez que la pantalla aparece (también al volver de un detalle). */
  ionViewWillEnter(): void {
    void this.store.loadLists();
  }

  protected onSegmentChange(event: SegmentCustomEvent): void {
    this.segment.set(event.detail.value === 'public' ? 'public' : 'mine');
  }

  protected retry(): void {
    void this.store.loadLists();
  }

  /** Pide el código de invitación y abre la pantalla para unirse. */
  protected async askInviteCode(): Promise<void> {
    const alert = await this.alerts.create({
      header: 'Unirme con un código',
      message: 'Escribe el código que te compartieron.',
      inputs: [
        {
          name: 'code',
          type: 'text',
          placeholder: 'Ej.: QUISPE26',
          attributes: { autocapitalize: 'characters', autocomplete: 'off', spellcheck: false, maxlength: 12 },
        },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Buscar',
          handler: (data: { code?: string }) => {
            const code = (data.code ?? '').trim().toUpperCase();
            if (!code) {
              return false; // deja la alerta abierta
            }
            void this.router.navigate(['/join', code]);
            return true;
          },
        },
      ],
    });
    await alert.present();
  }
}
