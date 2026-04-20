-- CreateEnum
CREATE TYPE "ImageStatus" AS ENUM ('DRAFT', 'SAVED', 'PUBLISHED');

-- CreateTable
CREATE TABLE "generated_images" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'gemini-2.5-flash-image',
    "filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "aspect_ratio" TEXT,
    "status" "ImageStatus" NOT NULL DEFAULT 'DRAFT',
    "saved_at" TIMESTAMP(3),
    "used_by_page_id" TEXT,
    "used_by_product_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "generated_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "generated_images_organization_id_idx" ON "generated_images"("organization_id");

-- CreateIndex
CREATE INDEX "generated_images_organization_id_status_idx" ON "generated_images"("organization_id", "status");

-- CreateIndex
CREATE INDEX "generated_images_status_created_at_idx" ON "generated_images"("status", "created_at");

-- AddForeignKey
ALTER TABLE "generated_images" ADD CONSTRAINT "generated_images_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
