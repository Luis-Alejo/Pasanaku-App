import { Component, inject, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '@core/auth/auth.service';
import { toApiError } from '@core/graphql/api-error';
import { ThemeService } from '@core/services/theme.service';
import { ToastService } from '@core/services/toast.service';
import { IonButton, IonContent, IonInput, NavController } from '@ionic/angular';
import { ThemeToggleComponent } from '@shared/ui/theme-toggle/theme-toggle.component';

import { AuthShellComponent } from '../../components/auth-shell/auth-shell.component';
import { ciValidator, safeReturnUrl } from '../../data-access/auth-form';

@Component({
  selector: 'app-verify-identity',
  templateUrl: './verify-identity.page.html',
  styleUrls: ['../auth-form.scss'],
  imports: [ReactiveFormsModule, IonContent, IonInput, IonButton, AuthShellComponent, ThemeToggleComponent],
})
export class VerifyIdentityPage {
  private readonly auth = inject(AuthService);
  private readonly nav = inject(NavController);
  protected readonly theme = inject(ThemeService);
  private readonly toast = inject(ToastService);

  readonly returnUrl = input<string>();

  protected readonly submitting = signal(false);
  protected readonly error = signal('');
  protected readonly form = new FormGroup({
    ciNumber: new FormControl('', { nonNullable: true, validators: [Validators.required, ciValidator] }),
  });

  ionViewWillEnter(): void {
    this.theme.setHeaderTone('brand');
  }

  ionViewWillLeave(): void {
    this.theme.setHeaderTone('surface');
  }

  protected async submit(): Promise<void> {
    if (this.submitting()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.error.set('');
    try {
      const user = await this.auth.submitKyc(this.form.getRawValue().ciNumber.trim());
      void this.toast.show(
        user.kycStatus === 'VERIFIED' ? 'Identidad verificada' : 'Recibimos tu CI. Está en revisión.',
        'success',
      );
      await this.continue();
    } catch (error) {
      this.error.set(toApiError(error).message);
    } finally {
      this.submitting.set(false);
    }
  }

  protected continue(): Promise<boolean> {
    return this.nav.navigateRoot(safeReturnUrl(this.returnUrl()));
  }
}
