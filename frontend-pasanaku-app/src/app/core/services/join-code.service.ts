import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';

/**
 * "Unirme con código": pide el código de invitación y abre /join/:code.
 * Lo usan Inicio y Grupos.
 */
@Injectable({ providedIn: 'root' })
export class JoinCodeService {
  private readonly alerts = inject(AlertController);
  private readonly router = inject(Router);

  async askAndOpen(): Promise<void> {
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
