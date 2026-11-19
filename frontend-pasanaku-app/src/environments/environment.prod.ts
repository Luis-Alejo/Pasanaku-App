export const environment = {
  production: true,
  /**
   * Activado también en producción mientras el backend no esté listo, para que
   * la build de la demo funcione. Cambiar a false al conectar la API (paso 9).
   */
  useMocks: true,
  /** Endpoint GraphQL del backend. POR CONFIRMAR: URL accesible desde el celular. */
  apiUrl: 'http://localhost:3000/graphql',
  stellar: {
    network: 'testnet',
    /** Explorador público de Testnet; se le agrega el hash. POR CONFIRMAR con el equipo. */
    explorerTxUrl: 'https://stellar.expert/explorer/testnet/tx/',
    explorerAccountUrl: 'https://stellar.expert/explorer/testnet/account/',
    /** API pública de Stellar Testnet (saldos de una cuenta). */
    horizonUrl: 'https://horizon-testnet.stellar.org',
  },
};
