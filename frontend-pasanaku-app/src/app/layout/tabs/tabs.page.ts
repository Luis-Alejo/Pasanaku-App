import { Component } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';
import { homeOutline, peopleOutline, personOutline, walletOutline } from 'ionicons/icons';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
})
export class TabsPage {
  /**
   * Íconos de línea, como en el kit. (El relleno de la pestaña activa lo da
   * la pastilla, así que no hace falta cambiar a la versión rellena.)
   */
  protected readonly icons = {
    home: homeOutline,
    groups: peopleOutline,
    wallet: walletOutline,
    profile: personOutline,
  };
}
