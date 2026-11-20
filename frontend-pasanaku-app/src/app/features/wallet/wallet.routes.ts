import type { Routes } from '@angular/router';

export const walletRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/wallet/wallet.page').then((m) => m.WalletPage),
  },
];
