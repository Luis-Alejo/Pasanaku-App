# CLAUDE.md — Frontend PasanakuApp

Este archivo es la guía de trabajo para Claude Code en `frontend-pasanaku-app`.
Léelo completo antes de empezar cualquier tarea.

---

## 1. Cómo trabajar conmigo (reglas de colaboración)

- Habla siempre en **español**.
- Trabaja **un paso a la vez** del plan de la sección 9. No adelantes pasos ni hagas tareas que no se pidieron.
- **Al terminar cada paso:**
  1. Verifica que compila (`npm run build`) y que pasa el lint (`npm run lint`). Si algo falla, corrígelo antes de seguir.
  2. Marca el paso como hecho (`[x]`) en la sección 9 de este archivo. **Antes de editar este archivo, vuelve a leerlo completo**: puede haber sido actualizado desde fuera, y no debes borrar esos cambios. Cambia solo la casilla, sin reescribir el resto.
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
- Modo oscuro: hasta el paso 8 sigue al sistema (`dark.system.css`). Desde el paso 8.5.b se elige dentro de la app con un botón (`dark.class.css`), sin depender del tema del dispositivo.

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

## 6. Diseño: Figma como referencia visual

### Fuente de verdad del diseño
- **Archivo de Figma:** `https://www.figma.com/design/LfEmxPoxBYwZInCXYzlWTq/` (copia del UI kit comunitario "Bank & Wallet App UI Kit" en la cuenta institucional). `fileKey`: `LfEmxPoxBYwZInCXYzlWTq`.
  - Página **Style** (`391:32700`): tipografía, sombras y colores.
  - Página **Components** (`14:0`): botones, tarjetas, tabs, barra inferior, filas, campos de texto, íconos e ilustraciones.
  - Página **Design** (`2:20347`): más de 200 pantallas de referencia.
- **El MCP de Figma es la referencia principal** (no hay capturas exportadas). La cuenta está en el plan **Education (student)** con asiento **Full**: 200 consultas de lectura por día y 10 por minuto (`whoami` no cuenta). Los valores exactos (colores, tipografía, sombras) ya están en esta sección.
- **Úsalo con moderación, sin pedir permiso en cada llamada:** consulta solo los marcos que necesites para la pantalla o componente en curso, nunca recorras páginas enteras, y prefiere `get_metadata` (nombres e ids) antes de pedir imágenes o código de un marco. Si alcanzas el límite, avísame.
- Si no encuentras en Figma la referencia de alguna pantalla, pregúntame en vez de inventar el diseño.

### Qué manda en cada cosa (prioridad)
1. **Figma manda** en lo visual: colores, tipografía, formas, radios, sombras, espaciados, iconografía, ilustraciones y la composición de cada pantalla.
2. **Material Design 3 y las skills mandan** en comportamiento y accesibilidad: áreas táctiles de 48×48 px, botón "atrás" de Android, foco, `aria-label`, animaciones y sensación nativa (`mobile-native`, `mobile-android-design`, `emil-design-eng`).
3. **Contraste WCAG manda sobre Figma:** si un color del kit no es legible como texto, se usa la versión corregida de la tabla de abajo. El aspecto se mantiene, pero se lee.
4. **La arquitectura** (sección 4), el dominio (sección 2) y las pantallas del MVP (sección 5) **no cambian**: el kit es de banca y se **adapta** al pasanaku, no se copia.
5. Si Figma y MD3 chocan de una forma que cambie mucho el aspecto, pregúntame.

### Qué NO copiar del kit
- Marcas y nombres: "iBank", "FinPay", "John Smith", "Amazon Platinum", logos de **VISA**, banderas y datos de ejemplo. La marca es **Pasanaku** y los datos salen de los mocks o de la API.
- Teclados, barras de estado y diálogos dibujados de iOS (Touch ID, etc.): los pone el sistema.
- Pantallas de banca que no existen en el MVP (tarjetas de crédito, facturas de luz/agua, sucursales, idiomas).
- **POR CONFIRMAR (yo):** la licencia del kit en su página de Figma Community. Si pide atribución, añade el crédito en la pantalla "Acerca de" o en el README.

### Cómo se adapta el kit a Pasanaku

| Patrón del kit | Uso en Pasanaku |
|---|---|
| Encabezado índigo sólido + tarjeta de saldo | Inicio y detalle de grupo: fondo de la ronda, moneda, turno actual |
| Tarjeta degradada (estilo tarjeta de crédito) | "Tarjeta" del grupo, sin números de tarjeta ni logos |
| Cuadrícula de accesos con ícono en cuadro de color | Acciones rápidas: aportar, ver turnos, invitar, historial |
| Historial por mes con estado | Aportes por periodo: pagado / pendiente / atrasado |
| Transferencia con montos rápidos ($10 / $20 / $30) | Registrar aporte y elegir monto al crear grupo |
| Beneficiarios con avatar | Miembros del grupo y línea de turnos |
| Tabs tipo pastilla | Segmento Mis grupos / Públicos; modo acuerdo / sorteo |
| Pantalla de cambio de divisas | Selector USDC / BOB |
| Login, registro, OTP | Autenticación |
| Barra inferior con pastilla activa (ícono + texto) | Tabs Inicio · Grupos · Perfil (encaja con la barra de navegación de MD3) |
| Ilustraciones (alcancía, monedas, teléfono) | Estados vacíos, bienvenida y confirmaciones |

### Tipografía
- Fuente **Poppins**, instalada localmente con `npm i @fontsource/poppins` (pesos 400, 500 y 600) para que funcione sin internet en la app nativa. No usar la CDN de Google Fonts.
- Escala del kit: Título 1 = 600/24 px · Título 2 = 600/20 px · Título 3 = 600/16 px · Cuerpo 1 = 500/16 px · Cuerpo 2 = 400/16 px · Cuerpo 3 = 500/14 px · Caption 1 = 600/12 px · Caption 2 = 500/14 px.
- Define la escala una sola vez como clases o variables en `global.scss`. Montos con `font-variant-numeric: tabular-nums`.

### Formas y sombras
- Tarjetas: fondo blanco, radio de unos 15 px y sombra `0 4px 30px rgba(54, 41, 183, 0.07)`. Versión pequeña: `0 -5px 30px rgba(54, 41, 183, 0.07)`.
- Botones principales llenos, índigo y redondeados, de ancho completo en formularios.
- Campos de texto con borde fino gris claro y caption índigo debajo.
- En **modo oscuro** no hay sombras: la elevación se marca con superficies un poco más claras (`card` y `step` de la tabla).

### Paleta — modo claro

| Token | Hex | Uso |
|---|---|---|
| Fondo app | `#ffffff` | `--ion-background-color` |
| Escalón (inputs inactivos, segmentos, chips) | `#f2f1f9` | fondos secundarios |
| Tarjeta | `#ffffff` + sombra índigo | `--ion-card-background`, `--ion-item-background` |
| Bordes / divisores | `#e0e0e0` (fuerte: `#cacaca`) | líneas, bordes de input |
| Texto | `#343434` | `--ion-text-color` (12.4:1) |
| Texto secundario | `#6b6b6b` | `medium` (5.3:1). El `#898989` del kit no se usa para texto |
| **primary** | `#281c9d` | botón principal, encabezados, links, foco |
| secondary | `#5655b9` | botones secundarios, acentos |
| tertiary | `#a8a3d7` | decoración, gráficos, fondos suaves (no para texto pequeño) |
| success | `#0f7a64` | texto/estado "pagado" |
| warning | `#9a5b00` | texto/estado "pendiente" |
| danger | `#c8264b` | texto/estado "atrasado", errores |
| info (custom `--pk-info`) | `#0067c2` | información, enlaces secundarios |

**Badges de estado (modo claro):** fondo suave + texto oscuro del mismo color:
pagado `#dcf7f1` / `#0f7a64` · pendiente `#fff0d6` / `#9a5b00` · atrasado `#ffe3e9` / `#c8264b` · info `#e0f0ff` / `#0067c2` · neutro `#f2f1f9` / `#281c9d`.
Los colores vivos del kit (`#52d5ba`, `#ffaf2a`, `#ff4267`, `#0890fe`, `#fb6b18`) se permiten **solo en íconos grandes, gráficos y cuadros de ícono**, nunca como color de texto sobre blanco.

### Paleta — modo oscuro (derivada del kit)

| Token | Hex |
|---|---|
| Fondo app | `#0f0e1f` |
| Tarjeta | `#1a1833` |
| Escalón | `#252244` |
| Bordes | `#3a3666` |
| Texto | `#ecebf7` |
| Texto secundario | `#a3a0c2` |
| **primary** | `#a8a3d7` (el lavanda del kit) |
| secondary | `#9b96f0` |
| tertiary | `#5655b9` |
| success | `#52d5ba` (color del kit, tal cual) |
| warning | `#ffaf2a` (color del kit, tal cual) |
| danger | `#ff6b85` |
| info | `#4fb0ff` |

**Badges (modo oscuro):** color lleno con texto `#0f0e1f`.
La tarjeta/encabezado índigo del modo claro pasa a `#252244` con borde `#3a3666` en modo oscuro.

### Variables completas para Ionic

| Color | Modo | Hex | RGB | Contraste (rgb) | Shade | Tint |
|---|---|---|---|---|---|---|
| primary | claro | `#281c9d` | `40,28,157` | `#ffffff` (`255,255,255`) | `#23198a` | `#3e33a7` |
| secondary | claro | `#5655b9` | `86,85,185` | `#ffffff` | `#4c4ba3` | `#6766c0` |
| tertiary | claro | `#a8a3d7` | `168,163,215` | `#281c9d` (`40,28,157`) | `#948fbd` | `#b1acdb` |
| success | claro | `#0f7a64` | `15,122,100` | `#ffffff` | `#0d6b58` | `#278774` |
| warning | claro | `#9a5b00` | `154,91,0` | `#ffffff` | `#885000` | `#a46b1a` |
| danger | claro | `#c8264b` | `200,38,75` | `#ffffff` | `#b02142` | `#ce3c5d` |
| primary | oscuro | `#a8a3d7` | `168,163,215` | `#0f0e1f` (`15,14,31`) | `#948fbd` | `#b1acdb` |
| secondary | oscuro | `#9b96f0` | `155,150,240` | `#0f0e1f` | `#8884d3` | `#a5a0f2` |
| tertiary | oscuro | `#5655b9` | `86,85,185` | `#ffffff` | `#4c4ba3` | `#6766c0` |
| success | oscuro | `#52d5ba` | `82,213,186` | `#0f0e1f` | `#48bba4` | `#63d9c1` |
| warning | oscuro | `#ffaf2a` | `255,175,42` | `#0f0e1f` | `#e09a25` | `#ffb73f` |
| danger | oscuro | `#ff6b85` | `255,107,133` | `#0f0e1f` | `#e05e75` | `#ff7a91` |

Todos los pares de texto/fondo de esta sección cumplen WCAG AA (≥ 4.5:1 en texto normal).

### Reglas de implementación del tema
- Define cada color con sus 6 variables de Ionic: `--ion-color-X`, `-rgb`, `-contrast`, `-contrast-rgb`, `-shade`, `-tint`.
- Claro en `:root`; oscuro bajo la clase `.ion-palette-dark` en `<html>` (paleta `dark.class.css` de Ionic), que activa y desactiva el botón de tema (`ThemeService` en `core/services/`). No uses `@media (prefers-color-scheme: dark)` para los colores: el tema lo elige la persona en la app.
- Revisa `node_modules/@ionic/angular/css/palettes/dark.class.css`: allí los fondos oscuros se definen con selectores `.ion-palette-dark.ios` / `.ion-palette-dark.md`. Las anulaciones de fondo y texto deben tener la misma especificidad y cargarse **después** de ese import en `global.scss`.
- Tokens propios con prefijo `--pk-` (ej. `--pk-info`, `--pk-step`, `--pk-shadow-card`, `--pk-badge-success-bg`) en `theme/variables.scss`. **Ningún componente usa hex directos.**
- `theme-color` por esquema en `index.html` (skill **mobile-native**): claro `#281c9d` si la pantalla empieza con encabezado índigo, si no `#ffffff`; oscuro `#0f0e1f`. Ajusta también `@capacitor/status-bar`.
- **Un solo botón principal (primary) por pantalla.** El resto: `secondary`, `outline` o `clear`.

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
- [x] **Paso 7 — Aportes, desembolso e historial** (registrar aporte, estado de la transacción, desembolso simulado y línea de tiempo).
- [x] **Paso 8 — Inicio y Perfil** (resumen, próximo aporte, billetera con dirección y saldo de Testnet).
- [x] **Paso 8.5 — Rediseño visual a partir de Figma (hacer ANTES del paso 9)**
  Objetivo: que toda la app use el diseño de Figma (sección 6) **sin cambiar la lógica, los stores, los mocks ni las rutas**. Es un cambio de piel, no de funcionamiento.
  Hazlo en estas sub-etapas. **Al terminar cada una, dame el resumen corto y espera mi OK**:
  - [x] **8.5.a — Lectura y plan.** Revisa en el MCP de Figma (con moderación, sección 6) los marcos necesarios y esta sección 6. Entrégame un plan breve: qué marco de Figma usarás como referencia para cada pantalla nuestra, qué componentes de `shared/ui` cambiarán y qué referencias faltan. No edites código todavía.
  - [x] **8.5.b — Tema base.** Reemplaza la paleta turquesa por la de la sección 6 (claro y oscuro), instala y aplica Poppins, define la escala tipográfica, sombras, radios y tokens `--pk-*`. Actualiza `theme-color` y la status bar.
    - **Extra:** botón para cambiar entre modo claro y oscuro dentro de la app, que **no dependa del tema del dispositivo**. La elección se guarda y se respeta al volver a abrir la app.
  - [x] **8.5.c — Componentes compartidos.** Rediseña `shared/ui` (badges de estado, tarjeta de monto, tarjeta de grupo, línea de turnos, estados vacíos, filas de lista) y el tab bar con pastilla activa. Revísalos con **break-ui**.
  - [x] **8.5.d — Pantallas, una por una:** Inicio → Grupos (lista) → Detalle de grupo → Crear grupo → Unirse → Turnos → Registrar aporte → Historial → Perfil. Para cada una, toma la referencia en Figma y adáptala al contenido real de Pasanaku.
  - [x] **8.5.e — Revisión final** con `mobile-android-design` (MD3) y `mobile-native`: áreas táctiles de 48 px, botón "atrás", `aria-label`, contraste en **claro y oscuro**, y que no quede ningún resto del kit (nombres, VISA, datos falsos). Verifica `npm run build` y `npm run lint`, y prueba en el celular.
  - Si en algún momento hay que elegir entre "igual a Figma" y "legible o accesible", gana legible y accesible, y me lo cuentas en el resumen.
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

No aplican a este proyecto: `animate-expo` (React Native), `write-swift` (Swift), `ask-sonner` (React). `design-taste-frontend` es para sitios web: usa solo sus criterios de contraste, no su flujo de landing pages ni su regla contra el violeta/lavanda (el diseño de Figma usa índigo y lavanda por decisión del equipo).

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
