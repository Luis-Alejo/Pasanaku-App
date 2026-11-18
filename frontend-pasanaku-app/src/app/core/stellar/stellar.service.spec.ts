import { StellarService } from './stellar.service';

describe('StellarService (Horizon)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('convierte los saldos de Horizon', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          balances: [
            { balance: '100.0000000', asset_type: 'credit_alphanum4', asset_code: 'USDC', asset_issuer: 'GISSUER' },
            { balance: '9999.9999900', asset_type: 'native' },
          ],
        }),
        { status: 200 },
      ),
    );
    const balances = await new StellarService().getBalances('GABC');
    expect(balances).toEqual([
      { code: 'USDC', amount: '100.0000000', decimals: 7, issuer: 'GISSUER' },
      { code: 'XLM', amount: '9999.9999900', decimals: 7, issuer: undefined },
    ]);
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe('https://horizon-testnet.stellar.org/accounts/GABC');
  });

  it('una cuenta que no existe en la red no tiene saldos', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 404 }));
    expect(await new StellarService().getBalances('GNEW')).toEqual([]);
  });

  it('otros errores de Horizon se informan', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 503 }));
    await expect(new StellarService().getBalances('GABC')).rejects.toThrow('503');
  });
});
