# Pasanaku — App móvil (frontend)

*El ahorro colectivo de siempre, con confianza programable.*

Aplicación de **Pasanaku On-Chain**: un pasanaku (ahorro rotativo) digital y verificable sobre **Stellar Testnet**.
Cada ronda, todos los miembros aportan un monto fijo y una persona, según el turno, recibe el total. Cada aporte y
cada cobro queda registrado en la blockchain y se puede verificar en el explorador.

> Proyecto para la National Startups Hackathon by Stellar 2026 (Bolivia). Funciona solo con **activos de prueba**:
> no se mueve dinero real y las cifras son ilustrativas, no una oferta financiera.

## Qué hace

- **Cuenta:** registro e inicio de sesión con celular y contraseña, y verificación de identidad con el CI.
- **Grupos privados o públicos** de 2 a 20 personas, con **rondas de demostración de 3 minutos** en Testnet.
- **Invitaciones** por número de celular, con vista previa del grupo antes de unirse.
- **Orden de cobro** que define el organizador, a mano o por sorteo.
- **Aportes** en USDC o con **QR en bolivianos** (Pollar, hoy en modo simulación).
- **Desembolso automático** al miembro del turno; si alguien no paga, se usa su garantía o queda un **aporte atrasado** que puede pagar después.
- **Historial** con enlace a cada transacción en `stellar.expert`.
- **Notificaciones:** recordatorios, período de gracia, incumplimientos y cobros recibidos.
- **Billetera:** dirección Stellar y saldos de Testnet.
- **Interfaz:** modo claro y oscuro independiente del teléfono, diseño basado en Figma y pensado para Android.

## Tecnologías

Angular 22 (standalone y signals) · Ionic 9 · Capacitor 8 · TypeScript 6 · Apollo Angular + GraphQL Codegen ·
Vitest · Playwright · ESLint + Prettier.

## Requisitos

- Node.js 20 o superior y npm.
- Para usar datos reales: el **backend** (`../backend-pasanaku-app`) corriendo con PostgreSQL. Ver su README.

## Puesta en marcha

```bash
cd frontend-pasanaku-app
npm install
```

### Con datos de prueba (sin backend)

```bash
npm start            # http://localhost:4200
```

Usa datos simulados (`src/environments/environment.ts`, `useMocks: true`). Sirve para revisar el diseño y las pantallas.

### Con el backend real

1. Levanta el backend en otra terminal:
   ```bash
   cd ../backend-pasanaku-app
   npm run start:dev    # http://localhost:3000/graphql
   ```
2. Levanta la app:
   ```bash
   npm run start:real   # http://localhost:4200
   ```

La app llama a `/graphql` en su mismo origen y el servidor de desarrollo lo reenvía al backend (`proxy.conf.json`),
así que solo hace falta el puerto 4200.

### Desde el celular (misma red wifi)

```bash
npm run start:phone
```

En el celular abre `http://<IP-de-la-PC>:4200` (la IP se ve con `ipconfig`). Si no carga, permite Node en el firewall
de Windows para redes privadas.

Para probar entre dos personas, las dos deben usar el **mismo backend**. Cada una se registra con su propio celular
y su propio CI.

## Scripts

| Comando | Para qué |
|---|---|
| `npm start` | Desarrollo con datos de prueba |
| `npm run start:real` | Desarrollo contra el backend local |
| `npm run start:phone` | Igual, abierto a la red local |
| `npm run build` | Compilar (producción) |
| `npm run lint` | ESLint, verificación de tipos de e2e y Prettier |
| `npm run test:unit` | Pruebas unitarias (Vitest) |
| `npm run codegen` | Regenerar `src/app/graphql/generated.ts` a partir de `../backend-pasanaku-app/src/schema.gql` |

Ejecuta `npm run codegen` cada vez que el backend cambie su esquema GraphQL.

## Estructura

```
src/app/
├── core/        → lo que existe una vez: sesión, Apollo, acceso a datos (mock y GraphQL), servicios
├── shared/      → componentes de presentación, pipes y utilidades sin lógica de negocio
├── layout/      → pestañas inferiores
├── features/    → auth · home · groups · notifications · wallet · profile
└── graphql/     → generated.ts (generado, no editar)
src/environments/ → environment.ts (mocks), environment.real.ts (backend), environment.prod.ts
src/theme/        → paleta y tokens de diseño
```

Las pantallas piden datos a un *store*, el store a una interfaz (`GroupsApi`, `AuthApi`, `NotificationsApi`) y esa
interfaz usa los mocks o el backend según `useMocks`. La guía completa de arquitectura, diseño y convenciones está en
[`CLAUDE.md`](./CLAUDE.md).

## Notas

- La app **no guarda claves de Stellar**: el backend las custodia cifradas y firma las transacciones.
- La build de producción (`environment.prod.ts`) aún usa datos de prueba. Antes de publicarla o armar el APK hay que
  configurar la URL del backend publicado.
- Diseño basado en el UI kit comunitario "Bank & Wallet App UI Kit" de Figma, adaptado a Pasanaku.
