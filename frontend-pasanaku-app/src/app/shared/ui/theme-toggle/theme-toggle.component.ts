import { Component, input, output } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { moonOutline, sunnyOutline } from 'ionicons/icons';

/** Botón de sol y luna para las franjas de marca. Quien lo usa cambia el tema. */
@Component({
  selector: 'app-theme-toggle',
  templateUrl: './theme-toggle.component.html',
  styleUrls: ['./theme-toggle.component.scss'],
  imports: [IonIcon],
})
export class ThemeToggleComponent {
  readonly dark = input.required<boolean>();
  readonly toggled = output<void>();

  protected readonly icons = { sun: sunnyOutline, moon: moonOutline };
}
