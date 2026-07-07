-- Migration: add_verification_and_saved_search (Issue #589)

CREATE TABLE "Verification" (
    "id"             TEXT NOT NULL,
    "userId"         TEXT NOT NULL,
    "emailOtp"       TEXT,
    "emailOtpExpiry" TIMESTAMP(3),
    "emailVerified"  BOOLEAN NOT NULL DEFAULT false,
    "phone"          TEXT,
    "phoneOtp"       TEXT,
    "phoneOtpExpiry" TIMESTAMP(3),
    "phoneVerified"  BOOLEAN NOT NULL DEFAULT false,
    "kycLevel"       INTEGER NOT NULL DEFAULT 0,
    "kycStatus"      TEXT NOT NULL DEFAULT 'none',
    "kycNotes"       TEXT,
    "kycRequestedAt" TIMESTAMP(3),
    "kycVerifiedAt"  TIMESTAMP(3),
    "kycRejectedAt"  TIMESTAMP(3),
    "trustScore"     INTEGER NOT NULL DEFAULT 0,
    "trustUpdatedAt" TIMESTAMP(3),
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Verification_userId_key" ON "Verification"("userId");
CREATE INDEX "Verification_kycStatus_idx" ON "Verification"("kycStatus");

ALTER TABLE "Verification"
    ADD CONSTRAINT "Verification_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("walletAddress") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "VerificationDoc" (
    "id"             TEXT NOT NULL,
    "verificationId" TEXT NOT NULL,
    "docType"        TEXT NOT NULL,
    "fileName"       TEXT NOT NULL,
    "mimeType"       TEXT NOT NULL,
    "sizeBytes"      INTEGER NOT NULL,
    "storageKey"     TEXT NOT NULL,
    "status"         TEXT NOT NULL DEFAULT 'pending',
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationDoc_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VerificationDoc_verificationId_idx" ON "VerificationDoc"("verificationId");

ALTER TABLE "VerificationDoc"
    ADD CONSTRAINT "VerificationDoc_verificationId_fkey"
    FOREIGN KEY ("verificationId") REFERENCES "Verification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "SavedSearch" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "entity"    TEXT NOT NULL,
    "filters"   JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SavedSearch_userId_idx" ON "SavedSearch"("userId");

ALTER TABLE "SavedSearch"
    ADD CONSTRAINT "SavedSearch_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("walletAddress") ON DELETE CASCADE ON UPDATE CASCADE;
