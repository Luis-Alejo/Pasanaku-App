import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular';

/** Botón redondo de ícono para las franjas de marca, con insignia de cantidad (ej. avisos sin leer). */
@Component({
  selector: 'app-icon-badge-button',
  templateUrl: './icon-badge-button.component.html',
  styleUrls: ['./icon-badge-button.component.scss'],
  imports: [IonIcon, RouterLink],
})
export class IconBadgeButtonComponent {
  readonly icon = input.required<string>();
  /** Nombre accesible (sin la cantidad: se agrega sola). */
  readonly label = input.required<string>();
  readonly count = input(0);
  readonly link = input.required<string | string[]>();

  protected readonly badge = computed(() => (this.count() > 9 ? '9+' : String(this.count())));
  protected readonly ariaLabel = computed(() =>
    this.count() > 0 ? `${this.label()}, ${this.count()} sin leer` : this.label(),
  );
}
