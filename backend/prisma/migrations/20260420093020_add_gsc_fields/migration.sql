-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "gsc_access_token" TEXT,
ADD COLUMN     "gsc_connected_at" TIMESTAMP(3),
ADD COLUMN     "gsc_refresh_token" TEXT,
ADD COLUMN     "gsc_site_url" TEXT,
ADD COLUMN     "gsc_token_expiry" TIMESTAMP(3);
