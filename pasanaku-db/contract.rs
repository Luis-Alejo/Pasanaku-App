#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, token, Address, Env, Vec,
};

#[contracttype]
#[derive(Clone)]
pub struct GroupConfig {
    pub admin_server: Address, // Backend wallet (única autorizada para ejecutar pagos de turno)
    pub usdc_token: Address, // Dirección del Stellar Asset Contract (USDC)
    pub contribution: i128,  // Cuota en stroops (USDC * 10^7)
    pub guarantee: i128, // Garantía en stroops (ej. 5 * 10^7)
    pub round_duration: u64, // Segundos por ronda (ej. 604800 para 7 días)
    pub current_round: u32,
    pub last_round_timestamp: u64,
}

#[contracttype]
pub enum DataKey {
    Config,
    Participants, // Vec<Address> ordenado por turno
    PaidInRound(u32, Address), // bool: si el usuario pagó la ronda X
    GuaranteeLocked(Address), // i128: saldo de garantía del usuario
    Reputation(Address), // u32: reputación on-chain (Persistent storage)
}

#[contract]
pub struct PasanakuContract;

#[contractimpl]
impl PasanakuContract {
    // Inicializar el Pasanaku
    pub fn init(
        env: Env,
        admin_server: Address,
        usdc_token: Address,
        contribution: i128,
        guarantee: i128,
        round_duration: u64,
    ) {
        let config = GroupConfig {
            admin_server,
            usdc_token,
            contribution,
            guarantee,
            round_duration,
            current_round: 1,
            last_round_timestamp: env.ledger().timestamp(),
        };
        env.storage().instance().set(&DataKey::Config, &config);
        env.storage().instance().set(&DataKey::Participants, &Vec::<Address>::new(&env));
        
        // Extender TTL para evitar expiración durante la hackathon
        env.storage().instance().extend_ttl(100_000, 200_000);
    }

    // Unirse al grupo depositando la garantía (ej. 5 USDC)
    pub fn join_group(env: Env, participant: Address) {
        participant.require_auth();
        let config: GroupConfig = env.storage().instance().get(&DataKey::Config).unwrap();
        let token_client = token::Client::new(&env, &config.usdc_token);

        // Transferir garantía del usuario al contrato
        token_client.transfer(&participant, &env.current_contract_address(), &config.guarantee);

        let mut participants: Vec<Address> = env.storage().instance().get(&DataKey::Participants).unwrap();
        participants.push_back(participant.clone());

        env.storage().instance().set(&DataKey::Participants, &participants);
        env.storage().persistent().set(&DataKey::GuaranteeLocked(participant.clone()), &config.guarantee);
        env.storage().persistent().extend_ttl(&DataKey::GuaranteeLocked(participant.clone()), 100_000, 200_000);

        // Emitir evento para que Prisma lo indexe
        env.events().publish((symbol_short!("joined"), participant), config.guarantee);
    }

    // Pagar cuota de la ronda actual
    pub fn pay_round(env: Env, participant: Address) {
        participant.require_auth();
        let config: GroupConfig = env.storage().instance().get(&DataKey::Config).unwrap();
        let token_client = token::Client::new(&env, &config.usdc_token);

        token_client.transfer(&participant, &env.current_contract_address(), &config.contribution);
        
        let key = DataKey::PaidInRound(config.current_round, participant.clone());
        env.storage().persistent().set(&key, &true);

        // Evento que escucha el backend (NestJS/FastAPI)
        env.events().publish((symbol_short!("paid"), config.current_round, participant), config.contribution);
    }

    // Distribuir el pozo al ganador del turno (Solo ejecutable por el Backend)
    pub fn pagar_turno_actual(env: Env, beneficiary: Address) {
        let mut config: GroupConfig = env.storage().instance().get(&DataKey::Config).unwrap();
        
        // verificar firma del servidor backend
        config.admin_server.require_auth();

        let participants: Vec<Address> = env.storage().instance().get(&DataKey::Participants).unwrap();
        let token_client = token::Client::new(&env, &config.usdc_token);
        let mut total_pot: i128 = 0;

        // Revisar quién pagó y ejecutar garantía (slashing) a los morosos
        for p in participants.iter() {
            let paid_key = DataKey::PaidInRound(config.current_round, p.clone());
            let has_paid: bool = env.storage().persistent().get(&paid_key).unwrap_or(false);

            if has_paid {
                total_pot += config.contribution;
            } else {
                // Penalización: descontar de su garantía y bajar reputación
                let g_key = DataKey::GuaranteeLocked(p.clone());
                let current_g: i128 = env.storage().persistent().get(&g_key).unwrap_or(0);
                if current_g >= config.contribution {
                    env.storage().persistent().set(&g_key, &(current_g - config.contribution));
                    total_pot += config.contribution;
                }
                env.events().publish((symbol_short!("slashed"), config.current_round, p), config.contribution);
            }
        }

        // Transferir el pozo acumulado al ganador de la ronda
        token_client.transfer(&env.current_contract_address(), &beneficiary, &total_pot);

        // Avanzar ronda y actualizar timestamp
        config.current_round += 1;
        config.last_round_timestamp = env.ledger().timestamp();
        env.storage().instance().set(&DataKey::Config, &config);

        env.events().publish((symbol_short!("payout"), config.current_round - 1, beneficiary), total_pot);
    }

    // Incrementar reputación on-chain al finalizar el Pasanaku
    pub fn increment_reputation(env: Env, user: Address) {
        let config: GroupConfig = env.storage().instance().get(&DataKey::Config).unwrap();
        config.admin_server.require_auth();

        let rep_key = DataKey::Reputation(user.clone());
        let current_rep: u32 = env.storage().persistent().get(&rep_key).unwrap_or(100);
        env.storage().persistent().set(&rep_key, &(current_rep + 10));
        env.storage().persistent().extend_ttl(&rep_key, 100_000, 200_000);
    }
}
