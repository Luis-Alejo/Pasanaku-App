// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  /**
   * true: los datos salen de los mocks (`core/data/*.mock.ts`) y saldos de ejemplo.
   * false: usan la API GraphQL del backend (paso 9).
   */
  useMocks: true,
  /** Endpoint GraphQL del backend. POR CONFIRMAR: URL accesible desde el celular. */
  apiUrl: 'http://localhost:3000/graphql',
  /** Ofrecer rondas de demostración al crear grupos (solo con la API real en Testnet). */
  demoRounds: false,
  stellar: {
    network: 'testnet',
    /** Explorador público de Testnet; se le agrega el hash. POR CONFIRMAR con el equipo. */
    explorerTxUrl: 'https://stellar.expert/explorer/testnet/tx/',
    explorerAccountUrl: 'https://stellar.expert/explorer/testnet/account/',
    /** API pública de Stellar Testnet (saldos de una cuenta). */
    horizonUrl: 'https://horizon-testnet.stellar.org',
  },
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
