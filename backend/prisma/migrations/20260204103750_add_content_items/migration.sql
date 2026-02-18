-- CreateEnum
CREATE TYPE "ContentItemType" AS ENUM ('BLOG_POST', 'CUSTOM_PAGE');

-- CreateEnum
CREATE TYPE "ContentItemStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED');

-- CreateTable
CREATE TABLE "content_items" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "content_type" "ContentItemType" NOT NULL,
    "status" "ContentItemStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduled_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "shopify_id" TEXT,
    "shopify_handle" TEXT,
    "seo_title" TEXT,
    "seo_description" TEXT,
    "tags" TEXT[],
    "author" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_items_organization_id_scheduled_at_idx" ON "content_items"("organization_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "content_items_organization_id_status_idx" ON "content_items"("organization_id", "status");

-- AddForeignKey
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
