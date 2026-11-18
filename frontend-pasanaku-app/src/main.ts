import { bootstrapApplication } from '@angular/platform-browser';
import { appProviders } from '@core/providers';

import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, { providers: appProviders });
