import { Injectable, inject } from '@angular/core';
import { ToastController } from '@ionic/angular';

/** id de la barra de pestañas (layout/tabs). */
export const TAB_BAR_ID = 'app-tab-bar';

/** Avisos breves en pantalla (se anuncian también a lectores de pantalla). */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toasts = inject(ToastController);

  async show(message: string, color: 'success' | 'danger' | 'medium' = 'medium'): Promise<void> {
    const toast = await this.toasts.create({
      message,
      color,
      duration: 3000,
      position: 'bottom',
      // Sobre la barra de pestañas, si está en pantalla.
      positionAnchor: document.getElementById(TAB_BAR_ID) ? TAB_BAR_ID : undefined,
    });
    await toast.present();
  }
}
