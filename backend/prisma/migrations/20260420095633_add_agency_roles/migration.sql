-- Add new enum values. PostgreSQL requires ALTER TYPE ADD VALUE to commit
-- before the new values can be referenced (e.g., as a column default). Each
-- ALTER TYPE runs as its own transaction via prisma migrate.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'AGENCY_ADMIN';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'AGENCY_MEMBER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'CLIENT_ADMIN';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'CLIENT_VIEWER';

-- Commit enum changes so the new values are usable below.
COMMIT;

-- Add new columns and update default. Idempotent with IF NOT EXISTS.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "agency_id" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "assigned_organizations" TEXT[];
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'CLIENT_VIEWER';

CREATE INDEX IF NOT EXISTS "users_agency_id_idx" ON "users"("agency_id");
