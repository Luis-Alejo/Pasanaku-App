import { Component, computed, input } from '@angular/core';
import { initials } from '@shared/utils/initials';

/**
 * Avatar con iniciales (reemplaza las fotos del kit). Es decorativo: el nombre
 * siempre se muestra al lado, así que se oculta a lectores de pantalla.
 */
@Component({
  selector: 'app-avatar',
  templateUrl: './avatar.component.html',
  styleUrls: ['./avatar.component.scss'],
  host: {
    'aria-hidden': 'true',
    '[class]': "'avatar avatar--' + size() + (highlight() ? ' avatar--highlight' : '')",
  },
})
export class AvatarComponent {
  readonly name = input.required<string>();
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  /** Resalta el avatar (ej. el del usuario). */
  readonly highlight = input(false);

  protected readonly text = computed(() => initials(this.name()));
}
