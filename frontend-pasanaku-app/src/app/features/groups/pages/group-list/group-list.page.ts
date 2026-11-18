import { Component, computed, inject, signal } from '@angular/core';
import type { SegmentCustomEvent } from '@ionic/angular';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { cloudOfflineOutline, globeOutline, peopleOutline } from 'ionicons/icons';

import { GroupCardComponent } from '../../components/group-card/group-card.component';
import { GroupsStore } from '../../data-access/groups.store';

type Segment = 'mine' | 'public';

@Component({
  selector: 'app-group-list',
  templateUrl: './group-list.page.html',
  styleUrls: ['./group-list.page.scss'],
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonSegment,
    IonSegmentButton,
    IonSpinner,
    IonButton,
    EmptyStateComponent,
    GroupCardComponent,
  ],
})
export class GroupListPage {
  protected readonly store = inject(GroupsStore);

  protected readonly segment = signal<Segment>('mine');
  protected readonly groups = computed(() =>
    this.segment() === 'mine' ? this.store.myGroups() : this.store.publicGroups(),
  );
  /** Spinner solo la primera vez: al volver a la pestaña se refresca sin parpadeo. */
  protected readonly showSpinner = computed(
    () => this.store.listLoading() && this.store.myGroups().length === 0 && this.store.publicGroups().length === 0,
  );

  protected readonly icons = { mine: peopleOutline, public: globeOutline, error: cloudOfflineOutline };

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
}
