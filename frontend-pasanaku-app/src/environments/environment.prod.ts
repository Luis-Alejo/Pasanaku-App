export const environment = {
  production: true,
  /** Backend publicado en Railway (Stellar Testnet). */
  useMocks: false,
  apiUrl: 'https://pasanaku-app-production.up.railway.app/graphql',
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
