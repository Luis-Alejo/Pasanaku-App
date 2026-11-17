# Pasanaku On-Chain — Smart Contracts

Contratos inteligentes de **Pasanaku On-Chain**, una implementación descentralizada del sistema de ahorro rotativo (ROSCA) sobre **Stellar**, utilizando **Soroban** y Rust.

Este módulo contiene la lógica financiera y operativa de los grupos Pasanaku, incluyendo aportes, garantías, turnos, incumplimientos, recuperación de deudas, liquidaciones y reputación de los participantes.

> **Estado del proyecto:** primera versión funcional (v1), con pruebas automatizadas. El despliegue y la validación integral en Stellar Testnet deben completarse antes de considerar el sistema listo para producción.

---

## 1. Arquitectura

El módulo está compuesto por dos contratos inteligentes independientes:

### 1.1. Pasanaku Contract

Es el contrato principal de cada grupo Pasanaku.

Responsabilidades:

- Crear e inicializar un grupo.
- Administrar participantes e invitaciones.
- Gestionar grupos públicos y privados.
- Recibir aportes y garantías.
- Administrar el orden de los turnos.
- Liquidar rondas.
- Gestionar incumplimientos y garantías.
- Registrar y recuperar deudas.
- Distribuir los fondos correspondientes.
- Cerrar el grupo y devolver garantías no utilizadas.

Cada grupo tiene su propia instancia del contrato Pasanaku.

### 1.2. Reputation Registry

Es un contrato compartido para registrar el comportamiento de los participantes en los grupos.

Responsabilidades:

- Registrar incumplimientos.
- Aplicar reglas de penalización.
- Registrar finalizaciones satisfactorias.
- Mantener puntuaciones de reputación.
- Evitar registros duplicados de un mismo incumplimiento o recompensa.
- Permitir que únicamente los grupos autorizados registren eventos.

El administrador del Registry controla qué contratos Pasanaku están autorizados para interactuar con él.

### 1.3. Relación entre contratos

```text
                 Stellar Network
                       |
             Reputation Registry
                       |
          ---------------------------
          |            |            |
       Grupo A      Grupo B      Grupo C
       Pasanaku     Pasanaku     Pasanaku
          |            |            |
       Miembros     Miembros     Miembros
```

El Registry es compartido. Cada grupo mantiene su propia instancia del contrato Pasanaku.

---

## 2. Tecnologías

| Tecnología           | Uso                                      |
| -------------------- | ---------------------------------------- |
| Rust                 | Lenguaje de programación                 |
| Soroban SDK 29.0.1   | Desarrollo de contratos                  |
| Stellar              | Red blockchain                           |
| Soroban              | Entorno de ejecución de contratos        |
| WebAssembly (WASM)   | Formato de compilación                   |
| USDC / Stellar Asset | Token utilizado para aportes y garantías |

Los contratos utilizan `#![no_std]` y tipos compatibles con el entorno de ejecución Soroban.

### Unidades monetarias

Los importes se representan mediante `i128`.

Para USDC con 7 decimales:

- 1 USDC = 10.000.000 unidades.
- 10 USDC = 100.000.000 unidades.
- 100 USDC = 1.000.000.000 unidades.

Los contratos deben recibir importes en unidades mínimas del token, no en valores decimales expresados como texto.

---

## 3. Reglas de negocio

### 3.1. Creación de grupos

Cada grupo contempla:

- Mínimo de 2 participantes.
- Máximo de 20 participantes.
- Modalidad pública o privada.
- Una contribución definida para cada ronda.
- Una garantía de participación.
- Una duración definida para las rondas.
- Un período de gracia de 3 días por defecto.

La configuración se establece al inicializar el contrato del grupo.

### 3.2. Garantía de participación

Cada participante debe depositar una garantía equivalente a una contribución completa (1x).

Ejemplo:

- Contribución por ronda: 100 USDC.
- Garantía requerida: 100 USDC.
- Depósito inicial: 200 USDC.

La garantía funciona como respaldo ante un incumplimiento.

### 3.3. Turnos y aportes

Los participantes reciben un orden de turnos mediante la cola del grupo.

En cada ronda:

1. Los participantes realizan sus aportes.
2. El contrato registra los pagos.
3. Al finalizar el plazo y el período de gracia, se puede ejecutar la liquidación.
4. Se determina el beneficiario elegible.
5. Se procesa el pago correspondiente.

La liquidación puede ser ejecutada sin intervención del beneficiario una vez superado el plazo permitido.

### 3.4. Período de gracia

El período de gracia predeterminado es de 3 días.

El comportamiento de los límites temporales es:

- Se permite pagar hasta el instante exacto de finalización de la gracia.
- La liquidación no puede realizarse en ese instante exacto.
- La liquidación se habilita cuando el tiempo actual supera el final de la gracia.

### 3.5. Incumplimientos y garantías

Cuando un participante no realiza su aporte:

1. El contrato intenta cubrir el importe pendiente utilizando su garantía.
2. Si la garantía cubre el incumplimiento, se utiliza para completar el pago de la ronda.
3. Se registra el incumplimiento en el Reputation Registry.
4. Si no existe garantía suficiente, se genera una deuda a favor del beneficiario correspondiente.

El incumplimiento no debe permitir que un participante reciba un turno mientras mantenga obligaciones pendientes que lo descalifiquen.

### 3.6. Recuperación de deudas

Los participantes pueden pagar sus deudas mediante `pay_arrears`.

Esta operación:

- Reduce la deuda pendiente.
- Reduce el shortfall correspondiente.
- Transfiere el importe directamente al beneficiario acreedor.
- No incrementa `total_contributed`.

Es importante mantener esta distinción: pagar una deuda no constituye una nueva contribución a una ronda.

### 3.7. Beneficiarios no elegibles

Si no existe un beneficiario elegible:

- El pozo de la ronda se conserva.
- No se distribuyen los fondos.
- Se rota la cola de turnos.
- Se registra el resultado de la ronda.
- El grupo avanza para volver a intentar encontrar un beneficiario elegible.

Esto evita entregar fondos a participantes que todavía tienen obligaciones pendientes.

### 3.8. Liquidación final

La implementación contempla una liquidación terminal cuando se completa un ciclo de la cola sin encontrar beneficiarios elegibles.

En ese escenario:

1. Se determina el beneficiario final.
2. El pago a ese beneficiario se limita a su contribución acumulada (`total_contributed`).
3. Si el pozo supera ese límite, el excedente se distribuye proporcionalmente entre los participantes según sus contribuciones.
4. Los importes se calculan utilizando aritmética entera.
5. El último participante de la distribución absorbe el residuo de redondeo.
6. Se devuelven las garantías no utilizadas.
7. Se comprueba que el saldo residual del contrato sea cero.

**Importante:** el disparador de liquidación terminal debe validarse y confirmarse como regla definitiva antes de utilizar fondos reales en Mainnet.

### 3.9. Cierre del grupo

Al finalizar el ciclo del grupo:

- Se devuelve la garantía no utilizada.
- Se recompensa a los participantes que completaron correctamente sus obligaciones.
- Se actualiza el estado del grupo.
- Se realizan las operaciones correspondientes en el Reputation Registry.

---

## 4. Estructura del proyecto

```text
contracts/
│
├── Cargo.toml
├── Cargo.lock
├── README.md
│
├── reputation_registry/
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs
│       └── test.rs
│
└── pasanaku/
    ├── Cargo.toml
    └── src/
        ├── lib.rs
        └── test.rs
```

Los archivos `target/`, los binarios `.wasm` y otros archivos generados no necesitan versionarse en Git.

---

## 5. Instalación y requisitos

Antes de trabajar con el módulo se necesita:

- Rust instalado.
- Cargo.
- Target de compilación WASM compatible con Soroban.
- Stellar CLI.
- Soroban SDK 29.0.1 como dependencia del proyecto.

Instalar el target WASM:

```bash
rustup target add wasm32v1-none
```

Verificar Rust:

```bash
rustc --version
cargo --version
```

Verificar Stellar CLI:

```bash
stellar --version
```

---

## 6. Ejecutar las pruebas

Desde la raíz del workspace:

```bash
cargo test -p reputation_registry
cargo test -p pasanaku
```

También se pueden ejecutar todas las pruebas del workspace:

```bash
cargo test --workspace
```

### Pruebas de Pasanaku

La suite contempla seis escenarios principales:

| Prueba                                                                   | Comportamiento verificado                            |
| ------------------------------------------------------------------------ | ---------------------------------------------------- |
| `initializes_and_joins_with_one_x_guarantee`                             | Inicialización y garantía 1x                         |
| `guarantee_covers_one_missed_round_and_pays_the_turn_holder`             | Cobertura de incumplimiento con garantía             |
| `arrears_are_paid_directly_and_do_not_increase_contributions`            | Pago directo de deuda                                |
| `payment_is_allowed_at_grace_end_but_settlement_waits_until_after`       | Límites temporales de la gracia                      |
| `no_eligible_beneficiary_preserves_pool_and_rotates_queue`               | Conservación del pozo y rotación                     |
| `final_liquidation_caps_last_beneficiary_and_distributes_excess_exactly` | Límite del beneficiario y distribución del excedente |

### Pruebas del Reputation Registry

La suite del Registry comprueba:

- Reglas de penalización por incumplimiento.
- Autorización de grupos.
- Revocación de grupos autorizados.
- Idempotencia de registros.
- Recompensas por finalización satisfactoria.

Las pruebas locales son necesarias, pero no sustituyen las pruebas de integración en Stellar Testnet.

---

## 7. Compilación de los contratos

Los contratos deben compilarse individualmente.

### Reputation Registry

```bash
cd reputation_registry
stellar contract build
```

### Pasanaku

```bash
cd ../pasanaku
stellar contract build
```

Los archivos WebAssembly generados se encuentran dentro de los directorios `target/` correspondientes.

No se deben modificar manualmente los binarios generados.

---

## 8. Orden de despliegue en Stellar

El despliegue debe realizarse primero en Testnet.

### Paso 1. Preparar una identidad

Crear o seleccionar una identidad de Stellar para Testnet y financiarla con fondos de prueba.

### Paso 2. Desplegar Reputation Registry

Desplegar el contrato Registry y guardar su Contract ID.

El Registry utiliza un constructor que recibe la dirección del administrador.

### Paso 3. Desplegar Pasanaku

Desplegar el contrato principal del grupo.

Guardar su Contract ID.

### Paso 4. Inicializar Pasanaku

Invocar `init` con los siguientes parámetros:

- Dirección del administrador.
- Dirección del token.
- Dirección del Reputation Registry.
- Contribución por ronda.
- Garantía.
- Duración de ronda.
- Máximo de participantes.
- Modalidad pública o privada.

### Paso 5. Autorizar el grupo

Desde la identidad administradora del Registry, ejecutar `set_group` para autorizar el Contract ID del grupo Pasanaku.

### Paso 6. Realizar pruebas de integración

Verificar el ciclo completo:

- Crear el grupo.
- Incorporar participantes.
- Depositar garantías.
- Iniciar el grupo.
- Realizar aportes.
- Liquidar rondas.
- Provocar incumplimientos.
- Recuperar deudas.
- Cerrar el grupo.

Las direcciones de los contratos, identidades y tokens deben guardarse en la configuración del entorno correspondiente y nunca en el código fuente.

---

## 9. Seguridad y consideraciones importantes

Antes de un despliegue en Mainnet se debe realizar una revisión de seguridad.

Aspectos prioritarios:

- Validación de autorización en todas las operaciones administrativas y financieras.
- Control de los grupos autorizados por el Registry.
- Protección contra pagos duplicados.
- Protección contra liquidaciones anticipadas.
- Validación de los estados del grupo.
- Comprobación de los saldos antes y después de cada transferencia.
- Manejo correcto de deudas y garantías.
- Revisión de operaciones con importes negativos o extremos.
- Revisión de desbordamientos aritméticos.
- Comprobación de expiración y extensión de TTL.
- Revisión de todos los caminos de cierre y liquidación.
- Validación de la distribución del excedente.
- Pruebas de integración con el token real que se utilizará en producción.

**No utilizar fondos reales hasta completar estas verificaciones y una auditoría de seguridad independiente.**

---

## 10. Compatibilidad con el frontend

El frontend debe interactuar con los contratos utilizando sus interfaces y direcciones correspondientes.

Consideraciones:

- Los importes deben convertirse correctamente a unidades mínimas del token.
- Las direcciones de contratos deben configurarse por entorno.
- El frontend debe contemplar los estados del grupo.
- Las operaciones asíncronas deben esperar confirmación de la transacción.
- El resultado de `settle_round()` puede ser `Some(Address)` o `None`.

La interfaz debe contemplar ambos resultados y no asumir que cada liquidación genera necesariamente un beneficiario.

Los clientes generados y las interfaces del frontend deben mantenerse sincronizados con los contratos desplegados.

---

## 11. Gestión de versiones

Los cambios de contratos deben registrarse mediante commits de Git.

Se recomienda:

- Mantener una versión estable del código fuente.
- Ejecutar todas las pruebas antes de cada compilación.
- Registrar los Contract IDs por red.
- Guardar los hashes de los WASM desplegados.
- Documentar cambios en interfaces públicas.
- Evitar modificar contratos de producción sin revisar la compatibilidad con el frontend y los datos existentes.

Los cambios en la interfaz pública, estructuras persistidas o reglas financieras pueden requerir migraciones o un nuevo despliegue.

---

## 12. Estado y próximos pasos

| Etapa                                  | Estado                |
| -------------------------------------- | --------------------- |
| Implementación inicial de Pasanaku     | Completada            |
| Implementación del Reputation Registry | Completada            |
| Pruebas automatizadas de Pasanaku      | Aprobadas             |
| Pruebas automatizadas del Registry     | Aprobadas             |
| `.gitignore`                           | Preparado             |
| Build WASM                             | Pendiente de validar  |
| Despliegue en Stellar Testnet          | Pendiente             |
| Pruebas de integración en Testnet      | Pendientes            |
| Auditoría de seguridad                 | Pendiente             |
| Despliegue en Mainnet                  | No autorizado todavía |

---

## 13. Objetivo del módulo

El objetivo de `pasanaku_contracts` es proporcionar una infraestructura financiera descentralizada, transparente y verificable para administrar grupos de ahorro rotativo.

La lógica financiera se ejecuta en contratos inteligentes y no depende de que un administrador central procese manualmente los aportes, turnos o liquidaciones.

**Pasanaku On-Chain — Stellar Soroban**

_Smart contracts para ahorro rotativo descentralizado._
