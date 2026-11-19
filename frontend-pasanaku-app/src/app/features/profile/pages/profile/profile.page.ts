import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { ThemeService } from '@core/services/theme.service';
import { ToastService } from '@core/services/toast.service';
import { explorerAccountUrl } from '@core/stellar/explorer';
import type { WalletBalance } from '@core/stellar/stellar.service';
import { StellarService } from '@core/stellar/stellar.service';
import { environment } from '@env/environment';
import { IonButton, IonContent, IonIcon, IonSpinner, IonToggle, NavController } from '@ionic/angular';
import { formatMoneyParts } from '@shared/pipes/money.pipe';
import { AvatarComponent } from '@shared/ui/avatar/avatar.component';
import { BrandHeaderComponent } from '@shared/ui/brand-header/brand-header.component';
import { InfoRowComponent } from '@shared/ui/info-row/info-row.component';
import { checkmark, copyOutline, openOutline } from 'ionicons/icons';

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  imports: [
    RouterLink,
    IonContent,
    IonButton,
    IonIcon,
    IonSpinner,
    IonToggle,
    AvatarComponent,
    BrandHeaderComponent,
    InfoRowComponent,
  ],
})
export class ProfilePage {
  private readonly auth = inject(AuthService);
  private readonly stellar = inject(StellarService);
  private readonly toast = inject(ToastService);
  private readonly nav = inject(NavController);
  protected readonly theme = inject(ThemeService);

  protected readonly user = this.auth.currentUser;
  protected readonly balances = signal<WalletBalance[]>([]);
  protected readonly balancesState = signal<LoadState>('idle');
  protected readonly copied = signal(false);
  protected readonly isMock = environment.useMocks;
  protected readonly icons = { copy: copyOutline, copied: checkmark, external: openOutline };

  /** El código ya va a la izquierda: a la derecha solo el número formateado. */
  protected readonly balanceRows = computed(() =>
    this.balances().map((b) => ({ ...b, number: formatMoneyParts(b.amount, b)?.number ?? '—' })),
  );

  protected readonly accountUrl = computed(() => {
    const address = this.user()?.walletAddress;
    return address ? explorerAccountUrl(address) : '';
  });

  private copiedTimer: ReturnType<typeof setTimeout> | undefined;

  /** Encabezado índigo: la barra de estado del sistema combina con él. */
  ionViewWillEnter(): void {
    this.theme.setHeaderTone('brand');
    void this.loadBalances();
  }

  ionViewWillLeave(): void {
    this.theme.setHeaderTone('surface');
  }

  protected async loadBalances(): Promise<void> {
    const address = this.user()?.walletAddress;
    if (!address) return;
    if (this.balancesState() !== 'loaded') {
      this.balancesState.set('loading');
    }
    try {
      this.balances.set(await this.stellar.getBalances(address));
      this.balancesState.set('loaded');
    } catch {
      this.balancesState.set('error');
    }
  }

  protected logout(): void {
    this.auth.clearSession();
    void this.nav.navigateRoot('/auth/login');
  }

  /** Copia la dirección; avisa también si falla (sin bloquear el botón). */
  protected async copyAddress(): Promise<void> {
    const address = this.user()?.walletAddress ?? '';
    try {
      await navigator.clipboard.writeText(address);
      clearTimeout(this.copiedTimer);
      this.copied.set(true);
      this.copiedTimer = setTimeout(() => this.copied.set(false), 2000);
      void this.toast.show('Dirección copiada', 'success');
    } catch {
      void this.toast.show('No se pudo copiar. Mantén presionada la dirección para copiarla.', 'danger');
    }
  }
}
