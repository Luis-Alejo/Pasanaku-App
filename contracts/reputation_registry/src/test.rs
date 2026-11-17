use super::{Error, Key, ReputationRegistry, ReputationRegistryClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

fn setup() -> (Env, Address, Address) {
    let env = Env::default();
    let admin = Address::generate(&env);
    let contract_id = env.register(ReputationRegistry, (&admin,));
    (env, admin, contract_id)
}

#[test]
fn new_user_starts_with_base_score() {
    let (env, _admin, contract_id) = setup();
    let client = ReputationRegistryClient::new(&env, &contract_id);
    let user = Address::generate(&env);

    assert_eq!(client.get_score(&user), 100);
    assert!(client.can_join_public(&user));
}

#[test]
fn applies_first_second_and_subsequent_default_rules() {
    let (env, admin, contract_id) = setup();
    env.mock_all_auths();
    let client = ReputationRegistryClient::new(&env, &contract_id);
    let group = Address::generate(&env);
    let user = Address::generate(&env);

    client.mock_all_auths().set_group(&admin, &group, &true);

    assert_eq!(client.record_default(&group, &user, &1), 90);
    assert_eq!(client.get_score(&user), 90);

    assert_eq!(client.record_default(&group, &user, &2), 60);
    assert_eq!(client.get_score(&user), 60);

    // Third and later defaults are recorded but carry no additional penalty.
    assert_eq!(client.record_default(&group, &user, &3), 60);
    assert_eq!(client.get_score(&user), 60);
}

#[test]
fn default_event_is_idempotent_for_group_user_and_round() {
    let (env, admin, contract_id) = setup();
    env.mock_all_auths();
    let client = ReputationRegistryClient::new(&env, &contract_id);
    let group = Address::generate(&env);
    let user = Address::generate(&env);

    client.mock_all_auths().set_group(&admin, &group, &true);
    assert_eq!(client.record_default(&group, &user, &7), 90);

    assert!(
        matches!(
            client.try_record_default(&group, &user, &7),
            Err(Ok(Error::AlreadyProcessed))
        )
    );
    assert_eq!(client.get_score(&user), 90);
}

#[test]
fn only_whitelisted_groups_can_report_defaults_or_rewards() {
    let (env, _admin, contract_id) = setup();
    let client = ReputationRegistryClient::new(&env, &contract_id);
    let unapproved_group = Address::generate(&env);
    let user = Address::generate(&env);

    env.mock_all_auths();
    assert!(
        matches!(
            client.try_record_default(&unapproved_group, &user, &7),
            Err(Ok(Error::Unauthorized))
        )
    );
    assert!(matches!(
        client.try_reward_completion(&unapproved_group, &user),
        Err(Ok(Error::Unauthorized))
    ));
    assert_eq!(client.get_score(&user), 100);
}

#[test]
fn group_address_must_authenticate_for_default_report() {
    let (env, admin, contract_id) = setup();
    let client = ReputationRegistryClient::new(&env, &contract_id);
    let group = Address::generate(&env);
    let user = Address::generate(&env);

    client.mock_all_auths().set_group(&admin, &group, &true);

    // Mocking all auths lets the invocation complete, and auths() verifies
    // that record_default actually requested authorization from `group`.
    env.mock_all_auths();
    assert_eq!(client.record_default(&group, &user, &1), 90);
    let auths = env.auths();
    assert!(auths.iter().any(|(authorized, _)| authorized == &group));
}

#[test]
fn only_admin_can_change_group_authorization() {
    let (env, _admin, contract_id) = setup();
    let client = ReputationRegistryClient::new(&env, &contract_id);
    let impostor = Address::generate(&env);
    let group = Address::generate(&env);

    env.mock_all_auths();
    assert!(matches!(
        client.try_set_group(&impostor, &group, &true),
        Err(Ok(Error::Unauthorized))
    ));
}

#[test]
fn authorized_group_can_be_revoked() {
    let (env, admin, contract_id) = setup();
    env.mock_all_auths();
    let client = ReputationRegistryClient::new(&env, &contract_id);
    let group = Address::generate(&env);
    let user = Address::generate(&env);

    client.mock_all_auths().set_group(&admin, &group, &true);
    client.set_group(&admin, &group, &false);

    assert!(matches!(
        client.try_record_default(&group, &user, &1),
        Err(Ok(Error::Unauthorized))
    ));
}

#[test]
fn clean_completion_adds_ten_points_once() {
    let (env, admin, contract_id) = setup();
    env.mock_all_auths();
    let client = ReputationRegistryClient::new(&env, &contract_id);
    let group = Address::generate(&env);
    let user = Address::generate(&env);

    client.mock_all_auths().set_group(&admin, &group, &true);
    assert_eq!(client.reward_completion(&group, &user), 110);
    assert_eq!(client.get_score(&user), 110);
    assert!(matches!(
        client.try_reward_completion(&group, &user),
        Err(Ok(Error::AlreadyProcessed))
    ));
    assert_eq!(client.get_score(&user), 110);
}

#[test]
fn public_group_threshold_is_exactly_eighty() {
    let (env, _admin, contract_id) = setup();
    let client = ReputationRegistryClient::new(&env, &contract_id);
    let user_80 = Address::generate(&env);
    let user_79 = Address::generate(&env);

    // Seed exact boundary values in contract storage to test both sides.
    env.as_contract(&contract_id, || {
        env.storage().persistent().set(&Key::Score(user_80.clone()), &80_u32);
        env.storage().persistent().set(&Key::Score(user_79.clone()), &79_u32);
    });

    assert!(client.can_join_public(&user_80));
    assert!(!client.can_join_public(&user_79));
}

#[test]
fn low_reputation_is_restricted_from_first_thirty_percent_of_turns() {
    let (env, _admin, contract_id) = setup();
    let client = ReputationRegistryClient::new(&env, &contract_id);
    let low_score_user = Address::generate(&env);
    let eligible_user = Address::generate(&env);

    env.as_contract(&contract_id, || {
        env.storage()
            .persistent()
            .set(&Key::Score(low_score_user.clone()), &79_u32);
        env.storage()
            .persistent()
            .set(&Key::Score(eligible_user.clone()), &80_u32);
    });

    // ceil(10 * 0.30) = 3: turns 1-3 are restricted; turn 4 is not.
    assert!(!client.can_take_early_turn(&low_score_user, &1, &10));
    assert!(!client.can_take_early_turn(&low_score_user, &3, &10));
    assert!(client.can_take_early_turn(&low_score_user, &4, &10));

    // Score 80 is not restricted.
    assert!(client.can_take_early_turn(&eligible_user, &1, &10));
}

#[test]
fn early_turn_window_uses_ceiling_and_rejects_invalid_indices() {
    let (env, _admin, contract_id) = setup();
    let client = ReputationRegistryClient::new(&env, &contract_id);
    let low_score_user = Address::generate(&env);

    env.as_contract(&contract_id, || {
        env.storage()
            .persistent()
            .set(&Key::Score(low_score_user.clone()), &50_u32);
    });

    // ceil(7 * 0.30) = 3.
    assert!(!client.can_take_early_turn(&low_score_user, &3, &7));
    assert!(client.can_take_early_turn(&low_score_user, &4, &7));
    assert!(!client.can_take_early_turn(&low_score_user, &0, &7));
    assert!(!client.can_take_early_turn(&low_score_user, &1, &0));
    assert!(!client.can_take_early_turn(&low_score_user, &8, &7));
}

#[test]
fn authorized_group_cannot_be_spoofed_without_its_auth() {
    let (env, admin, contract_id) = setup();
    let client = ReputationRegistryClient::new(&env, &contract_id);
    let group = Address::generate(&env);
    let user = Address::generate(&env);

    // Whitelist the group while mocking the administrator's authorization.
    client.mock_all_auths().set_group(&admin, &group, &true);

    // Remove all mocks. Since the group is whitelisted, the call would succeed
    // if record_default trusted the supplied group address without require_auth.
    env.set_auths(&[]);
    assert!(client.try_record_default(&group, &user, &1).is_err());
    assert_eq!(client.get_score(&user), 100);
}

#[test]
fn authorized_group_must_also_authenticate_completion_reward() {
    let (env, admin, contract_id) = setup();
    let client = ReputationRegistryClient::new(&env, &contract_id);
    let group = Address::generate(&env);
    let user = Address::generate(&env);

    client.mock_all_auths().set_group(&admin, &group, &true);
    env.set_auths(&[]);

    assert!(client.try_reward_completion(&group, &user).is_err());
    assert_eq!(client.get_score(&user), 100);
}
