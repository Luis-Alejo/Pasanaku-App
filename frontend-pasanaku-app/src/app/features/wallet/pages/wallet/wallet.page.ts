import { Component, computed, inject, signal } from '@angular/core';
import { AuthService } from '@core/auth/auth.service';
import { ThemeService } from '@core/services/theme.service';
import { ToastService } from '@core/services/toast.service';
import { explorerAccountUrl } from '@core/stellar/explorer';
import type { WalletBalance } from '@core/stellar/stellar.service';
import { StellarService } from '@core/stellar/stellar.service';
import { environment } from '@env/environment';
import { IonButton, IonContent, IonIcon, IonSpinner } from '@ionic/angular';
import { formatMoneyParts } from '@shared/pipes/money.pipe';
import { AmountCardComponent } from '@shared/ui/amount-card/amount-card.component';
import { BrandHeaderComponent } from '@shared/ui/brand-header/brand-header.component';
import { InfoRowComponent } from '@shared/ui/info-row/info-row.component';
import { checkmark, copyOutline, openOutline } from 'ionicons/icons';

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

/** Moneda de los aportes: la tarjeta muestra su saldo. */
const MAIN_ASSET = { code: 'USDC', decimals: 7 };

@Component({
  selector: 'app-wallet',
  templateUrl: './wallet.page.html',
  styleUrls: ['./wallet.page.scss'],
  imports: [IonContent, IonButton, IonIcon, IonSpinner, AmountCardComponent, BrandHeaderComponent, InfoRowComponent],
})
export class WalletPage {
  private readonly auth = inject(AuthService);
  private readonly stellar = inject(StellarService);
  private readonly toast = inject(ToastService);
  private readonly theme = inject(ThemeService);

  protected readonly user = this.auth.currentUser;
  protected readonly balances = signal<WalletBalance[]>([]);
  protected readonly state = signal<LoadState>('idle');
  protected readonly copied = signal(false);
  protected readonly isMock = environment.useMocks;
  protected readonly mainAsset = MAIN_ASSET;
  protected readonly icons = { copy: copyOutline, copied: checkmark, external: openOutline };

  /** Saldo de la moneda de los aportes ("—" mientras carga o si falla). */
  protected readonly mainBalance = computed(() => {
    if (this.state() !== 'loaded') return '—';
    return this.balances().find((b) => b.code === MAIN_ASSET.code)?.amount ?? '0';
  });

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
    void this.load();
  }

  ionViewWillLeave(): void {
    this.theme.setHeaderTone('surface');
  }

  protected async load(): Promise<void> {
    const address = this.user()?.walletAddress;
    if (!address) return;
    if (this.state() !== 'loaded') {
      this.state.set('loading');
    }
    try {
      this.balances.set(await this.stellar.getBalances(address));
      this.state.set('loaded');
    } catch {
      this.state.set('error');
    }
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
