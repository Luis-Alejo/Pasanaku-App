import { Component, effect, input, signal } from '@angular/core';
import { toDataURL } from 'qrcode';

/**
 * Código QR. Si llega la imagen ya hecha (`image`, base64) la muestra; si no,
 * la dibuja a partir del texto (`value`). Siempre negro sobre blanco para que
 * cualquier app de banco lo lea, también en modo oscuro.
 */
@Component({
  selector: 'app-qr-code',
  templateUrl: './qr-code.component.html',
  styleUrls: ['./qr-code.component.scss'],
})
export class QrCodeComponent {
  readonly value = input<string>('');
  /** Imagen PNG en base64 (con o sin el prefijo data:). */
  readonly image = input<string>();
  /** Texto para lectores de pantalla. */
  readonly label = input('Código QR para pagar');

  protected readonly src = signal<string | null>(null);
  protected readonly failed = signal(false);

  constructor() {
    effect(() => {
      const image = this.image();
      const value = this.value();
      this.failed.set(false);
      if (image) {
        this.src.set(image.startsWith('data:') ? image : `data:image/png;base64,${image}`);
        return;
      }
      if (!value) {
        this.src.set(null);
        return;
      }
      toDataURL(value, { margin: 1, width: 480, errorCorrectionLevel: 'M' })
        .then((url) => this.src.set(url))
        .catch(() => this.failed.set(true));
    });
  }
}
