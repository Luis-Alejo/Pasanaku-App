// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  /**
   * true: los stores leen los datos de prueba (`features/*\/data-access/*.mock.ts`).
   * false: usan la API GraphQL del backend (paso 9).
   */
  useMocks: true,
  stellar: {
    network: 'testnet',
    /** Explorador público de Testnet; se le agrega el hash. POR CONFIRMAR con el equipo. */
    explorerTxUrl: 'https://stellar.expert/explorer/testnet/tx/',
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
