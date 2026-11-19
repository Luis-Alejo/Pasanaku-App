/** Desarrollo contra el backend local: `npm run start:real`. */
export const environment = {
  production: false,
  useMocks: false,
  /**
   * Backend en el mismo equipo que sirve la app: en la PC es localhost; desde el
   * celular (misma red wifi), la IP de la PC con la que se abrió la app.
   */
  apiUrl: `http://${globalThis.location?.hostname || 'localhost'}:3000/graphql`,
  stellar: {
    network: 'testnet',
    /** Explorador público de Testnet; se le agrega el hash. POR CONFIRMAR con el equipo. */
    explorerTxUrl: 'https://stellar.expert/explorer/testnet/tx/',
    explorerAccountUrl: 'https://stellar.expert/explorer/testnet/account/',
    /** API pública de Stellar Testnet (saldos de una cuenta). */
    horizonUrl: 'https://horizon-testnet.stellar.org',
  },
};
