/** Desarrollo contra el backend local: `npm run start:real`. */
export const environment = {
  production: false,
  useMocks: false,
  /**
   * Mismo origen que la app: el servidor de desarrollo reenvía /graphql al backend
   * (proxy.conf.json). Así funciona igual en la PC, en el celular y por un túnel.
   */
  apiUrl: '/graphql',
  /** Ofrecer rondas de demostración al crear grupos (solo Testnet). */
  demoRounds: true,
  stellar: {
    network: 'testnet',
    /** Explorador público de Testnet; se le agrega el hash. POR CONFIRMAR con el equipo. */
    explorerTxUrl: 'https://stellar.expert/explorer/testnet/tx/',
    explorerAccountUrl: 'https://stellar.expert/explorer/testnet/account/',
    /** API pública de Stellar Testnet (saldos de una cuenta). */
    horizonUrl: 'https://horizon-testnet.stellar.org',
  },
};
