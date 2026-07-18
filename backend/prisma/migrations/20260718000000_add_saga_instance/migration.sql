-- Add SagaInstance model: persisted, crash-recoverable state for the saga
-- orchestrator (backend/src/sagas). Replaces in-memory-only saga tracking so
-- a process restart can resume or compensate a saga instead of losing it.
CREATE TABLE IF NOT EXISTS "SagaInstance" (
    "id"            TEXT NOT NULL PRIMARY KEY,
    "name"          TEXT NOT NULL,
    "status"        TEXT NOT NULL DEFAULT 'pending',
    "currentStep"   INTEGER NOT NULL DEFAULT 0,
    "payload"       JSONB NOT NULL,
    "context"       JSONB NOT NULL DEFAULT '{}',
    "stepLog"       JSONB NOT NULL DEFAULT '[]',
    "error"         TEXT,
    "lastHeartbeat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,
    "completedAt"   TIMESTAMP(3)
);

CREATE INDEX IF NOT EXISTS "SagaInstance_status_idx" ON "SagaInstance"("status");
CREATE INDEX IF NOT EXISTS "SagaInstance_name_status_idx" ON "SagaInstance"("name", "status");
CREATE INDEX IF NOT EXISTS "SagaInstance_lastHeartbeat_idx" ON "SagaInstance"("lastHeartbeat");

-- One payout per group per cycle — lets payoutSaga upsert idempotently on
-- crash-recovery retries instead of risking a duplicate payout record.
CREATE UNIQUE INDEX IF NOT EXISTS "Payout_groupId_cycleNumber_key" ON "Payout"("groupId", "cycleNumber");
