import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { SegmentCustomEvent } from '@ionic/angular';
import {
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
import { add, cloudOfflineOutline } from 'ionicons/icons';

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

  protected readonly segment = signal<Segment>('mine');
  protected readonly groups = computed(() =>
    this.segment() === 'mine' ? this.store.myGroups() : this.store.publicGroups(),
  );
  /** Spinner solo la primera vez: al volver a la pestaña se refresca sin parpadeo. */
  protected readonly showSpinner = computed(
    () => this.store.listLoading() && this.store.myGroups().length === 0 && this.store.publicGroups().length === 0,
  );

  protected readonly icons = { add, error: cloudOfflineOutline };

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
