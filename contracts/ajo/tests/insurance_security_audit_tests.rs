#![cfg(test)]

//! Security regression tests for the insurance/fraud-detection module.
//!
//! Rewritten against the actual shipped `insurance.rs` implementation: the
//! original version of this file assumed a richer API (a `FraudRiskProfile`/
//! `GroupRiskAssessment`-returning surface, an `AjoError::HighFraudRisk`
//! variant, and a claim-volume-based rate limiter) that was never actually
//! wired up — it referenced `crate::insurance`/`crate::types` directly, which
//! only compiles for an *internal* unit test module, not an external
//! integration test under `tests/`, so it could never have compiled here.
//!
//! The real fraud score (see `calculate_fraud_risk_score` in `insurance.rs`)
//! is: self-dealing +40, manufactured default (defaulter balance >= 2x
//! contribution) +35, filed within the last hour +15 (true for every claim
//! at the moment it's filed), >2 recent claims by the same claimant +10.
//! `file_claim`/`auto_process_claim` reject at >=80, which in practice is
//! only reachable by combining self-dealing with manufactured-default (or by
//! a claimant's circumstances changing between filing and verification).

use soroban_sdk::{testutils::{Address as _, Ledger}, token, Address, Env};
use soroban_ajo::{AjoContract, AjoContractClient, AjoError, ClaimStatus};

fn setup_test_env() -> (Env, AjoContractClient<'static>, Address, Address, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, AjoContract);
    let client = AjoContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let charlie = Address::generate(&env);

    client.initialize(&admin);

    (env, client, admin, alice, bob, charlie)
}

fn mint_tokens(env: &Env, token_id: &Address, members: &[Address], amount: i128) {
    let token_admin = token::StellarAssetClient::new(env, token_id);
    for member in members {
        token_admin.mint(member, &amount);
    }
}

/// Creates a group and has every member (`members[1..]` join first) contribute
/// once for the current cycle, so any configured insurance premium is
/// deposited into the token's insurance pool. Returns the group ID.
fn setup_group_with_contributions(
    env: &Env,
    client: &AjoContractClient,
    token: &Address,
    members: &[Address],
    contribution_amount: i128,
    insurance_rate_bps: u32,
) -> u64 {
    let creator = &members[0];
    let group_id = client.create_group(
        creator,
        token,
        &contribution_amount,
        &604_800u64, // cycle_duration (1 week)
        &(members.len() as u32),
        &86400u64, // grace_period (1 day)
        &0u32,     // penalty_rate
        &insurance_rate_bps,
    );

    for member in members.iter().skip(1) {
        client.join_group(member, &group_id);
    }

    mint_tokens(env, token, members, contribution_amount);
    for member in members {
        client.contribute(member, &group_id);
    }

    group_id
}

#[test]
fn test_self_dealing_detection() {
    // Self-dealing (+40) alone never crosses the 80 rejection threshold
    // (+15 timing = 55). Combined with a manufactured-default balance
    // (+35 = 90) it does: a claimant who could clearly have covered their
    // own "default" is the realistic self-dealing scenario.
    let (env, client, _admin, alice, bob, _charlie) = setup_test_env();
    let token = env.register_stellar_asset_contract(alice.clone());
    let members = [alice.clone(), bob.clone()];
    let group_id = setup_group_with_contributions(&env, &client, &token, &members, 1_000_000, 0);

    mint_tokens(&env, &token, &[alice.clone()], 5_000_000); // >= 2x contribution

    let result = client.try_file_insurance_claim(
        &alice,
        &group_id,
        &1u32,
        &alice, // claimant == defaulter: self-dealing
        &1_000_000i128,
    );

    assert_eq!(result, Err(Ok(AjoError::InvalidClaim)), "Self-dealing + manufactured default should be rejected");
}

#[test]
fn test_manufactured_default_detection() {
    // Manufactured default alone (+35 +15 = 50) is below the reject
    // threshold: the code flags it (visible on the stored claim's
    // fraud_risk_score) but a genuine non-contribution still pays out.
    let (env, client, _admin, alice, bob, _charlie) = setup_test_env();
    let token = env.register_stellar_asset_contract(alice.clone());
    let members = [alice.clone(), bob.clone()];
    let group_id = setup_group_with_contributions(&env, &client, &token, &members, 1_000_000, 1000);

    // Bob has ample balance but never contributes for cycle 2 (a fresh,
    // un-contributed cycle) — looks like he could have paid.
    mint_tokens(&env, &token, &[bob.clone()], 5_000_000);
    env.ledger().with_mut(|li| { li.timestamp += 604_800 + 86400 + 1; });

    let claim_id = client.file_insurance_claim(&alice, &group_id, &2u32, &bob, &10_000i128);

    let claim = client.get_insurance_claim(&claim_id);
    assert!(claim.fraud_risk_score >= 35, "Manufactured-default signal should be reflected in the risk score");

    client.auto_verify_insurance_claim(&claim_id);
    let claim = client.get_insurance_claim(&claim_id);
    assert_eq!(claim.status, ClaimStatus::Paid, "A genuine (if suspicious-looking) default still pays out");
}

#[test]
fn test_sybil_attack_detection() {
    // Repeated claims from the same claimant against different targets
    // raise that claimant's on-chain risk score, even though (per the
    // current implementation) claim volume alone never crosses the
    // immediate-rejection threshold without self-dealing or a manufactured
    // default also present.
    let (env, client, _admin, alice, bob, charlie) = setup_test_env();
    let token = env.register_stellar_asset_contract(alice.clone());
    let members = [alice.clone(), bob.clone(), charlie.clone()];
    let group_id = setup_group_with_contributions(&env, &client, &token, &members, 1_000_000, 0);

    let risk_before = client.get_member_risk_score(&alice);

    // File several claims from alice within the same 24h window.
    for defaulter in [&bob, &charlie, &bob] {
        let _ = client.try_file_insurance_claim(&alice, &group_id, &2u32, defaulter, &1_000i128);
    }

    let risk_after = client.get_member_risk_score(&alice);
    assert!(risk_after > risk_before, "Repeated claim activity should raise the claimant's risk score");
}

#[test]
fn test_pool_solvency_protection() {
    // Fund the pool via real contributions, then verify the per-epoch
    // claimable cap (5% of pool balance) is enforced across successive
    // claims against the same default.
    let (env, client, _admin, alice, bob, charlie) = setup_test_env();
    let token = env.register_stellar_asset_contract(alice.clone());
    let dave = Address::generate(&env);
    let members = [alice.clone(), bob.clone(), charlie.clone(), dave.clone()];
    // 3 contributors x 10% of 10,000,000 = 1,000,000 premium each = 3,000,000 pool.
    // max_members is created at 4 up front so dave has room to join afterward.
    let creator = alice.clone();
    let group_id = client.create_group(
        &creator, &token, &10_000_000i128, &604_800u64, &4u32, &86400u64, &0u32, &1000u32,
    );
    for m in [&bob, &charlie] {
        client.join_group(m, &group_id);
    }
    mint_tokens(&env, &token, &[alice.clone(), bob.clone(), charlie.clone()], 10_000_000);
    for m in [&alice, &bob, &charlie] {
        client.contribute(m, &group_id);
    }
    client.join_group(&dave, &group_id); // dave joins but never contributes: he's the defaulter

    env.ledger().with_mut(|li| { li.timestamp += 604_800 + 86400 + 1; });

    // Pool balance is 3,000,000; 5% epoch cap = 150,000.
    let claim1 = client.file_insurance_claim(&alice, &group_id, &1u32, &dave, &100_000i128);
    client.process_insurance_claim(&alice, &claim1, &true);
    let claim1 = client.get_insurance_claim(&claim1);
    assert_eq!(claim1.status, ClaimStatus::Paid, "First claim is within the epoch cap");

    // A second claim against the same default would push epoch claims to
    // 200,000 > 150,000 cap.
    let claim2 = client.file_insurance_claim(&bob, &group_id, &1u32, &dave, &100_000i128);
    let result = client.try_process_insurance_claim(&alice, &claim2, &true);
    assert_eq!(result, Err(Ok(AjoError::InsufficientPoolBalance)), "Second claim should exceed the per-epoch solvency cap");
}

#[test]
fn test_fraud_profile_updates() {
    // There's no dedicated "fraud profile" entrypoint in the shipped API;
    // get_member_fraud_profile is an alias for the same enhanced risk score
    // used elsewhere. Verify it moves in response to claim activity.
    let (env, client, _admin, alice, bob, _charlie) = setup_test_env();
    let token = env.register_stellar_asset_contract(alice.clone());
    let members = [alice.clone(), bob.clone()];
    let group_id = setup_group_with_contributions(&env, &client, &token, &members, 1_000_000, 1000);

    let initial_profile = client.get_member_fraud_profile(&alice);

    env.ledger().with_mut(|li| { li.timestamp += 604_800 + 86400 + 1; });
    let claim_id = client.file_insurance_claim(&alice, &group_id, &2u32, &bob, &10_000i128);
    client.process_insurance_claim(&alice, &claim_id, &true);

    let updated_profile = client.get_member_fraud_profile(&alice);
    assert!(updated_profile >= initial_profile, "Filing and being paid a claim should not decrease risk score");
}

#[test]
fn test_group_risk_assessment() {
    let (env, client, _admin, alice, bob, charlie) = setup_test_env();
    let token = env.register_stellar_asset_contract(alice.clone());
    let members = [alice.clone(), bob.clone(), charlie.clone()];
    let group_id = setup_group_with_contributions(&env, &client, &token, &members, 1_000_000, 0);

    let initial_risk = client.get_group_risk_assessment(&group_id);

    // File multiple claims (increasing group risk via claimant history).
    env.ledger().with_mut(|li| { li.timestamp += 604_800 + 86400 + 1; });
    let _ = client.try_file_insurance_claim(&alice, &group_id, &2u32, &bob, &1_000i128);
    let _ = client.try_file_insurance_claim(&bob, &group_id, &2u32, &charlie, &1_000i128);
    let _ = client.try_file_insurance_claim(&alice, &group_id, &2u32, &charlie, &1_000i128);

    let updated_risk = client.get_group_risk_assessment(&group_id);
    assert!(updated_risk >= initial_risk, "Group risk should not decrease after claim activity");
}

#[test]
fn test_auto_verify_rejects_high_risk_claims() {
    // A self-dealing claim filed while the claimant has no balance (score
    // 40 + 15 = 55) files successfully. If the claimant's circumstances
    // change before verification — e.g. they suddenly receive a windfall
    // that reveals they could have paid all along — the fraud score is
    // recomputed at verification time and crosses the reject threshold.
    let (env, client, _admin, alice, bob, _charlie) = setup_test_env();
    let token = env.register_stellar_asset_contract(alice.clone());
    let members = [alice.clone(), bob.clone()];
    let group_id = setup_group_with_contributions(&env, &client, &token, &members, 1_000_000, 0);

    let claim_id = client.file_insurance_claim(&alice, &group_id, &2u32, &alice, &1_000_000i128);
    let claim = client.get_insurance_claim(&claim_id);
    assert!(claim.fraud_risk_score < 80, "Self-dealing alone should not trip immediate rejection");

    // Windfall arrives before verification, still within the 1-hour timing window.
    mint_tokens(&env, &token, &[alice.clone()], 5_000_000);
    client.auto_verify_insurance_claim(&claim_id);

    let claim = client.get_insurance_claim(&claim_id);
    assert_eq!(claim.status, ClaimStatus::Rejected, "Recomputed fraud score should reject at verification time");
}

#[test]
fn test_legitimate_claims_pass_verification() {
    let (env, client, _admin, alice, bob, _charlie) = setup_test_env();
    let token = env.register_stellar_asset_contract(alice.clone());
    let members = [alice.clone(), bob.clone()];
    // Both members contribute in cycle 1, each paying a 10% x 20,000,000 =
    // 2,000,000 premium (4,000,000 pool; 5% epoch cap = 200,000). Neither
    // has contributed for cycle 2 yet, so a claim against bob's cycle-2
    // "default" is genuine — comfortably within the epoch cap.
    let group_id = setup_group_with_contributions(&env, &client, &token, &members, 20_000_000, 1000);

    env.ledger().with_mut(|li| { li.timestamp += 604_800 + 86400 + 1; });

    let claim_id = client.file_insurance_claim(&alice, &group_id, &2u32, &bob, &90_000i128);

    client.auto_verify_insurance_claim(&claim_id);

    let claim = client.get_insurance_claim(&claim_id);
    assert_eq!(claim.status, ClaimStatus::Paid);
}
