#![no_std]

use soroban_sdk::{contract, contracterror, contractevent, contractimpl, contracttype, Address, Env};

const BASE_SCORE: u32 = 100;
const MAX_SCORE: u32 = 200;
const PUBLIC_MIN_SCORE: u32 = 41;
const EARLY_TURN_MIN_SCORE: u32 = 80;

const TTL_THRESHOLD: u32 = 100_000;
const TTL_EXTEND_TO: u32 = 200_000;

#[contracterror]
#[derive(Copy, Clone, PartialEq, Eq)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    AlreadyProcessed = 4,
    Overflow = 5,
}

#[contracttype]
enum Key {
    Admin,
    AuthorizedGroup(Address),
    Score(Address),
    DefaultCount(Address, Address), // group, user
    DefaultEvent(Address, Address, u32), // group, user, round
    Completion(Address, Address),        // group, user
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DefaultRecorded {
    #[topic]
    pub user: Address,
    pub penalty: u32,
    pub score: u32,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CompletionRewarded {
    #[topic]
    pub user: Address,
    pub score: u32,
}

#[contract]
pub struct ReputationRegistry;

fn extend_instance_ttl(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);
}

fn admin(env: &Env) -> Result<Address, Error> {
    let value = env
        .storage()
        .instance()
        .get(&Key::Admin)
        .ok_or(Error::NotInitialized)?;
    extend_instance_ttl(env);
    Ok(value)
}

fn require_admin(env: &Env, caller: &Address) -> Result<(), Error> {
    let stored = admin(env)?;
    if stored != *caller {
        return Err(Error::Unauthorized);
    }
    caller.require_auth();
    Ok(())
}

fn score_of(env: &Env, user: &Address) -> u32 {
    let key = Key::Score(user.clone());
    let value = env.storage().persistent().get(&key).unwrap_or(BASE_SCORE);
    if env.storage().persistent().has(&key) {
        env.storage()
            .persistent()
            .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
    }
    value
}

fn authorized_group(env: &Env, group: &Address) -> bool {
    let key = Key::AuthorizedGroup(group.clone());
    let allowed = env.storage().persistent().get(&key).unwrap_or(false);
    if allowed {
        env.storage()
            .persistent()
            .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
    }
    allowed
}

#[contractimpl]
impl ReputationRegistry {
    pub fn __constructor(env: Env, administrator: Address) {
        administrator.require_auth();
        env.storage().instance().set(&Key::Admin, &administrator);
        extend_instance_ttl(&env);
    }

    pub fn set_group(
        env: Env,
        caller: Address,
        group: Address,
        allowed: bool,
    ) -> Result<(), Error> {
        require_admin(&env, &caller)?;
        let key = Key::AuthorizedGroup(group);
        if allowed {
            env.storage().persistent().set(&key, &true);
            env.storage()
                .persistent()
                .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
        } else {
            env.storage().persistent().remove(&key);
        }
        Ok(())
    }

    pub fn get_score(env: Env, user: Address) -> u32 {
        score_of(&env, &user)
    }

    /// Users below 41 reputation cannot join public groups.
    pub fn can_join_public(env: Env, user: Address) -> bool {
        score_of(&env, &user) >= PUBLIC_MIN_SCORE
    }

    /// Returns whether a user may receive one of the first 30% of turns.
    /// `turn_number` is 1-based. The restricted window is ceil(total_turns * 30%).
    /// Users with score >= 80 are not restricted.
    pub fn can_take_early_turn(
        env: Env,
        user: Address,
        turn_number: u32,
        total_turns: u32,
    ) -> bool {
        if total_turns == 0 || turn_number == 0 || turn_number > total_turns {
            return false;
        }

        if score_of(&env, &user) >= EARLY_TURN_MIN_SCORE {
            return true;
        }

        // Use u64 for the multiplication so all u32 inputs are safe.
        let restricted_turns = ((u64::from(total_turns) * 30) + 99) / 100;
        u64::from(turn_number) > restricted_turns
    }

    /// Only an authorized group contract may report a default. The group must
    /// authenticate as the invoker; passing an arbitrary group address is not
    /// sufficient. The first global default costs 10 points, the second 30 more.
    pub fn record_default(
        env: Env,
        group: Address,
        user: Address,
        round: u32,
    ) -> Result<u32, Error> {
        // Check authentication before trusting the group address or whitelist.
        group.require_auth();
        if !authorized_group(&env, &group) {
            return Err(Error::Unauthorized);
        }

        let event_key = Key::DefaultEvent(group.clone(), user.clone(), round);
        if env.storage().persistent().has(&event_key) {
            env.storage()
                .persistent()
                .extend_ttl(&event_key, TTL_THRESHOLD, TTL_EXTEND_TO);
            return Err(Error::AlreadyProcessed);
        }

        let count_key = Key::DefaultCount(group.clone(), user.clone());
        let count: u32 = env.storage().persistent().get(&count_key).unwrap_or(0);
        if env.storage().persistent().has(&count_key) {
            env.storage()
                .persistent()
                .extend_ttl(&count_key, TTL_THRESHOLD, TTL_EXTEND_TO);
        }

        // Penalty sequence resets for each group, while the score remains global.
        let penalty = match count {
            0 => 10,
            1 => 30,
            _ => 0,
        };
        let next_count = count.checked_add(1).ok_or(Error::Overflow)?;
        let next_score = score_of(&env, &user).saturating_sub(penalty);

        // Soroban transactions are atomic: if a later operation fails, these
        // writes and the event marker are rolled back together.
        env.storage().persistent().set(&event_key, &true);
        env.storage()
            .persistent()
            .extend_ttl(&event_key, TTL_THRESHOLD, TTL_EXTEND_TO);
        env.storage().persistent().set(&count_key, &next_count);
        env.storage()
            .persistent()
            .extend_ttl(&count_key, TTL_THRESHOLD, TTL_EXTEND_TO);

        let score_key = Key::Score(user.clone());
        env.storage().persistent().set(&score_key, &next_score);
        env.storage()
            .persistent()
            .extend_ttl(&score_key, TTL_THRESHOLD, TTL_EXTEND_TO);

        DefaultRecorded {
            user,
            penalty,
            score: next_score,
        }
        .publish(&env);

        Ok(next_score)
    }

    /// Called once by an authorized group when a member completes cleanly.
    pub fn reward_completion(
        env: Env,
        group: Address,
        user: Address,
    ) -> Result<u32, Error> {
        group.require_auth();
        if !authorized_group(&env, &group) {
            return Err(Error::Unauthorized);
        }

        let key = Key::Completion(group.clone(), user.clone());
        if env.storage().persistent().has(&key) {
            env.storage()
                .persistent()
                .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
            return Err(Error::AlreadyProcessed);
        }

        let next = score_of(&env, &user).saturating_add(10).min(MAX_SCORE);

        env.storage().persistent().set(&key, &true);
        env.storage()
            .persistent()
            .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);

        let score_key = Key::Score(user.clone());
        env.storage().persistent().set(&score_key, &next);
        env.storage()
            .persistent()
            .extend_ttl(&score_key, TTL_THRESHOLD, TTL_EXTEND_TO);

        CompletionRewarded { user, score: next }.publish(&env);
        Ok(next)
    }
}

#[cfg(test)]
mod test;
