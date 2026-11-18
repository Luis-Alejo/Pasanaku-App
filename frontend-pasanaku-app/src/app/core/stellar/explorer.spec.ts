import { explorerTxUrl, shortHash } from './explorer';

const HASH = '3ed60aa92720c44c904d65216d568489db625d4c956eaaf330073fbd44b8083c';

describe('explorer', () => {
  it('arma el enlace de Testnet', () => {
    expect(explorerTxUrl(HASH)).toBe(`https://stellar.expert/explorer/testnet/tx/${HASH}`);
  });

  it('abrevia el hash', () => {
    expect(shortHash(HASH)).toBe('3ed60a…b8083c');
    expect(shortHash('abc')).toBe('abc');
  });
});
