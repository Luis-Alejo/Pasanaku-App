# CLAUDE.md — Frontend PasanakuApp

Este archivo es la guía de trabajo para Claude Code en `frontend-pasanaku-app`.
Léelo completo antes de empezar cualquier tarea.

---

## 1. Cómo trabajar conmigo (reglas de colaboración)

- Habla siempre en **español**.
- Trabaja **un paso a la vez** del plan de la sección 9. No adelantes pasos ni hagas tareas que no se pidieron.
- **Al terminar cada paso:**
  1. Verifica que compila (`npm run build`) y que pasa el lint (`npm run lint`). Si algo falla, corrígelo antes de seguir.
  2. Marca el paso como hecho (`[x]`) en la sección 9 de este archivo.
  3. Escríbeme un **resumen corto y general** (3–6 líneas, sin jerga innecesaria): qué hiciste, para qué sirve y qué archivos importantes tocaste.
  4. Propón el mensaje de commit (formato Conventional Commits: `feat(frontend): ...`, `chore(frontend): ...`).
  5. **Detente y espera mi confirmación** antes de pasar al siguiente paso.
- Si un paso necesita una decisión mía o del equipo (marcadas como **POR CONFIRMAR**), pregúntame antes de inventar.
- No instales librerías fuera de las indicadas sin preguntarme primero.
- No toques las carpetas `backend/` ni `db/` del repositorio: son de mis compañeros.

---

## 2. Contexto del proyecto

**PasanakuApp** es una versión digital *on-chain* del **pasanaku**: un ahorro rotativo entre un grupo de personas.
Cada ronda, todos los miembros aportan un monto fijo y una persona (según el turno) recibe el total.
El ciclo termina cuando todos recibieron su turno. La blockchain **Stellar** aporta transparencia sobre los aportes y los cobros.

**Lema:** *"El ahorro colectivo de siempre, con confianza programable."*
Se presenta como un pasanaku digital y verificable, **no** como una herramienta antidevaluación ni como un banco.

### Contexto: hackatón
- Proyecto para la **National Startups Hackathon by Stellar 2026** (Bolivia).
- Desarrollo hasta el **22 de noviembre de 2026**; Demo Day el 28 de noviembre en Santa Cruz.
- **Prioridad absoluta: un ciclo completo de pasanaku que funcione en la demo.** Todo lo que no sirva a ese ciclo se deja para después.
- Todo funciona en **Stellar Testnet** con activos de prueba. No se maneja dinero real.

### Arquitectura general del sistema
- **Contrato Soroban** (núcleo): reglas del grupo, miembros, aportes, turnos, estados y desembolsos.
- **Backend NestJS + PostgreSQL**: usuarios, grupos, notificaciones, consultas e indexación de eventos de Stellar. Expone **GraphQL**.
- **Frontend (este proyecto)**: lo que usan los participantes.
- Los **datos personales nunca van a la blockchain**. En la cadena solo va lo necesario para verificar operaciones.

### Reglas del dominio (decididas por el equipo)
- **Unidad del aporte:** la elige el grupo al crearlo: **USDC** (estable, vinculada al dólar) o **bolivianos (BOB)**.
  - **POR CONFIRMAR con backend/contrato:** en Testnet, "BOB" probablemente será un activo de prueba emitido por el equipo. El frontend muestra el código y los decimales que devuelva la API; nunca los fijes en el código.
- **Tipos de grupo:** **privado** (por invitación: familia, amigos, compañeros) y **público** (cualquiera puede unirse mientras haya cupos).
- **Orden de cobro:** lo elige el grupo:
  - **Acuerdo:** los miembros eligen turnos y pueden **negociar intercambios** (A propone a B cambiar turnos; B acepta o rechaza).
  - **Sorteo:** el orden se asigna al azar al iniciar el grupo.
- **Ciclo de vida de un grupo:** `Creación → Incorporación de miembros → Asignación de turnos → Aportes por periodo → Desembolso al miembro del turno → Cierre`.
- **Periodicidad:** quincenal o mensual (**POR CONFIRMAR** opciones exactas con backend).
- El **desembolso en el MVP es simulado** según las reglas del contrato.
- **Tono legal en la UI:** las cifras son ilustrativas; no presentes la app como oferta financiera ni prometas rendimientos.

### Fuera del MVP (versión 2 o posterior, NO implementar ahora)
Reputación e historial de cumplimiento, Soulbound Tokens o credenciales, reglas de salida, resolución de disputas, grupos por niveles, fondo de reserva e integraciones con cooperativas o proveedores.

Equipo de 3 personas, repositorio monorepo `Luis-Alejo/Pasanaku-App`:

```
Pasanaku-App/
├── backend/                  → NestJS + GraphQL (compañero)
├── db/                       → PostgreSQL (compañero)
└── frontend-pasanaku-app/    → ESTE proyecto (Angular + Ionic + Capacitor)
```

Rama de trabajo del frontend: `frontend-pasanaku`.

### Glosario del dominio (usa estos nombres en código y UI)

| Término (UI) | Nombre en código | Significado |
|---|---|---|
| Grupo / Pasanaku | `group` | El círculo de ahorro con sus miembros y reglas. |
| Miembro | `member` | Persona que participa en un grupo. |
| Ronda / Turno | `round` / `turn` | Cada periodo en que una persona cobra. |
| Aporte | `contribution` | Pago que cada miembro hace en una ronda. |
| Cobro | `payout` | Monto total que recibe el miembro del turno. |
| Billetera | `wallet` | Cuenta Stellar del usuario. |
| Intercambio de turno | `turnSwap` | Propuesta entre dos miembros para cambiar sus turnos. |
| Sorteo | `draw` | Asignación aleatoria del orden de cobro. |
| Grupo público / privado | `visibility: PUBLIC \| PRIVATE` | Quién puede unirse. |
| Modo de turnos | `turnMode: AGREEMENT \| DRAW` | Cómo se decide el orden. |
| Moneda del grupo | `asset: USDC \| BOB` | Unidad de los aportes. |

> Los nombres exactos de campos y enums los define el **esquema GraphQL del backend**. Cuando exista, usa los suyos aunque difieran de esta tabla.

---

## 3. Stack y versiones (ya instaladas)

- **Angular 22** — componentes standalone, *signals*, sin `NgModule`.
- **Ionic 9** (`@ionic/angular`) + **Ionicons 8**.
- **Capacitor 8** (app, haptics, keyboard, status-bar).
- **TypeScript 6**, modo `strict` y `noImplicitOverride` activos.
- Pruebas: **Vitest** (unitarias) y **Playwright** (e2e).
- Lint/format: ESLint (`@ionic/eslint-config`) + Prettier (`@ionic/prettier-config`).
- Modo oscuro: actualmente `dark.system.css` (sigue la preferencia del sistema).

### Convenciones de Angular a seguir
- `inject()` en lugar de inyección por constructor.
- `input()`, `output()`, `model()` y `computed()`/`signal()` para estado y bindings.
- Control flow nuevo en templates: `@if`, `@for` (con `track`), `@switch`.
- `ChangeDetectionStrategy.OnPush` en todos los componentes (si no es ya el predeterminado).
- Rutas con *lazy loading* (`loadComponent` / `loadChildren`).
- Componentes de Ionic: importarlos de la misma forma que lo hace la plantilla actual del proyecto; revisa una página existente antes de crear la primera y sé consistente.

---

## 4. Arquitectura (estructura de carpetas)

Organización por **funcionalidades (features)** con tres capas compartidas. Objetivo: que cualquiera del equipo sepa dónde está cada cosa.

```
src/
├── app/
│   ├── core/                       → Lo que existe UNA sola vez en toda la app
│   │   ├── graphql/                → Configuración de Apollo (cliente, links, auth, errores)
│   │   ├── auth/                   → Sesión: AuthService, guards (authGuard, guestGuard)
│   │   ├── stellar/                → Integración con Stellar/wallet (StellarService)
│   │   ├── storage/                → Guardado local (tokens, preferencias)
│   │   ├── services/               → Servicios globales (toast, loading, theme, network)
│   │   ├── models/                 → Tipos/interfaces globales que NO vienen de GraphQL
│   │   └── providers.ts            → Junta todos los providers que usa main.ts
│   │
│   ├── shared/                     → Piezas reutilizables, SIN lógica de negocio
│   │   ├── ui/                     → Componentes de presentación (tarjetas, badges, estados vacíos)
│   │   ├── pipes/                  → Pipes (formato de montos USDC/BOB, fechas, direcciones Stellar)
│   │   ├── directives/             → Directivas reutilizables
│   │   └── utils/                  → Funciones puras de ayuda
│   │
│   ├── layout/                     → Estructura de navegación
│   │   └── tabs/                   → Shell con las pestañas inferiores
│   │
│   ├── features/                   → Una carpeta por funcionalidad del negocio
│   │   ├── auth/                   → Login, registro
│   │   ├── home/                   → Inicio / resumen del usuario
│   │   ├── groups/                 → Grupos: lista, detalle, crear, unirse
│   │   ├── contributions/          → Aportes y pagos
│   │   ├── wallet/                 → Billetera Stellar
│   │   └── profile/                → Perfil y ajustes
│   │
│   ├── graphql/
│   │   └── generated.ts            → GENERADO por GraphQL Codegen (no editar a mano)
│   │
│   ├── app.component.ts
│   └── app.routes.ts               → Rutas raíz (auth vs. tabs)
│
├── environments/                   → URLs de API y red Stellar por entorno
└── theme/
    └── variables.scss              → Paleta y tokens de diseño (sección 6)
```

### Estructura interna de cada feature

```
features/groups/
├── pages/                  → Pantallas (una por ruta). Componentes "inteligentes".
│   ├── group-list/
│   ├── group-detail/
│   └── create-group/
├── components/             → Piezas de UI propias de esta feature. Componentes "tontos".
│   ├── group-card/
│   └── turn-timeline/
├── data-access/            → Cómo se obtienen y guardan los datos
│   ├── groups.graphql      → Queries y mutations de GraphQL de esta feature
│   └── groups.store.ts     → Estado con signals + llamadas a los servicios generados
├── models/                 → Tipos propios de la vista (si hacen falta)
└── groups.routes.ts        → Rutas de la feature (lazy)
```

### Qué hace cada tipo de archivo

| Tipo | Responsabilidad | Regla |
|---|---|---|
| **Page** (`*.page.ts`) | Pantalla de una ruta. Pide datos al *store* y los pasa a los componentes. | Puede inyectar stores/servicios. Poca lógica visual. |
| **Component** (`*.component.ts`) | Pinta algo. Recibe datos por `input()` y avisa con `output()`. | **No** inyecta servicios de datos. Reutilizable y fácil de probar. |
| **Store** (`*.store.ts`) | Guarda el estado de la feature con signals y llama a la API. | Un store por feature. Expone signals de solo lectura. |
| **Service** (`*.service.ts`) | Lógica técnica (Stellar, almacenamiento, toasts). | Vive en `core/` si es global. |
| **`.graphql`** | Define qué datos se piden al backend. | Codegen crea servicios tipados a partir de él. |
| **Guard** (`*.guard.ts`) | Protege rutas (ej. requiere sesión). | Funcional (`CanActivateFn`). |
| **Pipe** (`*.pipe.ts`) | Formatea datos en el template. | Puro, sin efectos secundarios. |

### Reglas de dependencias (importante)

```
features  ──►  shared, core, graphql/generated
layout    ──►  shared, core
shared    ──►  (nada de features ni core con estado)
core      ──►  graphql/generated
```

- Una feature **no importa** el interior de otra feature. Si dos la necesitan, va a `shared/` o `core/`.
- `shared/` no conoce el negocio: no sabe qué es un "grupo".
- Los tipos de datos del backend **siempre** salen de `graphql/generated.ts`, nunca se escriben a mano.

### Alias de imports (configurar en `tsconfig.json`, sin `baseUrl`)

```
@core/*      → src/app/core/*
@shared/*    → src/app/shared/*
@features/*  → src/app/features/*
@layout/*    → src/app/layout/*
@gql         → src/app/graphql/generated
@env/*       → src/environments/*
```

### Nombres de archivos
- `kebab-case` para archivos y carpetas: `group-card.component.ts`.
- Sufijos: `.page.ts`, `.component.ts`, `.store.ts`, `.service.ts`, `.guard.ts`, `.pipe.ts`.
- Generar con el CLI cuando sea posible, por ejemplo:
  `ionic generate page features/groups/pages/group-list`
  `ionic generate component features/groups/components/group-card`

---

## 5. Navegación y pantallas del MVP

- **Fuera de sesión:** `/auth/login`, `/auth/register`.
- **Dentro de sesión (tabs):** Inicio · Grupos · Perfil.
  La billetera vive dentro de Perfil en el MVP (dirección Stellar y saldo de Testnet). Solo pasa a ser pestaña propia si sobra tiempo.

| Pantalla | Ruta | Qué muestra / hace |
|---|---|---|
| Inicio | `/tabs/home` | Mis grupos activos, próximo aporte pendiente y si se acerca mi turno de cobro. |
| Grupos | `/tabs/groups` | Segmento **Mis grupos / Públicos**. Botón para crear un grupo. |
| Crear grupo | `/tabs/groups/new` | Nombre, monto del aporte, moneda (USDC/BOB), periodicidad, nº de miembros, visibilidad y modo de turnos (acuerdo/sorteo). |
| Detalle de grupo | `/tabs/groups/:id` | Estado del ciclo, fondo de la ronda, **línea de turnos**, miembros y aportes del periodo (pagado/pendiente/atrasado). Acciones según el estado. |
| Unirse | `/join/:code` o desde Públicos | Resumen de reglas y botón para aceptar las condiciones y unirse. |
| Turnos | `/tabs/groups/:id/turns` | Elegir turno (modo acuerdo), proponer, aceptar o rechazar intercambios, o ver el resultado del sorteo. |
| Registrar aporte | `/tabs/groups/:id/contribute` | Monto, periodo, confirmación y estado de la transacción en Testnet. |
| Historial | `/tabs/groups/:id/history` | Línea de tiempo de aportes, desembolsos e intercambios, con enlace a la transacción en el explorador de Testnet. |
| Perfil | `/tabs/profile` | Datos del usuario, billetera Stellar y cerrar sesión. |

**El "camino de la demo"** (debe funcionar de principio a fin sin fallos):
crear grupo → invitar/unirse → definir turnos (acuerdo con un intercambio, o sorteo) → aportes del periodo → desembolso al del turno → historial verificable.

---

## 6. Diseño: paleta y temas

Paleta verificada con contraste WCAG: texto principal ≥ 7:1, texto secundario ≥ 4.5:1, etiquetas sobre color ≥ 4.5:1 y colores de estado ≥ 3:1 sobre el fondo.

**Concepto:** base fría y neutra (confianza, dinero) con **un solo acento turquesa** para la acción principal. Los colores de estado (pagado, pendiente, atrasado) solo se usan para comunicar estado, nunca como decoración.

### Modo claro

| Token | Hex | Uso |
|---|---|---|
| Fondo app | `#f7f9fa` | `--ion-background-color` |
| Tarjeta | `#ffffff` | `--ion-card-background`, `--ion-item-background` |
| Escalón (inputs, segmentos, barras) | `#ecf0f2` | fondos secundarios |
| Texto | `#1f3038` | `--ion-text-color` |
| Texto secundario | `#5d6b72` | etiquetas, fechas, ayudas (`medium`) |
| **primary** | `#0d7480` | botón principal, enlaces, foco, progreso |
| secondary | `#3c4f57` | botones neutros |
| success | `#1e7a46` | aporte pagado / confirmado |
| warning | `#9a5b00` | aporte pendiente / por vencer |
| danger | `#c0362c` | atrasado / error / acciones destructivas |

Texto sobre todos los colores anteriores: `#ffffff` (rgb `255,255,255`).

### Modo oscuro

| Token | Hex |
|---|---|
| Fondo app | `#0b1215` |
| Tarjeta | `#141d21` |
| Escalón | `#1d282d` |
| Texto | `#e8eef0` |
| Texto secundario | `#93a3a9` |
| **primary** | `#4fc1cc` |
| secondary | `#a9bac0` |
| success | `#4cc38a` |
| warning | `#f0b45a` |
| danger | `#f07a70` |

Texto sobre los colores en modo oscuro: `#0b1215` (rgb `11,18,21`).

### Shade y tint (calculados al estilo de Ionic: shade = 12 % negro, tint = 10 % blanco)

| Color | Claro: shade / tint | Oscuro: shade / tint |
|---|---|---|
| primary | `#0b6671` / `#25828d` | `#46aab4` / `#61c7d1` |
| secondary | `#35464d` / `#506168` | `#95a4a9` / `#b2c1c6` |
| success | `#1a6b3e` / `#348758` | `#43ac79` / `#5ec996` |
| warning | `#885000` / `#a46b1a` | `#d39e4f` / `#f2bc6a` |
| danger | `#a93027` / `#c64a41` | `#d36b63` / `#f2877e` |

RGB: primary `13,116,128` / `79,193,204` · secondary `60,79,87` / `169,186,192` · success `30,122,70` / `76,195,138` · warning `154,91,0` / `240,180,90` · danger `192,54,44` / `240,122,112`.

### Reglas de implementación del tema
- Define cada color con sus 6 variables de Ionic: `--ion-color-X`, `-rgb`, `-contrast`, `-contrast-rgb`, `-shade`, `-tint`.
- Claro en `:root`; oscuro dentro de `@media (prefers-color-scheme: dark)`.
- Revisa `node_modules/@ionic/angular/css/palettes/dark.system.css`: allí los fondos oscuros se definen con selectores `:root.ios` / `:root.md`. Las anulaciones de fondo y texto deben tener la misma especificidad y cargarse **después** de ese import en `global.scss`.
- `theme-color` por esquema en `index.html` (skill **mobile-native**): claro `#f7f9fa`, oscuro `#0b1215`.
- **Un solo botón principal (primary) por pantalla.** El resto: `secondary`, `outline` o `clear`.
- Montos: números tabulares (`font-variant-numeric: tabular-nums`) para que no "bailen".
- No uses violeta ni lavanda en la interfaz.

---

## 7. GraphQL (comunicación con el backend NestJS)

### Instalación (paso 9 del plan)
```bash
ng add apollo-angular            # instala apollo-angular, @apollo/client y graphql; pide la URL del endpoint
npm i -D @graphql-codegen/cli @graphql-codegen/typescript @graphql-codegen/typescript-operations @graphql-codegen/typescript-apollo-angular
```
Opcional, solo si el backend usa *subscriptions* (actualizaciones en tiempo real de pagos/turnos): `npm i graphql-ws`. **POR CONFIRMAR** con el backend.

### Configuración
- Mueve el provider que crea `ng add` a `core/graphql/` y regístralo en `core/providers.ts`.
- URL del endpoint en `environments` (`apiUrl: 'http://localhost:3000/graphql'` en desarrollo; **POR CONFIRMAR** puerto real).
- Link de autenticación que añade `Authorization: Bearer <token>`.
- Link de errores que muestre un toast entendible y cierre sesión si el token expiró.
- `codegen.ts` en la raíz:
  - `schema`: la URL del backend (o el `schema.gql` que genera NestJS en `backend/`).
  - `documents`: `src/app/**/*.graphql`.
  - salida: `src/app/graphql/generated.ts` con los plugins `typescript`, `typescript-operations`, `typescript-apollo-angular`.
  - `config: { addExplicitOverride: true }` (obligatorio porque `noImplicitOverride` está activo).
- Script en `package.json`: `"codegen": "graphql-codegen"`.
- Verifica que el código generado compila con la versión instalada de `apollo-angular`; si los imports no coinciden, ajusta la opción `apolloAngularVersion` del plugin.

### Avisar al compañero del backend
NestJS debe permitir CORS desde `http://localhost:8100` (web) y desde los orígenes de Capacitor (`https://localhost` en Android, `capacitor://localhost` en iOS).

---

## 8. Stellar (cuando lleguemos a ese paso)

- Librería base: `@stellar/stellar-sdk`. Red: **testnet** en desarrollo (configurar en `environments`).
- El historial enlaza cada operación al explorador de Testnet (URL base configurable en `environments`), porque la transparencia verificable es el argumento central de la demo.
- **POR CONFIRMAR con el equipo:** cómo firma el usuario.
  - Freighter es una extensión del navegador: sirve en la web, **no** dentro de la app móvil de Capacitor.
  - Para el móvil hace falta otra opción (wallet móvil con WalletConnect, o cuentas gestionadas por el backend).
- Nunca guardes claves secretas en el código ni en el repositorio.

---

## 9. Plan de trabajo paso a paso (recortado al MVP de la hackatón)

Marca `[x]` al terminar cada paso y espera mi confirmación antes del siguiente.
Hay poco tiempo (entrega el 22 de noviembre): **prioriza que funcione sobre que sea perfecto**, sin romper la arquitectura.

**Datos de prueba (mock) mientras el backend no esté listo:** cada `store` lee de un servicio de datos. Mientras no exista la API, usa una implementación *mock* con datos realistas (`features/*/data-access/*.mock.ts`), activable con un flag en `environments` (`useMocks: true`). Así el frontend avanza en paralelo y la conexión real es solo cambiar el flag.

- [x] **Paso 0 — Limpieza inicial**
  - `index.html`: `lang="es"`, título "Pasanaku".
  - `capacitor.config.ts`: `appName: 'Pasanaku'`; `appId` **POR CONFIRMAR** (sugerencia: `com.pasanaku.app`). Pregúntame antes de cambiarlo.
  - Quitar `explore-container` y el contenido de ejemplo de las pestañas (tab1/tab2/tab3).
- [x] **Paso 1 — Estructura de carpetas y alias**
  - Crear las carpetas de la sección 4 (con un `.gitkeep` en las vacías).
  - Configurar los alias en `tsconfig.json`.
  - Crear `core/providers.ts` y usarlo desde `main.ts`.
  - Mover las tabs a `layout/tabs/` con 3 pestañas (Inicio, Grupos, Perfil) como páginas vacías.
- [x] **Paso 2 — Tema y ajustes móviles**
  - Paleta claro/oscuro de la sección 6 en `theme/variables.scss` y anulaciones en `global.scss`.
  - `theme-color` por esquema y los arreglos imprescindibles de la skill **mobile-native** (tap highlight, safe areas, zoom de inputs).
- [x] **Paso 3 — Modelos, mocks y componentes base**
  - Tipos provisionales del dominio (grupo, miembro, turno, aporte, intercambio), reemplazables luego por los de `graphql/generated.ts`.
  - Mocks con datos realistas y el flag `useMocks`.
  - `shared/ui`: badge de estado de aporte, tarjeta de monto, estado vacío, línea de turnos; pipe de montos que respete la moneda (USDC/BOB) y sus decimales.
  - Probar los componentes con datos extremos (skill **break-ui**).
- [x] **Paso 4 — Grupos: lista y detalle** (segmento Mis grupos/Públicos, detalle con estado, fondo, línea de turnos y aportes).
- [x] **Paso 5 — Crear grupo y unirse** (formulario con validaciones; unirse por código o desde Públicos).
- [x] **Paso 6 — Turnos** (modo acuerdo con intercambio propuesto/aceptado/rechazado; modo sorteo con resultado visible).
- [ ] **Paso 7 — Aportes, desembolso e historial** (registrar aporte, estado de la transacción, desembolso simulado y línea de tiempo).
- [ ] **Paso 8 — Inicio y Perfil** (resumen, próximo aporte, billetera con dirección y saldo de Testnet).
- [ ] **Paso 9 — GraphQL real** (sección 7): Apollo + Codegen, reemplazar mocks por la API cuando el backend esté disponible. *Puede adelantarse si el backend está listo antes.*
- [ ] **Paso 10 — Autenticación** (login, registro, guards) según lo que defina el backend.
- [ ] **Paso 11 — Ensayo de la demo** (recorrer el "camino de la demo" de la sección 5 en navegador y en Android; corregir lo que falle).

Solo si sobra tiempo: animaciones y pulido (skills de animación), billetera como pestaña propia y firma con wallet.

---

## 10. Skills disponibles y cuándo usarlas

Están en `.claude/skills/`. Úsalas cuando apliquen:

| Skill | Cuándo |
|---|---|
| `mobile-native` | Pasos 2 y 11: que la app se sienta nativa (safe areas, inputs, taps, `theme-color`). |
| `modern-web-guidance` | Antes de construir formularios, modales, listas o validaciones. |
| `emil-design-eng`, `apple-design` | Pulido de componentes, estados de presión, transiciones. |
| `animate`, `choreograph`, `gestures` | Animaciones, listas escalonadas, gestos de deslizar o arrastrar. |
| `animation-performance` | Si una animación va lenta. |
| `break-ui` | Probar componentes con datos extremos (nombres largos, montos enormes, listas vacías). |
| `find-animation-opportunities`, `improve-animations`, `review-animations`, `remove-animations` | Auditoría de movimiento, solo si sobra tiempo. |
| `prototype` | Cuando quiera comparar varias versiones de una pantalla. |
| `mobile-android-design` | Al diseñar pantallas y navegación pensando en Android (ver nota abajo). |

### Nota sobre `mobile-android-design`
Esta skill está escrita para **Android nativo (Kotlin + Jetpack Compose)**. Este proyecto es **Ionic + Angular**, así que:
- **NO** escribas código Kotlin/Compose ni modifiques la carpeta `android/` por esta skill.
- **SÍ** aplica sus **criterios de Material Design 3**, traducidos a Ionic (que en Android usa el modo `md`, basado en Material Design):
  - **Áreas táctiles de mínimo 48×48 px** en botones, íconos y elementos de lista.
  - **Roles de color:** las superficies de "contenedor" usan versiones suaves del color (como `primaryContainer` en M3) y el texto secundario usa `medium`. Siempre con los tokens de la sección 6, nunca con colores nuevos.
  - **Escala tipográfica consistente** (títulos, cuerpo, etiquetas) definida una sola vez en `global.scss`.
  - **Navegación:** barra inferior (tabs) con **badges** para avisos (ej. aporte pendiente o intercambio de turno recibido).
  - **Botón "atrás" de Android:** debe comportarse de forma predecible (cerrar modales/sheets primero, luego volver de pantalla y, en la raíz de las tabs, salir de la app). Usa el manejo de Ionic/`@capacitor/app` para esto.
  - **Deep links:** encaja con la ruta `/join/:code` para invitar a grupos privados (si sobra tiempo, configurar el enlace en Android).
  - **Accesibilidad:** etiquetas (`aria-label`) en todos los botones de solo ícono.
- **No** uses el *color dinámico* de Material You (colores del fondo de pantalla del usuario): la app mantiene su paleta propia de la sección 6.
- Si la guía de esta skill choca con `mobile-native` o con la paleta de la sección 6, **mandan las reglas de este archivo**.

No aplican a este proyecto: `animate-expo` (React Native), `write-swift` (Swift), `ask-sonner` (React). `design-taste-frontend` es para sitios web: usa solo sus criterios de color y contraste, no su flujo de landing pages.

---

## 11. Comandos útiles

```bash
ionic serve                 # desarrollo en el navegador (http://localhost:8100)
npm run build               # compilar
npm run lint                # revisar estilo y errores
npm run test:unit           # pruebas unitarias (Vitest)
npm run codegen             # regenerar tipos y servicios GraphQL (tras el paso 3)
ionic build && npx cap sync # preparar la app nativa
npx cap open android        # abrir en Android Studio
```
