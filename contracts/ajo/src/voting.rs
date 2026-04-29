use soroban_sdk::{contracttype, Address, Env, Vec, symbol_short, Symbol};

/// A single vote cast by a member for a candidate payout recipient.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PayoutVoteCast {
    pub group_id: u64,
    pub cycle: u32,
    pub voter: Address,
    pub candidate: Address,
    pub timestamp: u64,
}

/// Aggregated tally for one candidate in a cycle.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VoteTally {
    pub candidate: Address,
    pub votes: u32,
}

const VOTE_KEY: Symbol = symbol_short!("PVOTE");
const TALLY_KEY: Symbol = symbol_short!("PTALLY");
const VOTED_KEY: Symbol = symbol_short!("PVOTED");

fn vote_key(env: &Env, group_id: u64, cycle: u32, voter: &Address) -> soroban_sdk::Val {
    (VOTE_KEY, group_id, cycle, voter.clone()).into_val(env)
}

fn tally_key(env: &Env, group_id: u64, cycle: u32, candidate: &Address) -> soroban_sdk::Val {
    (TALLY_KEY, group_id, cycle, candidate.clone()).into_val(env)
}

fn voted_key(env: &Env, group_id: u64, cycle: u32, voter: &Address) -> soroban_sdk::Val {
    (VOTED_KEY, group_id, cycle, voter.clone()).into_val(env)
}

/// Cast a vote for a payout candidate in the current cycle.
/// Each member may vote once per cycle.
pub fn cast_vote(
    env: &Env,
    group_id: u64,
    cycle: u32,
    voter: Address,
    candidate: Address,
    members: &Vec<Address>,
) {
    voter.require_auth();

    assert!(members.contains(&voter), "voter is not a group member");
    assert!(members.contains(&candidate), "candidate is not a group member");

    let vk = voted_key(env, group_id, cycle, &voter);
    let already: bool = env.storage().instance().get(&vk).unwrap_or(false);
    assert!(!already, "already voted this cycle");

    let vote = PayoutVoteCast {
        group_id,
        cycle,
        voter: voter.clone(),
        candidate: candidate.clone(),
        timestamp: env.ledger().timestamp(),
    };

    env.storage().instance().set(&vote_key(env, group_id, cycle, &voter), &vote);
    env.storage().instance().set(&vk, &true);

    // Increment tally
    let tk = tally_key(env, group_id, cycle, &candidate);
    let current: u32 = env.storage().instance().get(&tk).unwrap_or(0u32);
    env.storage().instance().set(&tk, &(current + 1));
}

/// Get the vote tally for a specific candidate in a cycle.
pub fn get_tally(env: &Env, group_id: u64, cycle: u32, candidate: &Address) -> u32 {
    env.storage()
        .instance()
        .get(&tally_key(env, group_id, cycle, candidate))
        .unwrap_or(0u32)
}

/// Determine the winner (most votes) among a list of candidates.
/// Returns None if no votes have been cast.
pub fn get_winner(
    env: &Env,
    group_id: u64,
    cycle: u32,
    candidates: &Vec<Address>,
) -> Option<Address> {
    let mut best: Option<(Address, u32)> = None;
    for candidate in candidates.iter() {
        let votes = get_tally(env, group_id, cycle, &candidate);
        if votes > 0 {
            match &best {
                None => best = Some((candidate, votes)),
                Some((_, best_votes)) if votes > *best_votes => {
                    best = Some((candidate, votes));
                }
                _ => {}
            }
        }
    }
    best.map(|(addr, _)| addr)
}

/// Check whether a member has already voted in a cycle.
pub fn has_voted(env: &Env, group_id: u64, cycle: u32, voter: &Address) -> bool {
    env.storage()
        .instance()
        .get(&voted_key(env, group_id, cycle, voter))
        .unwrap_or(false)
}
