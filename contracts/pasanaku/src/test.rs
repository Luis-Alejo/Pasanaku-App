use super::*;
use soroban_sdk::{
    contract, contractimpl,
    testutils::{Address as _, Ledger},
    token, Address, Env,
};

// A narrow registry double for Pasanaku tests. It deliberately requires the
// group contract's auth on reputation mutations, exercising nested auth.
#[contract]
pub struct TestRegistry;

#[contractimpl]
impl TestRegistry {
    pub fn can_join_public(_env: Env, _user: Address) -> bool { true }
    pub fn get_score(_env: Env, _user: Address) -> u32 { 100 }
    pub fn record_default(_env: Env, group: Address, _user: Address, _round: u32) -> u32 {
        group.require_auth();
        90
    }
    pub fn reward_completion(_env: Env, group: Address, _user: Address) -> u32 {
        group.require_auth();
        110
    }
}

struct Fixture {
    env: Env,
    group: Address,
    token: Address,
    users: Vec<Address>,
}

impl Fixture {
    fn client(&self) -> PasanakuContractClient<'_> {
        PasanakuContractClient::new(&self.env, &self.group)
    }
}

fn setup(participant_count: u32) -> Fixture {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(100);

    let admin = Address::generate(&env);
    let group = env.register_contract(None, PasanakuContract);
    let registry = env.register_contract(None, TestRegistry);
    let token_address = env.register_stellar_asset_contract(admin.clone());
    let token_admin = token::StellarAssetClient::new(&env, &token_address);

    let mut users = Vec::new(&env);
    for _ in 0..participant_count {
        let user = Address::generate(&env);
        token_admin.mint(&user, &100_000);
        users.push_back(user);
    }

    let client = PasanakuContractClient::new(&env, &group);
    client.init(
        &admin,
        &token_address,
        &registry,
        &100,
        &100,
        &10,
        &participant_count,
        &false,
    );

    for user in users.iter() {
        client.invite_member(&admin, &user);
        client.join_group(&user);
    }
    client.set_turn_order(&admin, &users);
    client.start_group(&admin);

    Fixture { env, group, token: token_address, users }
}

fn settle_after_grace(f: &Fixture) {
    let client = f.client();
    let config = client.get_config();
    f.env.ledger().set_timestamp(config.deadline + GRACE_SECONDS + 1);
    let _ = client.settle_round();
}

#[test]
fn initializes_and_joins_with_one_x_guarantee() {
    let f = setup(2);
    let client = f.client();
    let config = client.get_config();
    assert_eq!(config.contribution, 100);
    assert_eq!(config.guarantee, 100);
    assert_eq!(config.status, GroupStatus::Active);
    assert_eq!(client.get_participants().len(), 2);
    for user in f.users.iter() {
        assert_eq!(client.get_member(&user).guarantee_balance, 100);
    }
}

#[test]
fn guarantee_covers_one_missed_round_and_pays_the_turn_holder() {
    let f = setup(3);
    let client = f.client();
    let first = f.users.get(0).unwrap();
    client.pay_round(&first);
    let config = client.get_config();
    f.env.ledger().set_timestamp(config.deadline + GRACE_SECONDS + 1);
    let beneficiary = client.settle_round();
    assert!(beneficiary.is_some());
    assert_eq!(beneficiary.unwrap(), first);
    assert_eq!(client.get_member(&f.users.get(1).unwrap()).guarantee_balance, 0);
    assert_eq!(client.get_member(&f.users.get(2).unwrap()).guarantee_balance, 0);
    assert_eq!(client.get_config().round_pool, 0);
}

#[test]
fn arrears_are_paid_directly_and_do_not_increase_contributions() {
    let f = setup(3);
    let client = f.client();
    let first = f.users.get(0).unwrap();
    let second = f.users.get(1).unwrap();
    let debtor = f.users.get(2).unwrap();

    client.pay_round(&first);
    settle_after_grace(&f);

    client.pay_round(&second);
    settle_after_grace(&f);

    assert_eq!(client.get_debt(&debtor), 100);
    assert_eq!(client.get_shortfall(&second), 100);
    let before = client.get_member(&debtor).total_contributed;
    let beneficiary_before = token::Client::new(&f.env, &f.token).balance(&second);

    client.pay_arrears(&debtor, &2, &40);

    assert_eq!(client.get_debt(&debtor), 60);
    assert_eq!(client.get_shortfall(&second), 60);
    assert_eq!(client.get_member(&debtor).total_contributed, before);
    assert_eq!(token::Client::new(&f.env, &f.token).balance(&second), beneficiary_before + 40);
}

#[test]
fn no_eligible_beneficiary_preserves_pool_and_rotates_queue() {
    let f = setup(4);
    let client = f.client();
    let a = f.users.get(0).unwrap();
    let b = f.users.get(1).unwrap();
    let c = f.users.get(2).unwrap();
    let d = f.users.get(3).unwrap();

    // Round 1: A receives the pool; B/C/D consume their guarantees.
    client.pay_round(&a);
    settle_after_grace(&f);

    // Round 2: B receives the pool; C/D now incur unsecured debts to B.
    client.pay_round(&b);
    settle_after_grace(&f);
    assert_eq!(client.get_debt(&c), 100);
    assert_eq!(client.get_debt(&d), 100);

    // Both remaining members pay current quotas but remain ineligible while
    // their earlier arrears are outstanding. Their contributions stay pooled.
    client.pay_round(&c);
    client.pay_round(&d);
    let before = client.get_config();
    f.env.ledger().set_timestamp(before.deadline + GRACE_SECONDS + 1);
    let result = client.settle_round();

    assert!(result.is_none());
    let after = client.get_config();
    assert_eq!(after.round_pool, 200);
    assert_eq!(after.current_round, before.current_round + 1);
    assert_eq!(client.get_turn_queue().get(0).unwrap(), d);
}

#[test]
fn final_liquidation_caps_last_beneficiary_and_distributes_excess_exactly() {
    let f = setup(4);
    let client = f.client();
    let a = f.users.get(0).unwrap();
    let b = f.users.get(1).unwrap();
    let c = f.users.get(2).unwrap();
    let d = f.users.get(3).unwrap();

    // Round 1: A receives; B/C/D use their guarantees.
    client.pay_round(&a);
    settle_after_grace(&f);

    // Round 2: B receives; C/D default without remaining guarantees.
    client.pay_round(&b);
    settle_after_grace(&f);

    // Round 3: C/D pay, but neither can receive while their arrears remain.
    client.pay_round(&c);
    client.pay_round(&d);
    settle_after_grace(&f);
    assert_eq!(client.get_config().round_pool, 200);

    // Round 4: the second consecutive no-beneficiary round triggers final
    // liquidation. Pool=400; final beneficiary C is capped at 300 contributed;
    // excess=100 is allocated pro-rata, with integer remainder to last contributor.
    client.pay_round(&c);
    client.pay_round(&d);
    let config = client.get_config();
    f.env.ledger().set_timestamp(config.deadline + GRACE_SECONDS + 1);
    let result = client.settle_round();

    assert!(result.is_some());
    assert_eq!(client.get_config().status, GroupStatus::Completed);
    assert_eq!(client.get_config().round_pool, 0);
    let token_client = token::Client::new(&f.env, &f.token);
    assert_eq!(token_client.balance(&f.group), 0);
    // Excess=100 over contribution weights 1:2:3:3. Integer shares are
    // 11, 22, 33 and 34 (the last contributor absorbs the remainder).
    assert_eq!(token_client.balance(&a), 100_220);
    assert_eq!(token_client.balance(&b), 100_020);
    assert_eq!(token_client.balance(&c), 100_030);
    assert_eq!(token_client.balance(&d), 99_730);
    assert_eq!(token_client.balance(&f.group), 0);

}


#[test]
fn payment_is_allowed_at_grace_end_but_settlement_waits_until_after() {
    let f = setup(2);
    let client = f.client();
    let first = f.users.get(0).unwrap();
    let config = client.get_config();
    let grace_end = config.deadline + GRACE_SECONDS;

    f.env.ledger().set_timestamp(grace_end);
    client.pay_round(&first);
    assert!(client.try_settle_round().is_err());

    f.env.ledger().set_timestamp(grace_end + 1);
    let result = client.settle_round();
    assert!(result.is_some());
}
