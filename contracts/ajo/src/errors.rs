use soroban_sdk::contracterror;

/// Error codes for the Ajo contract.
///
/// # Discriminant gaps (13, 14, 38, 40, 42, 45, 54, 55, 56, 57 unused)
/// soroban-sdk 21.x's `#[contracterror]` macro hard-caps error enums at 50
/// cases (`ScSpecUdtErrorEnumV0.cases: VecM<_, 50>`); this enum had grown to
/// 60 variants and failed to compile (`LengthExceedsMax`). To land at 50
/// while still adding the loan/emergency-fund error codes those (newly
/// finished) modules need, variants were consolidated wherever two codes
/// meant the same thing in different features:
/// - `NoMembers` → [`AjoError::NoEligibleMembers`] (both mean "no valid
///   payout recipient"; the removed one was the Sequential-only spelling).
/// - `NotDisputeMember` → [`AjoError::NotMember`].
/// - `AlreadyVotedOnDispute` → [`AjoError::AlreadyVoted`].
/// - `ClaimAlreadyProcessed` → [`AjoError::InvalidClaim`] (insurance.rs
///   already reused `InvalidClaim` for adjacent claim-state failures).
/// - `NoRefundRequest`, `DisputeNotFound` → [`AjoError::RequestNotFound`]
///   (refund requests, disputes, loans, and emergency requests are all the
///   same "create → vote → resolve" shape; a request-by-ID lookup miss
///   means the same thing in every one of them).
/// - `RefundAlreadyExecuted`, `DisputeAlreadyResolved`,
///   `VotingPeriodEndedDispute` → [`AjoError::RequestAlreadyProcessed`] /
///   [`AjoError::VotingPeriodEnded`] respectively, for the same reason.
/// - `TransferFailed`, `InvalidTokenAddress`, `InsufficientAllowance`,
///   `InvalidStrategy`, `ReputationNotFound` were deleted outright: never
///   constructed anywhere in this crate.
///
/// Discriminant *values* are left as gaps rather than renumbered, so any
/// already-deployed client matching on a surviving code keeps working; the
/// freed numeric slots (31, 36, 52, 53) were reassigned to the new
/// loan/emergency variants below rather than left unused. Exactly 50/50
/// slots are used — consolidate further, or move to a newer soroban-sdk
/// (the cap was lifted in stellar-xdr 25+), before adding more.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum AjoError {
    /// The specified group wasn't found in storage.
    GroupNotFound = 1,

    /// Can't join because the group is already at its member limit.
    MaxMembersExceeded = 2,

    /// This account is already part of the group.
    AlreadyMember = 3,

    /// Address isn't a member of the group.
    NotMember = 4,

    /// You've already made your contribution for this cycle.
    AlreadyContributed = 5,

    /// We can't move forward until everyone has contributed.
    IncompleteContributions = 6,

    /// Member has already been paid out.
    AlreadyReceivedPayout = 7,

    /// All cycles for this group are finished.
    GroupComplete = 8,

    /// Contribution amount can't be zero.
    ContributionAmountZero = 9,

    /// Cycle duration must be greater than zero.
    CycleDurationZero = 10,

    /// Groups need at least 2 members to work.
    MaxMembersBelowMinimum = 11,

    /// Max members exceeds reasonable limit.
    MaxMembersAboveLimit = 18,

    /// Member doesn't have enough balance.
    InsufficientBalance = 12,

    /// Only the creator or authorized members can do this.
    Unauthorized = 15,

    /// Contribution outside active cycle window
    OutsideCycleWindow = 16,

    /// Negative amounts aren't allowed for contributions.
    ContributionAmountNegative = 17,

    /// This group has been cancelled by its creator.
    GroupCancelled = 19,

    /// The contract has already been initialized.
    AlreadyInitialized = 20,

    /// The contract is currently paused and cannot execute this operation.
    ContractPaused = 21,

    /// Only the admin can pause the contract.
    UnauthorizedPause = 22,

    /// Only the admin can unpause the contract.
    UnauthorizedUnpause = 23,

    /// Contribution is too late - grace period has expired.
    GracePeriodExpired = 24,

    /// Invalid grace period duration.
    InvalidGracePeriod = 25,

    /// Invalid penalty rate (must be 0-100).
    InvalidPenaltyRate = 26,

    /// Metadata field exceeds maximum length.
    MetadataTooLong = 27,

    /// Cannot cancel group after first payout.
    CannotCancelAfterPayout = 28,

    /// Only the group creator can cancel the group.
    OnlyCreatorCanCancel = 29,

    /// Refund request already exists for this group.
    RefundRequestExists = 30,

    /// No active request found for the given ID (refund request, dispute,
    /// loan, or emergency-fund request — all share this code since they are
    /// structurally identical "create → vote → resolve" workflows).
    RequestNotFound = 31,

    /// Member has already voted (on a refund or a dispute).
    AlreadyVoted = 32,

    /// Voting period has not ended yet.
    VotingPeriodActive = 33,

    /// Voting period has ended (refund or dispute voting).
    VotingPeriodEnded = 34,

    /// Refund request was not approved.
    RefundNotApproved = 35,

    /// The request has already reached a terminal/processed state (refund
    /// executed, dispute resolved, loan/emergency-request approved or
    /// rejected) — shared across the same request-workflow features as
    /// [`AjoError::RequestNotFound`].
    RequestAlreadyProcessed = 36,

    /// Cannot request refund before cycle deadline.
    CycleNotExpired = 37,

    /// Contract has insufficient token balance for payout.
    InsufficientContractBalance = 39,

    /// Insurance claim not found, invalid, or already processed.
    InvalidClaim = 41,

    /// Insurance pool has insufficient balance for payout.
    InsufficientPoolBalance = 43,

    /// Insurance pool for token not found.
    PoolNotFound = 44,

    /// Voting is not open for this group's payout strategy.
    VotingNotOpen = 46,

    /// No eligible members remain for payout selection (all have been paid,
    /// or the members list is empty/exhausted for the active strategy).
    NoEligibleMembers = 47,

    // ── Multi-token errors ────────────────────────────────────────────────

    /// The token is not in the group's accepted token list.
    TokenNotAccepted = 48,

    /// Invalid multi-token configuration (empty list, duplicates, zero weight,
    /// or too many tokens).
    InvalidMultiTokenConfig = 49,

    /// Group does not have multi-token configuration.
    NotMultiTokenGroup = 50,

    /// No notification preferences found for this member.
    PreferencesNotFound = 51,

    // ── Reputation errors ─────────────────────────────────────────────────

    /// Member's credit score is below the group's minimum requirement.
    InsufficientCreditScore = 58,

    // ── Loan / emergency-fund errors ────────────────────────────────────

    /// The loan or emergency request is not in the state required for this
    /// action (e.g. repaying before disbursement, voting after disbursement).
    RequestNotActive = 52,

    /// The repayment amount exceeds the outstanding balance owed.
    RepaymentExceedsBalance = 53,

    /// Stored schema version is not supported by this Wasm.
    SchemaUnsupported = 59,

    /// Requested upgrade does not declare compatibility with this storage schema.
    SchemaMismatch = 60,
}
