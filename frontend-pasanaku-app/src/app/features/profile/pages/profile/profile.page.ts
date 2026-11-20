import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { REPUTATION, reputationLabel, reputationTone } from '@core/models/reputation';
import { ThemeService } from '@core/services/theme.service';
import { IonButton, IonContent, IonToggle, NavController } from '@ionic/angular';
import { AvatarComponent } from '@shared/ui/avatar/avatar.component';
import { BrandHeaderComponent } from '@shared/ui/brand-header/brand-header.component';
import { InfoRowComponent } from '@shared/ui/info-row/info-row.component';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  imports: [RouterLink, IonContent, IonButton, IonToggle, AvatarComponent, BrandHeaderComponent, InfoRowComponent],
})
export class ProfilePage {
  private readonly auth = inject(AuthService);
  private readonly nav = inject(NavController);
  protected readonly theme = inject(ThemeService);

  protected readonly user = this.auth.currentUser;
  protected readonly rules = REPUTATION;
  protected readonly repTone = reputationTone;
  protected readonly repLabel = reputationLabel;

  /** Encabezado índigo: la barra de estado del sistema combina con él. */
  ionViewWillEnter(): void {
    this.theme.setHeaderTone('brand');
    void this.auth.refreshUser();
  }

  ionViewWillLeave(): void {
    this.theme.setHeaderTone('surface');
  }

  protected logout(): void {
    this.auth.clearSession();
    void this.nav.navigateRoot('/auth/login');
  }
}
