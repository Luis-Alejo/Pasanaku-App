import { Component, inject, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { toApiError } from '@core/graphql/api-error';
import { ThemeService } from '@core/services/theme.service';
import { IonButton, IonContent, IonInput, IonInputPasswordToggle, NavController } from '@ionic/angular';
import { ThemeToggleComponent } from '@shared/ui/theme-toggle/theme-toggle.component';
import { eyeOffOutline, eyeOutline } from 'ionicons/icons';

import { AuthShellComponent } from '../../components/auth-shell/auth-shell.component';
import { AUTH_LIMITS, phoneValidator, urlAfterAuth } from '../../data-access/auth-form';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['../auth-form.scss'],
  imports: [
    ReactiveFormsModule,
    RouterLink,
    IonContent,
    IonInput,
    IonInputPasswordToggle,
    IonButton,
    AuthShellComponent,
    ThemeToggleComponent,
  ],
})
export class RegisterPage {
  private readonly auth = inject(AuthService);
  private readonly nav = inject(NavController);
  protected readonly theme = inject(ThemeService);

  readonly returnUrl = input<string>();

  protected readonly limits = AUTH_LIMITS;
  protected readonly icons = { show: eyeOutline, hide: eyeOffOutline };
  protected readonly submitting = signal(false);
  protected readonly error = signal('');
  protected readonly form = new FormGroup({
    fullName: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(/\S.*\S/),
        Validators.minLength(AUTH_LIMITS.nameMin),
        Validators.maxLength(AUTH_LIMITS.nameMax),
      ],
    }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.required, phoneValidator] }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.email, Validators.maxLength(AUTH_LIMITS.emailMax)],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(AUTH_LIMITS.passwordMin),
        Validators.maxLength(AUTH_LIMITS.passwordMax),
      ],
    }),
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
    const { fullName, phone, email, password } = this.form.getRawValue();
    this.submitting.set(true);
    this.error.set('');
    try {
      const user = await this.auth.register({
        fullName: fullName.trim(),
        phone: phone.trim(),
        password,
        ...(email.trim() ? { email: email.trim() } : {}),
      });
      await this.nav.navigateRoot(urlAfterAuth(user, this.returnUrl()));
    } catch (error) {
      this.error.set(toApiError(error).message);
    } finally {
      this.submitting.set(false);
    }
  }
}
