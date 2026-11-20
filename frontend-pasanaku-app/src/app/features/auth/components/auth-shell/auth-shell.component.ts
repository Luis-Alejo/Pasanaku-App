import { Component, input } from '@angular/core';
import { BrandHeaderComponent } from '@shared/ui/brand-header/brand-header.component';

/** Marco de las pantallas de acceso: franja índigo, bienvenida e ilustración. */
@Component({
  selector: 'app-auth-shell',
  templateUrl: './auth-shell.component.html',
  styleUrls: ['./auth-shell.component.scss'],
  imports: [BrandHeaderComponent],
})
export class AuthShellComponent {
  readonly screenTitle = input.required<string>();
  readonly heading = input.required<string>();
  readonly message = input.required<string>();
  readonly illustration = input<'acceso' | 'billetera'>('acceso');
}
