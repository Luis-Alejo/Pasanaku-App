import { Component, ElementRef, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { toApiError } from '@core/graphql/api-error';
import type { CreateGroupInput, GroupVisibility, Periodicity, TurnMode } from '@core/models/domain.models';
import { ToastService } from '@core/services/toast.service';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonList,
  IonRadio,
  IonRadioGroup,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { MoneyPipe } from '@shared/pipes/money.pipe';
import type { AmountOption } from '@shared/ui/amount-options/amount-options.component';
import { AmountOptionsComponent } from '@shared/ui/amount-options/amount-options.component';
import { multiplyAmount, plural } from '@shared/utils/format';

import {
  GROUP_LIMITS,
  amountValidator,
  integerValidator,
  normalizeAmount,
  trimmedLengthValidator,
} from '../../data-access/group-form';
import { GroupsStore } from '../../data-access/groups.store';

@Component({
  selector: 'app-create-group',
  templateUrl: './create-group.page.html',
  styleUrls: ['./create-group.page.scss'],
  imports: [
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonInput,
    IonSegment,
    IonSegmentButton,
    IonList,
    IonItem,
    IonRadioGroup,
    IonRadio,
    IonButton,
    MoneyPipe,
    AmountOptionsComponent,
  ],
})
export class CreateGroupPage {
  protected readonly store = inject(GroupsStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly limits = GROUP_LIMITS;
  protected readonly submitting = signal(false);

  protected readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        trimmedLengthValidator(GROUP_LIMITS.nameMin),
        Validators.maxLength(GROUP_LIMITS.nameMax),
      ],
    }),
    contributionAmount: new FormControl('', { nonNullable: true, validators: [Validators.required, amountValidator] }),
    assetCode: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    periodicity: new FormControl<Periodicity>('MONTHLY', { nonNullable: true }),
    memberCount: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        integerValidator,
        Validators.min(GROUP_LIMITS.membersMin),
        Validators.max(GROUP_LIMITS.membersMax),
      ],
    }),
    visibility: new FormControl<GroupVisibility>('PRIVATE', { nonNullable: true }),
    turnMode: new FormControl<TurnMode>('AGREEMENT', { nonNullable: true }),
  });

  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  protected readonly selectedAsset = computed(() => {
    const code = this.value().assetCode;
    return this.store.assets().find((a) => a.code === code) ?? null;
  });

  /** Resumen en vivo: cuánto se junta cada ronda y cuánto dura el ciclo. */
  protected readonly summary = computed(() => {
    const amount = normalizeAmount(this.value().contributionAmount);
    const members = Number(this.value().memberCount);
    const asset = this.selectedAsset();
    if (
      !amount ||
      !asset ||
      !Number.isInteger(members) ||
      members < GROUP_LIMITS.membersMin ||
      members > GROUP_LIMITS.membersMax
    ) {
      return null;
    }
    const unit =
      this.value().periodicity === 'BIWEEKLY'
        ? plural(members, 'quincena', 'quincenas')
        : plural(members, 'mes', 'meses');
    return { payout: multiplyAmount(amount, members, asset.decimals), asset, members, duration: `${members} ${unit}` };
  });

  /** Montos rápidos del kit (Amount / Default · Active). Tocar uno rellena el campo. */
  protected readonly quickAmounts: AmountOption[] = ['50', '100', '200', '500'].map((v) => ({ value: v, label: v }));

  /** El monto rápido que coincide con lo escrito (null si la persona escribió otro). */
  protected readonly quickAmount = computed(() => {
    const typed = normalizeAmount(this.value().contributionAmount);
    return this.quickAmounts.find((q) => normalizeAmount(q.value) === typed)?.value ?? null;
  });

  protected pickAmount(value: string | null): void {
    if (!value) return;
    const control = this.form.controls.contributionAmount;
    control.setValue(value);
    control.markAsDirty();
    control.markAsTouched();
  }

  constructor() {
    void this.store.loadAssets();
    // Primera moneda por defecto cuando llegan las monedas de la API.
    effect(() => {
      const first = this.store.assets()[0];
      const control = this.form.controls.assetCode;
      if (first && !control.value) {
        control.setValue(first.code);
      }
    });
  }

  /** Mensaje de error del campo (Ionic lo muestra solo después de tocarlo). */
  protected errorFor(field: keyof typeof this.form.controls): string {
    const errors = this.form.controls[field].errors;
    if (!errors) {
      return '';
    }
    switch (field) {
      case 'name':
        if (errors['required']) return 'Escribe un nombre para el grupo.';
        if (errors['minTrimmed']) return `El nombre debe tener al menos ${GROUP_LIMITS.nameMin} letras.`;
        if (errors['maxlength']) return `Usa como máximo ${GROUP_LIMITS.nameMax} caracteres.`;
        break;
      case 'contributionAmount':
        if (errors['required']) return 'Escribe cuánto aporta cada miembro por ronda.';
        if (errors['amountFormat']) return 'Escribe solo números, con hasta 2 decimales. Ej.: 500 o 37,50.';
        if (errors['amountMin']) return 'El aporte debe ser mayor que 0.';
        if (errors['amountMax']) return 'El aporte es demasiado alto para esta demo.';
        break;
      case 'memberCount':
        if (errors['required']) return 'Indica cuántas personas tendrá el grupo.';
        return `Escribe un número entero entre ${GROUP_LIMITS.membersMin} y ${GROUP_LIMITS.membersMax}.`;
    }
    return 'Revisa este campo.';
  }

  protected async submit(): Promise<void> {
    if (this.submitting()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalid();
      return;
    }
    const v = this.form.getRawValue();
    const input: CreateGroupInput = {
      name: v.name.trim(),
      contributionAmount: normalizeAmount(v.contributionAmount) ?? '0.00',
      assetCode: v.assetCode,
      periodicity: v.periodicity,
      memberCount: Number(v.memberCount),
      visibility: v.visibility,
      turnMode: v.turnMode,
    };
    this.submitting.set(true);
    try {
      const group = await this.store.createGroup(input);
      void this.toast.show('Grupo creado', 'success');
      await this.router.navigate(['/tabs/groups', group.id], { replaceUrl: true });
    } catch (error) {
      const { kind, message } = toApiError(error);
      void this.toast.show(
        kind === 'forbidden' || kind === 'invalid' ? message : 'No pudimos crear el grupo. Inténtalo de nuevo.',
        'danger',
      );
    } finally {
      this.submitting.set(false);
    }
  }

  /** Lleva el foco al primer campo con error, para que el lector de pantalla lo lea. */
  private focusFirstInvalid(): void {
    // Esperar a que Ionic aplique las clases ion-invalid/ion-touched.
    setTimeout(() => {
      const first = this.host.nativeElement.querySelector<HTMLElement & { setFocus?: () => Promise<void> }>(
        'ion-input.ion-invalid',
      );
      void first?.setFocus?.();
    });
  }
}
