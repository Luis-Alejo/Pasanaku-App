import { Component } from '@angular/core';

/**
 * Encabezado índigo del kit (Home, Setting, Transaction report): una franja de
 * color de marca arriba y una "hoja" con esquinas redondeadas que sube sobre
 * ella. Lo que se marque con el atributo `pkOverlap` (ej. la tarjeta de saldo)
 * queda montado entre la franja y la hoja.
 *
 * Uso:
 *   <app-brand-header>
 *     <h1>Hola, Ana</h1>              ← va en la franja índigo
 *     <app-amount-card pkOverlap … /> ← se superpone al borde
 *   </app-brand-header>
 *
 * En modo oscuro la franja usa la superficie elevada con borde (sección 6).
 */
@Component({
  selector: 'app-brand-header',
  templateUrl: './brand-header.component.html',
  styleUrls: ['./brand-header.component.scss'],
})
export class BrandHeaderComponent {}
