#![no_std]

use soroban_sdk::{
    contract, contractclient, contracterror, contractimpl, contracttype,
    symbol_short, token, Address, Env, Vec,
};

const MAX_PARTICIPANTS: u32 = 20;
const INSTANCE_THRESHOLD: u32 = 100_000;
const INSTANCE_BUMP: u32 = 200_000;
const PERSISTENT_THRESHOLD: u32 = 100_000;
const PERSISTENT_BUMP: u32 = 200_000;

#[contractclient(name = "ReputationRegistryClient")]
pub trait ReputationRegistryInterface {
    fn can_join_public(env: Env, user: Address) -> bool;
    fn get_score(env: Env, user: Address) -> u32;
    fn record_default(env: Env, group: Address, user: Address, round: u32) -> u32;
    fn reward_completion(env: Env, group: Address, user: Address) -> u32;
}

#[contracterror]
#[derive(Copy, Clone, PartialEq, Eq)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    InvalidAmount = 4,
    InvalidDuration = 5,
    InvalidParticipantLimit = 6,
    GroupNotOpen = 7,
    GroupNotActive = 8,
    GroupFull = 9,
    NotInvited = 10,
    AlreadyMember = 11,
    NotMember = 12,
    InvalidTurnOrder = 13,
    LowReputationForEarlyTurn = 23,
    NotEnoughMembers = 14,
    AlreadyPaid = 15,
    GracePeriodOver = 16,
    TooEarly = 17,
    InvalidState = 18,
    Overflow = 19,
    DebtNotFound = 20,
    DebtAmountTooLarge = 21,
    EmptyQueue = 22,
    InvalidStateForDistribution = 24,
}

#[contracttype]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GroupStatus {
    Open,
    Active,
    Completed,
}

#[contracttype]
#[derive(Clone, Copy, PartialEq, Eq)]
pub enum PaymentStatus { Paid, Guarantee, Defaulted, Exempt }

#[contracttype]
#[derive(Clone)]
pub struct GroupConfig {
    pub admin: Address,
    pub token: Address,
    pub registry: Address,
    pub contribution: i128,
    pub guarantee: i128,
    pub round_duration: u64,
    pub grace_seconds: u64,
    pub max_participants: u32,
    pub is_public: bool,
    pub current_round: u32,
    pub deadline: u64,
    pub round_pool: i128,
    /// Consecutive rounds in which no eligible beneficiary was found.
    pub no_beneficiary_rounds: u32,
    pub status: GroupStatus,
}

#[contracttype]
#[derive(Clone)]
pub struct MemberState {
    pub guarantee_balance: i128,
    pub total_contributed: i128,
    pub clean: bool,
    pub joined: bool,
}

#[contracttype]
#[derive(Clone)]
pub struct DebtRecord {
    pub beneficiary: Address,
    pub outstanding: i128,
}

#[contracttype]
pub enum DataKey {
    Config,
    Participants,
    TurnQueue,
    Invitation(Address),
    Member(Address),
    Payment(u32, Address),
    Debt(u32, Address),
    DebtTotal(Address),
    Shortfall(Address),
    RoundBeneficiary(u32),
    RoundSettled(u32),
    PendingRounds(Address),
}

#[contract]
pub struct PasanakuContract;

fn load_config(env: &Env) -> Result<GroupConfig, Error> {
    env.storage().instance().extend_ttl(INSTANCE_THRESHOLD, INSTANCE_BUMP);
    env.storage().instance().get(&DataKey::Config).ok_or(Error::NotInitialized)
}

fn save_config(env: &Env, config: &GroupConfig) { env.storage().instance().set(&DataKey::Config, config); }

fn require_admin(config: &GroupConfig, caller: &Address) -> Result<(), Error> {
    if config.admin != *caller { return Err(Error::Unauthorized); }
    caller.require_auth();
    Ok(())
}

fn participants(env: &Env) -> Vec<Address> {
    env.storage().instance().get(&DataKey::Participants).unwrap_or(Vec::new(env))
}

fn queue(env: &Env) -> Vec<Address> {
    env.storage().instance().get(&DataKey::TurnQueue).unwrap_or(Vec::new(env))
}

fn is_member(list: &Vec<Address>, user: &Address) -> bool {
    for item in list.iter() { if item == *user { return true; } }
    false
}

fn load_member(env: &Env, user: &Address) -> Result<MemberState, Error> {
    let key = DataKey::Member(user.clone());
    let value = env.storage().persistent().get(&key).ok_or(Error::NotMember)?;
    env.storage().persistent().extend_ttl(&key, PERSISTENT_THRESHOLD, PERSISTENT_BUMP);
    Ok(value)
}

fn save_member(env: &Env, user: &Address, member: &MemberState) {
    let key = DataKey::Member(user.clone());
    env.storage().persistent().set(&key, member);
    env.storage().persistent().extend_ttl(&key, PERSISTENT_THRESHOLD, PERSISTENT_BUMP);
}

fn debt_total(env: &Env, user: &Address) -> i128 {
    let key = DataKey::DebtTotal(user.clone());
    let value = env.storage().persistent().get(&key).unwrap_or(0);
    if env.storage().persistent().has(&key) {
        env.storage().persistent().extend_ttl(&key, PERSISTENT_THRESHOLD, PERSISTENT_BUMP);
    }
    value
}

fn shortfall(env: &Env, user: &Address) -> i128 {
    let key = DataKey::Shortfall(user.clone());
    let value = env.storage().persistent().get(&key).unwrap_or(0);
    if env.storage().persistent().has(&key) {
        env.storage().persistent().extend_ttl(&key, PERSISTENT_THRESHOLD, PERSISTENT_BUMP);
    }
    value
}

fn payment(env: &Env, round: u32, user: &Address) -> Option<PaymentStatus> {
    let key = DataKey::Payment(round, user.clone());
    let value = env.storage().persistent().get(&key);
    if value.is_some() {
        env.storage().persistent().extend_ttl(&key, PERSISTENT_THRESHOLD, PERSISTENT_BUMP);
    }
    value
}

fn pending_rounds(env: &Env, user: &Address) -> Vec<u32> {
    let key = DataKey::PendingRounds(user.clone());
    let value = env.storage().persistent().get(&key).unwrap_or(Vec::new(env));
    if env.storage().persistent().has(&key) {
        env.storage().persistent().extend_ttl(&key, PERSISTENT_THRESHOLD, PERSISTENT_BUMP);
    }
    value
}

fn has_pending_defaults(env: &Env, user: &Address) -> bool {
    !pending_rounds(env, user).is_empty()
}

fn add_pending_default(env: &Env, user: &Address, round: u32) {
    let mut rounds = pending_rounds(env, user);
    if !rounds.contains(round) { rounds.push_back(round); }
    let key = DataKey::PendingRounds(user.clone());
    env.storage().persistent().set(&key, &rounds);
    env.storage().persistent().extend_ttl(&key, PERSISTENT_THRESHOLD, PERSISTENT_BUMP);
}

fn add_debt(env: &Env, debtor: &Address, beneficiary: &Address, round: u32, amount: i128) -> Result<(), Error> {
    if debtor == beneficiary || amount <= 0 { return Ok(()); }
    let debt_key = DataKey::Debt(round, debtor.clone());
    if env.storage().persistent().has(&debt_key) { return Err(Error::InvalidState); }
    let record = DebtRecord { beneficiary: beneficiary.clone(), outstanding: amount };
    env.storage().persistent().set(&debt_key, &record);
    env.storage().persistent().extend_ttl(&debt_key, PERSISTENT_THRESHOLD, PERSISTENT_BUMP);

    let total = debt_total(env, debtor).checked_add(amount).ok_or(Error::Overflow)?;
    let total_key = DataKey::DebtTotal(debtor.clone());
    env.storage().persistent().set(&total_key, &total);
    env.storage().persistent().extend_ttl(&total_key, PERSISTENT_THRESHOLD, PERSISTENT_BUMP);

    let missing = shortfall(env, beneficiary).checked_add(amount).ok_or(Error::Overflow)?;
    let shortfall_key = DataKey::Shortfall(beneficiary.clone());
    env.storage().persistent().set(&shortfall_key, &missing);
    env.storage().persistent().extend_ttl(&shortfall_key, PERSISTENT_THRESHOLD, PERSISTENT_BUMP);
    env.events().publish((symbol_short!("debt"), debtor.clone(), round), (beneficiary.clone(), amount));
    Ok(())
}

fn advance_round(env: &Env, config: &mut GroupConfig) -> Result<(), Error> {
    config.current_round = config.current_round.checked_add(1).ok_or(Error::Overflow)?;
    config.deadline = env.ledger().timestamp().checked_add(config.round_duration).ok_or(Error::Overflow)?;
    Ok(())
}

/// Pays an excess pool pro-rata by recorded contribution. The final contributing
/// member receives the integer-division remainder, so the distributed sum is exact.
fn distribute_excess(env: &Env, token_address: &Address, users: &Vec<Address>, excess: i128) -> Result<(), Error> {
    if excess <= 0 { return Ok(()); }
    let mut total_contributed: i128 = 0;
    let mut contributors = Vec::<Address>::new(env);
    for user in users.iter() {
        let member = load_member(env, &user)?;
        if member.total_contributed > 0 {
            total_contributed = total_contributed.checked_add(member.total_contributed).ok_or(Error::Overflow)?;
            contributors.push_back(user);
        }
    }
    if total_contributed <= 0 || contributors.is_empty() { return Err(Error::InvalidStateForDistribution); }

    let token_client = token::Client::new(env, token_address);
    let mut remaining = excess;
    let last_index = contributors.len() - 1;
    for i in 0..contributors.len() {
        let user = contributors.get(i).ok_or(Error::InvalidStateForDistribution)?;
        let share = if i == last_index {
            remaining
        } else {
            let member = load_member(env, &user)?;
            excess.checked_mul(member.total_contributed).ok_or(Error::Overflow)? / total_contributed
        };
        if share > 0 {
            token_client.transfer(&env.current_contract_address(), &user, &share);
            remaining = remaining.checked_sub(share).ok_or(Error::Overflow)?;
        }
    }
    if remaining != 0 { return Err(Error::InvalidStateForDistribution); }
    Ok(())
}

fn close_group(env: &Env, config: &mut GroupConfig, users: &Vec<Address>, registry: &ReputationRegistryClient) -> Result<(), Error> {
    // Return unused guarantees first. The pool is handled separately below.
    let token_client = token::Client::new(env, &config.token);
    for user in users.iter() {
        let mut member = load_member(env, &user)?;
        if member.guarantee_balance > 0 {
            let refund = member.guarantee_balance;
            member.guarantee_balance = 0;
            save_member(env, &user, &member);
            token_client.transfer(&env.current_contract_address(), &user, &refund);
        }
        if member.clean {
            registry.reward_completion(&env.current_contract_address(), &user);
        }
    }
    config.status = GroupStatus::Completed;
    config.round_pool = 0;
    save_config(env, config);
    env.events().publish((symbol_short!("completed"),), config.current_round);
    Ok(())
}

fn save_payment(env: &Env, round: u32, user: &Address, status: PaymentStatus) {
    let key = DataKey::Payment(round, user.clone());
    env.storage().persistent().set(&key, &status);
    env.storage().persistent().extend_ttl(&key, PERSISTENT_THRESHOLD, PERSISTENT_BUMP);
}

fn rotate_front(env: &Env, q: &Vec<Address>) -> Result<Vec<Address>, Error> {
    if q.is_empty() { return Err(Error::EmptyQueue); }
    let mut next = Vec::new(env);
    for i in 1..q.len() { next.push_back(q.get(i).ok_or(Error::InvalidTurnOrder)?); }
    next.push_back(q.get(0).ok_or(Error::InvalidTurnOrder)?);
    Ok(next)
}

fn contains(list: &Vec<Address>, user: &Address) -> bool { is_member(list, user) }

#[contractimpl]
impl PasanakuContract {
    pub fn init(
        env: Env,
        admin: Address,
        token_address: Address,
        registry: Address,
        contribution: i128,
        guarantee: i128,
        round_duration: u64,
        grace_seconds: u64,
        max_participants: u32,
        is_public: bool,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Config) { return Err(Error::AlreadyInitialized); }
        admin.require_auth();
        if contribution <= 0 || guarantee != contribution { return Err(Error::InvalidAmount); }
        if round_duration == 0 { return Err(Error::InvalidDuration); }
        if max_participants < 2 || max_participants > MAX_PARTICIPANTS { return Err(Error::InvalidParticipantLimit); }

        let config = GroupConfig {
            admin, token: token_address, registry, contribution, guarantee,
            round_duration, grace_seconds, max_participants, is_public,
            current_round: 0, deadline: 0, round_pool: 0, no_beneficiary_rounds: 0, status: GroupStatus::Open,
        };
        env.storage().instance().set(&DataKey::Config, &config);
        env.storage().instance().set(&DataKey::Participants, &Vec::<Address>::new(&env));
        env.storage().instance().set(&DataKey::TurnQueue, &Vec::<Address>::new(&env));
        env.storage().instance().extend_ttl(INSTANCE_THRESHOLD, INSTANCE_BUMP);
        Ok(())
    }

    /// Backend validates the group membership request, then the admin authorizes the address.
    pub fn invite_member(env: Env, admin: Address, user: Address) -> Result<(), Error> {
        let config = load_config(&env)?;
        require_admin(&config, &admin)?;
        if config.status != GroupStatus::Open { return Err(Error::GroupNotOpen); }
        if is_member(&participants(&env), &user) { return Err(Error::AlreadyMember); }
        let key = DataKey::Invitation(user);
        env.storage().persistent().set(&key, &true);
        env.storage().persistent().extend_ttl(&key, PERSISTENT_THRESHOLD, PERSISTENT_BUMP);
        Ok(())
    }

    pub fn join_group(env: Env, user: Address) -> Result<(), Error> {
        let config = load_config(&env)?;
        if config.status != GroupStatus::Open { return Err(Error::GroupNotOpen); }
        user.require_auth();
        let invitation_key = DataKey::Invitation(user.clone());
        let invited: bool = env.storage().persistent().get(&invitation_key).unwrap_or(false);
        if !invited { return Err(Error::NotInvited); }
        env.storage().persistent().extend_ttl(&invitation_key, PERSISTENT_THRESHOLD, PERSISTENT_BUMP);
        let mut list = participants(&env);
        if is_member(&list, &user) { return Err(Error::AlreadyMember); }
        if list.len() >= config.max_participants { return Err(Error::GroupFull); }

        if config.is_public {
            let registry = ReputationRegistryClient::new(&env, &config.registry);
            if !registry.can_join_public(&user) { return Err(Error::Unauthorized); }
        }

        token::Client::new(&env, &config.token).transfer(
            &user, &env.current_contract_address(), &config.guarantee,
        );
        let member = MemberState {
            guarantee_balance: config.guarantee,
            total_contributed: 0,
            clean: true,
            joined: true,
        };
        save_member(&env, &user, &member);
        list.push_back(user.clone());
        env.storage().instance().set(&DataKey::Participants, &list);
        env.storage().persistent().remove(&invitation_key);
        env.events().publish((symbol_short!("joined"), user), config.guarantee);
        Ok(())
    }

    /// The backend sends the reputation-based/agreed order before activation.
    pub fn set_turn_order(env: Env, admin: Address, new_order: Vec<Address>) -> Result<(), Error> {
        let config = load_config(&env)?;
        require_admin(&config, &admin)?;
        if config.status != GroupStatus::Open { return Err(Error::GroupNotOpen); }
        let list = participants(&env);
        if new_order.len() != list.len() { return Err(Error::InvalidTurnOrder); }
        for i in 0..new_order.len() {
            let user = new_order.get(i).ok_or(Error::InvalidTurnOrder)?;
            if !is_member(&list, &user) { return Err(Error::InvalidTurnOrder); }
            for j in 0..i {
                let previous = new_order.get(j).ok_or(Error::InvalidTurnOrder)?;
                if previous == user { return Err(Error::InvalidTurnOrder); }
            }
        }
        // First ceil(30%) of positions are reserved for members with score >= 80.
        let protected_slots = (new_order.len() * 30 + 99) / 100;
        let registry = ReputationRegistryClient::new(&env, &config.registry);
        for i in 0..protected_slots {
            let user = new_order.get(i).ok_or(Error::InvalidTurnOrder)?;
            if registry.get_score(&user) < 80 {
                return Err(Error::LowReputationForEarlyTurn);
            }
        }
        env.storage().instance().set(&DataKey::TurnQueue, &new_order);
        Ok(())
    }

    pub fn start_group(env: Env, admin: Address) -> Result<(), Error> {
        let mut config = load_config(&env)?;
        require_admin(&config, &admin)?;
        if config.status != GroupStatus::Open { return Err(Error::InvalidState); }
        let list = participants(&env);
        let q = queue(&env);
        if list.len() < 2 { return Err(Error::NotEnoughMembers); }
        if list.len() != q.len() { return Err(Error::InvalidTurnOrder); }
        config.current_round = 1;
        config.deadline = env.ledger().timestamp().checked_add(config.round_duration).ok_or(Error::Overflow)?;
        config.status = GroupStatus::Active;
        save_config(&env, &config);
        env.events().publish((symbol_short!("started"),), list.len());
        Ok(())
    }

    /// Participants may pay until the end of the three-day grace period.
    pub fn pay_round(env: Env, user: Address) -> Result<(), Error> {
        let mut config = load_config(&env)?;
        if config.status != GroupStatus::Active { return Err(Error::GroupNotActive); }
        user.require_auth();
        if !is_member(&participants(&env), &user) { return Err(Error::NotMember); }
        let grace_end = config.deadline.checked_add(config.grace_seconds).ok_or(Error::Overflow)?;
        if env.ledger().timestamp() > grace_end { return Err(Error::GracePeriodOver); }
        if payment(&env, config.current_round, &user).is_some() { return Err(Error::AlreadyPaid); }

        // On the last reassigned turn, the delinquent beneficiary and unpaid
        // shortfall beneficiaries are exempt, as agreed in the business rules.
        let q = queue(&env);
        if q.len() == 1 {
            let beneficiary = q.get(0).ok_or(Error::EmptyQueue)?;
            if debt_total(&env, &beneficiary) > 0 && (user == beneficiary || shortfall(&env, &user) > 0) {
                save_payment(&env, config.current_round, &user, PaymentStatus::Exempt);
                env.events().publish((symbol_short!("exempt"), user, config.current_round), ());
                return Ok(());
            }
        }

        token::Client::new(&env, &config.token).transfer(
            &user, &env.current_contract_address(), &config.contribution,
        );
        let mut member = load_member(&env, &user)?;
        member.total_contributed = member.total_contributed.checked_add(config.contribution).ok_or(Error::Overflow)?;
        save_member(&env, &user, &member);
        config.round_pool = config.round_pool.checked_add(config.contribution).ok_or(Error::Overflow)?;
        save_payment(&env, config.current_round, &user, PaymentStatus::Paid);
        save_config(&env, &config);
        env.events().publish((symbol_short!("paid"), config.current_round, user), config.contribution);
        Ok(())
    }

    /// Permissionless settlement. Missing contributions use the remaining 1x
    /// guarantee; after it is consumed, a debt to this round's beneficiary is recorded.
    pub fn settle_round(env: Env) -> Result<Option<Address>, Error> {
        let mut config = load_config(&env)?;
        if config.status != GroupStatus::Active { return Err(Error::GroupNotActive); }
        let grace_end = config.deadline.checked_add(config.grace_seconds).ok_or(Error::Overflow)?;
        // Payments are accepted through grace_end inclusive; settlement starts after it.
        if env.ledger().timestamp() <= grace_end { return Err(Error::TooEarly); }
        let settled_key = DataKey::RoundSettled(config.current_round);
        if env.storage().persistent().has(&settled_key) { return Err(Error::InvalidState); }

        let list = participants(&env);
        let mut defaulted = Vec::<Address>::new(&env);
        let registry = ReputationRegistryClient::new(&env, &config.registry);
        let group = env.current_contract_address();

        // Apply this round's unpaid amounts atomically. A guarantee covers one quota;
        // otherwise the default becomes a pending debt until a beneficiary is available.
        for user in list.iter() {
            if payment(&env, config.current_round, &user).is_some() { continue; }
            let mut member = load_member(&env, &user)?;
            member.clean = false;
            if member.guarantee_balance >= config.contribution {
                member.guarantee_balance = member.guarantee_balance.checked_sub(config.contribution).ok_or(Error::Overflow)?;
                member.total_contributed = member.total_contributed.checked_add(config.contribution).ok_or(Error::Overflow)?;
                config.round_pool = config.round_pool.checked_add(config.contribution).ok_or(Error::Overflow)?;
                save_member(&env, &user, &member);
                save_payment(&env, config.current_round, &user, PaymentStatus::Guarantee);
                registry.record_default(&group, &user, &config.current_round);
                env.events().publish((symbol_short!("slashed"), user.clone(), config.current_round), config.contribution);
            } else {
                save_member(&env, &user, &member);
                save_payment(&env, config.current_round, &user, PaymentStatus::Defaulted);
                defaulted.push_back(user.clone());
                registry.record_default(&group, &user, &config.current_round);
                env.events().publish((symbol_short!("defaulted"), user.clone(), config.current_round), ());
            }
        }

        let mut q = queue(&env);
        if q.is_empty() { return Err(Error::EmptyQueue); }

        // Find an eligible beneficiary without discarding skipped debtors.
        let mut eligible: Option<Address> = None;
        let mut scan = q.clone();
        for _ in 0..q.len() {
            let candidate = scan.get(0).ok_or(Error::EmptyQueue)?;
            if debt_total(&env, &candidate) == 0
                && !has_pending_defaults(&env, &candidate)
                && !contains(&defaulted, &candidate)
            {
                eligible = Some(candidate);
                break;
            }
            scan = rotate_front(&env, &scan)?;
        }

        if eligible.is_none() {
            // Preserve the complete accumulated pool. Rotate one place per missed
            // beneficiary round, allowing a debtor to cure existing arrears meanwhile.
            for debtor in defaulted.iter() { add_pending_default(&env, &debtor, config.current_round); }
            q = rotate_front(&env, &q)?;
            env.storage().instance().set(&DataKey::TurnQueue, &q);
            config.no_beneficiary_rounds = config.no_beneficiary_rounds.checked_add(1).ok_or(Error::Overflow)?;
            env.storage().persistent().set(&settled_key, &true);
            env.storage().persistent().extend_ttl(&settled_key, PERSISTENT_THRESHOLD, PERSISTENT_BUMP);

            // After one full pass with no eligible beneficiary, perform terminal
            // liquidation: cap the nominal last beneficiary and distribute any excess.
            if config.no_beneficiary_rounds >= q.len() {
                let final_beneficiary = q.get(0).ok_or(Error::EmptyQueue)?;
                for debtor in list.iter() {
                    let rounds = pending_rounds(&env, &debtor);
                    for round in rounds.iter() {
                        add_debt(&env, &debtor, &final_beneficiary, round, config.contribution)?;
                    }
                    env.storage().persistent().remove(&DataKey::PendingRounds(debtor));
                }
                let final_member = load_member(&env, &final_beneficiary)?;
                let capped = if config.round_pool < final_member.total_contributed { config.round_pool } else { final_member.total_contributed };
                if capped > 0 { token::Client::new(&env, &config.token).transfer(&group, &final_beneficiary, &capped); }
                env.storage().instance().set(&DataKey::RoundBeneficiary(config.current_round), &final_beneficiary);
                env.events().publish((symbol_short!("final_pay"), config.current_round, final_beneficiary.clone()), capped);
                let excess = config.round_pool.checked_sub(capped).ok_or(Error::Overflow)?;
                distribute_excess(&env, &config.token, &list, excess)?;
                config.round_pool = 0;
                close_group(&env, &mut config, &list, &registry)?;
                // Sweep any residual token dust/donations as well, leaving this
                // completed group vault at an exact zero balance.
                let token_client = token::Client::new(&env, &config.token);
                let residual = token_client.balance(&group);
                if residual > 0 { distribute_excess(&env, &config.token, &list, residual)?; }
                if token_client.balance(&group) != 0 { return Err(Error::InvalidStateForDistribution); }
                return Ok(Some(final_beneficiary));
            }

            advance_round(&env, &mut config)?;
            save_config(&env, &config);
            env.events().publish((symbol_short!("no_ben"), config.current_round - 1), config.round_pool);
            return Ok(None);
        }

        let beneficiary = eligible.ok_or(Error::InvalidState)?;
        // `scan` has skipped members rotated to the back; keep that order when
        // removing the selected beneficiary so skipped members retain priority fairly.
        q = scan;
        config.no_beneficiary_rounds = 0;

        // Assign earlier pending defaults and this round's uncovered defaults to the
        // beneficiary selected now. The debt remains linked to its original round.
        for debtor in list.iter() {
            let rounds = pending_rounds(&env, &debtor);
            for round in rounds.iter() {
                add_debt(&env, &debtor, &beneficiary, round, config.contribution)?;
            }
            if !rounds.is_empty() { env.storage().persistent().remove(&DataKey::PendingRounds(debtor.clone())); }
        }
        for debtor in defaulted.iter() {
            if !pending_rounds(&env, &debtor).contains(config.current_round) {
                add_debt(&env, &debtor, &beneficiary, config.current_round, config.contribution)?;
            }
        }

        let payout = config.round_pool;
        if payout > 0 { token::Client::new(&env, &config.token).transfer(&group, &beneficiary, &payout); }
        env.storage().instance().set(&DataKey::RoundBeneficiary(config.current_round), &beneficiary);
        env.storage().persistent().set(&settled_key, &true);
        env.storage().persistent().extend_ttl(&settled_key, PERSISTENT_THRESHOLD, PERSISTENT_BUMP);
        env.events().publish((symbol_short!("payout"), config.current_round, beneficiary.clone()), payout);

        // Remove the selected beneficiary from the queue, retaining skipped members.
        let mut next_q = Vec::new(&env);
        let mut removed = false;
        for member in q.iter() {
            if !removed && member == beneficiary { removed = true; continue; }
            next_q.push_back(member);
        }
        if !removed { return Err(Error::InvalidTurnOrder); }
        q = next_q;
        env.storage().instance().set(&DataKey::TurnQueue, &q);
        config.round_pool = 0;

        if q.is_empty() {
            close_group(&env, &mut config, &list, &registry)?;
        } else {
            advance_round(&env, &mut config)?;
            save_config(&env, &config);
        }
        Ok(Some(beneficiary))
    }

    /// Repays one or more old missed quotas. The transfer goes directly to the
    /// beneficiary who received the incomplete pool, never to the group vault.
    pub fn pay_arrears(env: Env, debtor: Address, round: u32, amount: i128) -> Result<(), Error> {
        if amount <= 0 { return Err(Error::InvalidAmount); }
        debtor.require_auth();
        let key = DataKey::Debt(round, debtor.clone());
        let mut record: DebtRecord = env.storage().persistent().get(&key).ok_or(Error::DebtNotFound)?;
        if amount > record.outstanding { return Err(Error::DebtAmountTooLarge); }
        token::Client::new(&env, &load_config(&env)?.token).transfer(&debtor, &record.beneficiary, &amount);
        record.outstanding = record.outstanding.checked_sub(amount).ok_or(Error::Overflow)?;
        env.storage().persistent().set(&key, &record);
        env.storage().persistent().extend_ttl(&key, PERSISTENT_THRESHOLD, PERSISTENT_BUMP);
        let total = debt_total(&env, &debtor).checked_sub(amount).ok_or(Error::Overflow)?;
        let debt_total_key = DataKey::DebtTotal(debtor.clone());
        env.storage().persistent().set(&debt_total_key, &total);
        env.storage().persistent().extend_ttl(&debt_total_key, PERSISTENT_THRESHOLD, PERSISTENT_BUMP);
        let missing = shortfall(&env, &record.beneficiary).checked_sub(amount).ok_or(Error::Overflow)?;
        let shortfall_key = DataKey::Shortfall(record.beneficiary.clone());
        env.storage().persistent().set(&shortfall_key, &missing);
        env.storage().persistent().extend_ttl(&shortfall_key, PERSISTENT_THRESHOLD, PERSISTENT_BUMP);
        env.events().publish((symbol_short!("arrears"), debtor, round), amount);
        Ok(())
    }

    pub fn get_config(env: Env) -> Result<GroupConfig, Error> { load_config(&env) }
    pub fn get_participants(env: Env) -> Result<Vec<Address>, Error> { load_config(&env)?; Ok(participants(&env)) }
    pub fn get_turn_queue(env: Env) -> Result<Vec<Address>, Error> { load_config(&env)?; Ok(queue(&env)) }
    pub fn get_member(env: Env, user: Address) -> Result<MemberState, Error> { load_member(&env, &user) }
    pub fn get_debt_record(env: Env, round: u32, debtor: Address) -> Option<DebtRecord> {
        let key = DataKey::Debt(round, debtor);
        let record = env.storage().persistent().get(&key);
        if record.is_some() {
            env.storage().persistent().extend_ttl(&key, PERSISTENT_THRESHOLD, PERSISTENT_BUMP);
        }
        record
    }
    pub fn get_debt(env: Env, user: Address) -> i128 { debt_total(&env, &user) }
    pub fn get_shortfall(env: Env, beneficiary: Address) -> i128 { shortfall(&env, &beneficiary) }
}

#[cfg(test)]
mod test;
