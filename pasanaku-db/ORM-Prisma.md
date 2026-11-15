generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ------------------------------------------------------
// ENUMS
// ------------------------------------------------------

enum GroupStatus {
  OPEN        // Buscando participantes
  ACTIVE      // Rondas en curso
  COMPLETED   // Todas las rondas finalizadas
  CANCELLED   // Cancelado antes de iniciar
}

enum Frequency {
  WEEKLY
  BIWEEKLY
  MONTHLY
}

enum TxType {
  GUARANTEE_DEPOSIT // Depósito de garantía inicial (ej. 5 USDC)
  ROUND_PAYMENT     // Pago de cuota mensual/semanal
  PAYOUT            // Cobro del pozo cuando le toca su turno
  GUARANTEE_REFUND  // Devolución de garantía al finalizar con éxito
  PENALTY_SLASH     // Ejecución de garantía por incumplimiento
}

enum TxStatus {
  PENDING_FIAT      // Esperando pago QR Simple en Pollar (BOB)
  PENDING_CHAIN     // Enviada a Soroban, esperando confirmación
  CONFIRMED         // Confirmada on-chain / fiat liquidado
  FAILED
}

enum Currency {
  USDC
  BOB
}

// ------------------------------------------------------
// MODELOS PRINCIPALES
// ------------------------------------------------------

model User {
  id               String   @id @default(uuid())
  email            String   @unique
  passwordHash     String?  // Opcional si usa login con Wallet / Passkey
  fullName         String
  phone            String?  // Necesario para notificaciones / KYC Pollar
  
  // Identidad Stellar & Reputación
  stellarPublicKey String   @unique // Ej: GABCD...
  reputationScore  Int      @default(100) // Espejo indexado de la reputación on-chain
  completedGroups  Int      @default(0)
  defaultedRounds  Int      @default(0)

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  // Relaciones
  createdGroups    PasanakuGroup[] @relation("GroupCreator")
  memberships      GroupMember[]
  transactions     Transaction[]
  notifications    Notification[]

  @@index([stellarPublicKey])
}

model PasanakuGroup {
  id                  String      @id @default(uuid())
  name                String
  description         String?
  
  // Integración Soroban (Rust Smart Contract)
  contractAddress     String?     @unique // Dirección del contrato desplegado (C...)
  adminServerAddress  String      // Llave pública del backend autorizada en el contrato
  
  // Parámetros financieros (Montos en Stroops: USDC * 10^7)
  contributionStroops BigInt      // Ej: 10 USDC = 100000000
  guaranteeStroops    BigInt      // Ej: 5 USDC  = 50000000
  maxParticipants     Int
  frequency           Frequency   @default(WEEKLY)
  
  // Métricas de búsqueda y reputación del grupo
  minReputationReq    Int         @default(80) // Reputación mínima exigida para unirse
  groupReputation     Float       @default(5.0) // Promedio de reputación de sus miembros
  
  status              GroupStatus @default(OPEN)
  currentRound        Int         @default(0)
  startDate           DateTime?
  nextDeadline        DateTime?

  creatorId           String
  creator             User        @relation("GroupCreator", fields: [creatorId], references: [id])

  createdAt           DateTime    @default(now())
  updatedAt           DateTime    @updatedAt

  // Relaciones
  members             GroupMember[]
  rounds              Round[]
  transactions        Transaction[]

  @@index([status, groupReputation])
  @@index([contributionStroops])
}

model GroupMember {
  id                String   @id @default(uuid())
  userId            String
  groupId           String
  
  turnNumber        Int      // Turno asignado (1..N) para recibir el pozo
  guaranteeLocked   Boolean  @default(false)
  hasReceivedPayout Boolean  @default(false)
  isPenalized       Boolean  @default(false) // Si se le ejecutó la garantía
  
  joinedAt          DateTime @default(now())

  user              User          @relation(fields: [userId], references: [id])
  group             PasanakuGroup @relation(fields: [groupId], references: [id])

  @@unique([userId, groupId])
  @@unique([groupId, turnNumber]) // Garantiza que no haya dos personas en el mismo turno
}

model Round {
  id              String    @id @default(uuid())
  groupId         String
  roundNumber     Int       // 1 hasta maxParticipants
  beneficiaryId   String    // UserId del ganador de esta ronda
  
  deadline        DateTime  // Sincronizado con env.ledger().timestamp()
  isCompleted     Boolean   @default(false)
  payoutTxHash    String?   // Hash de Soroban cuando el backend ejecuta pagar_turno_actual
  completedAt     DateTime?

  group           PasanakuGroup @relation(fields: [groupId], references: [id])
  transactions    Transaction[]

  @@unique([groupId, roundNumber])
}

model Transaction {
  id               String   @id @default(uuid())
  userId           String
  groupId          String
  roundId          String?  // Null si es depósito/devolución de garantía
  
  type             TxType
  status           TxStatus @default(PENDING_FIAT)
  
  // Montos On-Chain (USDC)
  amountStroops    BigInt   // Valor exacto enviado/recibido en Rust (USDC * 10^7)
  
  // Montos Rampas Fiat Bolivia (Pollar - QR Simple / Transferencia)
  fiatCurrency     Currency @default(BOB)
  fiatAmount       Decimal? @db.Decimal(12, 2) // Ej: 70.00 BOB
  exchangeRate     Decimal? @db.Decimal(10, 4) // Tasa BOB/USDC aplicada por Pollar
  pollarReference  String?  @unique // ID de orden QR o retiro en Pollar
  
  // Trazabilidad Stellar
  stellarTxHash    String?  @unique // Hash de la transacción en Horizon/Soroban
  feeSponsored     Boolean  @default(true) // Indica si el backend aplicó Fee Bump
  
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  user             User          @relation(fields: [userId], references: [id])
  group            PasanakuGroup @relation(fields: [groupId], references: [id])
  round            Round?        @relation(fields: [roundId], references: [id])

  @@index([stellarTxHash])
  @@index([pollarReference])
}

model Notification {
  id        String   @id @default(uuid())
  userId    String
  title     String
  message   String
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id])
}

// Tabla de control para el Worker que escucha eventos de Soroban
model SorobanEventCursor {
  id              String   @id @default("singleton")
  lastLedger      Int      // Último bloque escaneado
  pagingToken     String?  // Cursor de paginación de Soroban RPC
  updatedAt       DateTime @updatedAt
}
