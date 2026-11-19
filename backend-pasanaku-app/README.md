# Pasanaku On-Chain — Backend API

Backend custodial y API **GraphQL (Code-First)** de **Pasanaku On-Chain**, construido con **NestJS**, **TypeORM**, **PostgreSQL** y el **SDK de Stellar / Soroban**.

Gestiona la autenticación de usuarios, custodia cifrada de wallets Stellar, verificación KYC, red de contactos de referencia, administración de grupos Pasanaku, conversión fiat mediante **Pollar** (QR BOB ↔ USDC) y sincronización idempotente de eventos on-chain.

---

## Stack Tecnológico

- **Framework:** NestJS (ES Modules) + Apollo GraphQL (Code-First)
- **Base de Datos:** PostgreSQL + TypeORM (migraciones explícitas)
- **Blockchain:** `@stellar/stellar-sdk` (Stellar Testnet, Soroban RPC, Fee Bump Transactions)
- **Seguridad:** JWT, Argon2/Bcrypt, cifrado simétrico **AES-256-GCM** y hashes determinísticos **HMAC-SHA256**
- **Integración Fiat:** Pasarela **Pollar** (QR bancario en BOB ↔ USDC)

---

## Arquitectura Modular (`src/`)

```text
src/
├── config/          # Validación estricta de variables de entorno
├── database/        # Configuración TypeORM, DataSource (ESM) y migraciones
├── common/          # Cifrado AES-256-GCM/HMAC, guards JWT, decoradores y utilidades Stroops
├── auth/            # Registro y login por celular (+591) con emisión de JWT
├── users/           # Perfil, wallets custodiales, KYC, referencias y listener de reputación
├── blockchain/      # Único módulo acoplado a Stellar/Soroban (fondeo, invocador e indexador)
├── groups/          # Creación de grupos, turnos (regla 30%), rondas, aportes, deudas y eventos
├── transactions/    # Historial financiero e idempotencia (en progreso)
├── payments/        # Rampa fiat BOB <-> USDC con Pollar y webhooks HMAC (en progreso)
├── notifications/   # Alertas internas y enlaces de recordatorio (en progreso)
└── scheduler/       # Tareas programadas para vencimientos y liquidación de rondas (en progreso)
```

---

## Requisitos Previos

- **Node.js** `>= 20` (compatible con Node 26 ESM)
- **PostgreSQL** `>= 15`
- **Stellar CLI** (para desplegar contratos en Testnet)

---

## Instalación y Configuración Local

### 1. Instalar dependencias

```bash
cd backend-pasanaku-app
npm install
```

### 2. Configurar variables de entorno

Copia el archivo de ejemplo y completa tus credenciales:

```bash
cp .env.example .env
```

Puedes generar las claves de seguridad rápidamente con Node.js:

```bash
# JWT_SECRET
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"

# ENCRYPTION_KEY (64 caracteres hex = 32 bytes para AES-256-GCM)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Asegúrate de tener creados en PostgreSQL la base de datos vacía (ej. `pasanaku`) y configurados en `.env` los identificadores desplegados en Stellar Testnet (`STELLAR_ADMIN_SECRET`, `USDC_CONTRACT_ID`, `REPUTATION_REGISTRY_ID` y `PASANAKU_WASM_HASH`).

### 3. Compilar y ejecutar migraciones

```bash
npm run build
npx typeorm migration:run -d dist/database/data-source.js
```

### 4. Iniciar el servidor en desarrollo

```bash
npm run start:dev
```

El **Apollo GraphQL Playground** estará disponible en:
`http://localhost:3000/graphql`

---

## Seguridad y Custodia

- **Aislamiento Web3:** Ningún módulo fuera de `blockchain/` importa `@stellar/stellar-sdk`.
- **Cifrado de Secretos:** Las llaves privadas de Stellar (`encryptedPrivateKey`) y los documentos de identidad (`encryptedCi`) se cifran en reposo con **AES-256-GCM** y nunca se exponen en el esquema GraphQL.
- **Patrocinio de Gas (Fee Bump):** El servidor patrocina las comisiones de red en XLM para que los usuarios finales operen sin fricción.
- **Escritor Único del Espejo:** Las mutations envían transacciones a Soroban y únicamente los listeners idempotentes del indexador (`ProcessedSorobanEvent`) actualizan el estado de rondas, pagos y deudas en PostgreSQL.
