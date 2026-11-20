import { TestBed } from '@angular/core/testing';
import { StellarService } from '@core/stellar/stellar.service';

import { WalletPage } from './wallet.page';

describe('WalletPage', () => {
  const getBalances = vi.fn();

  beforeEach(() => {
    getBalances.mockReset();
    TestBed.configureTestingModule({ providers: [{ provide: StellarService, useValue: { getBalances } }] });
  });

  const render = async () => {
    const fixture = TestBed.createComponent(WalletPage);
    fixture.componentInstance.ionViewWillEnter();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('muestra el saldo USDC en la tarjeta y todos los saldos en la lista', async () => {
    getBalances.mockResolvedValue([
      { code: 'XLM', amount: '2.0000000', decimals: 7 },
      { code: 'USDC', amount: '15.5000000', decimals: 7, issuer: 'G' },
    ]);
    const el = await render();
    expect(el.querySelector('app-amount-card')?.textContent).toContain('15,50');
    expect(el.querySelectorAll('app-info-row').length).toBe(2);
  });

  it('ofrece reintentar si Stellar no responde', async () => {
    getBalances.mockRejectedValue(new Error('sin red'));
    const el = await render();
    expect(el.textContent).toContain('No pudimos consultar tus saldos');
  });
});
