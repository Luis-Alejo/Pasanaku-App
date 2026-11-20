/** Desarrollo contra el backend publicado en Railway: `npm run start:cloud`. */
export const environment = {
  production: false,
  useMocks: false,
  /** Backend publicado (Stellar Testnet). Acepta peticiones de cualquier origen (CORS). */
  apiUrl: 'https://pasanaku-app-production.up.railway.app/graphql',
  /** Ofrecer rondas de demostración al crear grupos (solo Testnet). */
  demoRounds: true,
  stellar: {
    network: 'testnet',
    /** Explorador público de Testnet; se le agrega el hash. */
    explorerTxUrl: 'https://stellar.expert/explorer/testnet/tx/',
    explorerAccountUrl: 'https://stellar.expert/explorer/testnet/account/',
    /** API pública de Stellar Testnet (saldos de una cuenta). */
    horizonUrl: 'https://horizon-testnet.stellar.org',
  },
};
