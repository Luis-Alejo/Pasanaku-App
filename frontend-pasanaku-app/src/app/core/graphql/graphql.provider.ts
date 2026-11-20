import { provideHttpClient } from '@angular/common/http';
import type { EnvironmentProviders, Provider } from '@angular/core';
import { Injector, inject } from '@angular/core';
import { ApolloLink, InMemoryCache } from '@apollo/client';
import { SetContextLink } from '@apollo/client/link/context';
import { ErrorLink } from '@apollo/client/link/error';
import { AuthService } from '@core/auth/auth.service';
import { ToastService } from '@core/services/toast.service';
import { TokenStorage } from '@core/storage/token.storage';
import { environment } from '@env/environment';
import { NavController } from '@ionic/angular';
import { provideApollo } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';

import { NETWORK_ERROR_MESSAGE, toApiError } from './api-error';

/** Estas operaciones muestran sus errores en su propia pantalla. */
const SILENT_OPERATIONS = new Set(['Login', 'Register', 'Me']);
const NETWORK_TOAST_INTERVAL_MS = 5000;

export function provideGraphql(): (Provider | EnvironmentProviders)[] {
  return [
    provideHttpClient(),
    provideApollo(() => {
      const httpLink = inject(HttpLink);
      const tokens = inject(TokenStorage);
      // Perezoso: AuthService usa Apollo, y Apollo se está creando aquí.
      const injector = inject(Injector);
      let lastNetworkToast = 0;

      const authLink = new SetContextLink((previous) => {
        const token = tokens.get();
        return token ? { headers: { ...previous['headers'], Authorization: `Bearer ${token}` } } : {};
      });

      const errorLink = new ErrorLink(({ error, operation }) => {
        if (SILENT_OPERATIONS.has(operation.operationName ?? '')) {
          return;
        }
        const { kind } = toApiError(error);
        const toast = injector.get(ToastService);
        if (kind === 'unauthenticated') {
          injector.get(AuthService).clearSession();
          void toast.show('Tu sesión expiró. Vuelve a iniciar sesión.');
          void injector.get(NavController).navigateRoot('/auth/login');
        } else if (kind === 'network' && Date.now() - lastNetworkToast > NETWORK_TOAST_INTERVAL_MS) {
          lastNetworkToast = Date.now();
          void toast.show(NETWORK_ERROR_MESSAGE, 'danger');
        }
      });

      return {
        link: ApolloLink.from([errorLink, authLink, httpLink.create({ uri: environment.apiUrl })]),
        cache: new InMemoryCache(),
      };
    }),
  ];
}
