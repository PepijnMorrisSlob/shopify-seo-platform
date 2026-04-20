-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'AGENCY_ADMIN';
ALTER TYPE "UserRole" ADD VALUE 'AGENCY_MEMBER';
ALTER TYPE "UserRole" ADD VALUE 'CLIENT_ADMIN';
ALTER TYPE "UserRole" ADD VALUE 'CLIENT_VIEWER';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "agency_id" TEXT,
ADD COLUMN     "assigned_organizations" TEXT[],
ALTER COLUMN "role" SET DEFAULT 'CLIENT_VIEWER';

-- CreateIndex
CREATE INDEX "users_agency_id_idx" ON "users"("agency_id");
