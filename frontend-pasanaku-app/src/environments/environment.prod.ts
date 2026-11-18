export const environment = {
  production: true,
  /**
   * Activado también en producción mientras el backend no esté listo, para que
   * la build de la demo funcione. Cambiar a false al conectar la API (paso 9).
   */
  useMocks: true,
  stellar: {
    network: 'testnet',
    /** Explorador público de Testnet; se le agrega el hash. POR CONFIRMAR con el equipo. */
    explorerTxUrl: 'https://stellar.expert/explorer/testnet/tx/',
  },
};
