-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'CHURNED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'DRAFT', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ContentTargetType" AS ENUM ('META_TITLE', 'META_DESCRIPTION', 'IMAGE_ALT_TEXT', 'PRODUCT_DESCRIPTION', 'COLLECTION_DESCRIPTION');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "WebhookStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "SnapshotType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "shopify_domain" TEXT NOT NULL,
    "shopify_shop_id" TEXT NOT NULL,
    "access_token_encrypted" TEXT NOT NULL,
    "shopify_scopes" TEXT NOT NULL,
    "plan_tier" "PlanTier" NOT NULL DEFAULT 'FREE',
    "billing_status" "BillingStatus" NOT NULL DEFAULT 'TRIAL',
    "trial_ends_at" TIMESTAMP(3),
    "subscription_id" TEXT,
    "mrr" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "store_name" TEXT,
    "store_owner_email" TEXT,
    "country" TEXT,
    "currency" TEXT,
    "timezone" TEXT,
    "installed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uninstalled_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "monthly_api_calls" INTEGER NOT NULL DEFAULT 0,
    "monthly_content_gens" INTEGER NOT NULL DEFAULT 0,
    "last_sync_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "password_hash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "permissions" TEXT[],
    "last_login_at" TIMESTAMP(3),
    "last_activity_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "shopify_product_id" TEXT NOT NULL,
    "shopify_variant_id" TEXT,
    "handle" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body_html" TEXT,
    "product_type" TEXT,
    "vendor" TEXT,
    "tags" TEXT[],
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "current_meta_title" TEXT,
    "current_meta_description" TEXT,
    "current_image_alt" TEXT,
    "generated_meta_title" TEXT,
    "generated_meta_description" TEXT,
    "generated_image_alt" TEXT,
    "target_keywords" TEXT[],
    "primary_keyword" TEXT,
    "seo_score" INTEGER,
    "meta_title_length" INTEGER,
    "meta_description_length" INTEGER,
    "has_optimized_images" BOOLEAN NOT NULL DEFAULT false,
    "impressions" INTEGER DEFAULT 0,
    "clicks" INTEGER DEFAULT 0,
    "ctr" DECIMAL(5,2),
    "avg_position" DECIMAL(5,2),
    "published_at" TIMESTAMP(3),
    "last_optimized_at" TIMESTAMP(3),
    "needs_review" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_generations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "product_id" TEXT,
    "target_type" "ContentTargetType" NOT NULL,
    "ai_model" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "system_prompt" TEXT,
    "generated_content" TEXT NOT NULL,
    "variants" JSONB,
    "quality_score" INTEGER,
    "keyword_density" DECIMAL(5,2),
    "readability_score" INTEGER,
    "sentiment_score" DECIMAL(3,2),
    "status" "ContentStatus" NOT NULL DEFAULT 'PENDING',
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "published_at" TIMESTAMP(3),
    "published_to_shopify" BOOLEAN NOT NULL DEFAULT false,
    "tokens_used" INTEGER,
    "generation_time_ms" INTEGER,
    "cost" DECIMAL(10,4),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_generations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "keywords" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "product_id" TEXT,
    "keyword" TEXT NOT NULL,
    "search_volume" INTEGER,
    "difficulty" INTEGER,
    "cpc" DECIMAL(10,2),
    "competition" DECIMAL(3,2),
    "current_position" INTEGER,
    "previous_position" INTEGER,
    "impressions" INTEGER DEFAULT 0,
    "clicks" INTEGER DEFAULT 0,
    "ctr" DECIMAL(5,2),
    "data_source" TEXT,
    "last_fetched_at" TIMESTAMP(3),
    "is_targeted" BOOLEAN NOT NULL DEFAULT false,
    "targeted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT,
    "changes" JSONB,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "request_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "shopify_event_id" TEXT,
    "payload" JSONB NOT NULL,
    "hmac_valid" BOOLEAN NOT NULL,
    "status" "WebhookStatus" NOT NULL DEFAULT 'PENDING',
    "processed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_snapshots" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "snapshot_date" DATE NOT NULL,
    "snapshot_type" "SnapshotType" NOT NULL,
    "total_products" INTEGER NOT NULL,
    "optimized_products" INTEGER NOT NULL,
    "avg_seo_score" DECIMAL(5,2) NOT NULL,
    "total_impressions" INTEGER NOT NULL,
    "total_clicks" INTEGER NOT NULL,
    "avg_ctr" DECIMAL(5,2) NOT NULL,
    "avg_position" DECIMAL(5,2) NOT NULL,
    "content_generations" INTEGER NOT NULL,
    "ai_cost" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_profiles" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "business_name" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "product_types" JSONB NOT NULL,
    "target_audience" JSONB NOT NULL,
    "brand_voice" JSONB NOT NULL,
    "content_strategy" JSONB NOT NULL,
    "seo_strategy" JSONB NOT NULL,
    "product_strategy" JSONB NOT NULL,
    "advanced_settings" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_question_templates" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "business_profile_id" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "category" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "variables" JSONB,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_question_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qa_pages" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer_content" TEXT,
    "answer_markdown" TEXT,
    "featured_image_url" TEXT,
    "shopify_blog_id" TEXT,
    "shopify_blog_post_id" TEXT,
    "shopify_page_id" TEXT,
    "shopify_url" TEXT,
    "target_keyword" TEXT,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "h1" TEXT,
    "schema_markup" JSONB,
    "current_position" INTEGER,
    "best_position" INTEGER,
    "monthly_impressions" INTEGER NOT NULL DEFAULT 0,
    "monthly_clicks" INTEGER NOT NULL DEFAULT 0,
    "monthly_traffic" INTEGER NOT NULL DEFAULT 0,
    "ctr" DECIMAL(5,2),
    "seo_score" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMP(3),
    "last_optimized_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qa_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_links" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "source_page_type" TEXT NOT NULL,
    "source_page_id" TEXT,
    "source_url" TEXT NOT NULL,
    "target_page_type" TEXT NOT NULL,
    "target_page_id" TEXT,
    "target_url" TEXT NOT NULL,
    "anchor_text" TEXT NOT NULL,
    "context" TEXT,
    "link_type" TEXT NOT NULL,
    "relevance_score" DECIMAL(3,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "internal_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_performance" (
    "id" TEXT NOT NULL,
    "page_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "ctr" DECIMAL(5,2),
    "avg_position" DECIMAL(5,2),
    "pageviews" INTEGER NOT NULL DEFAULT 0,
    "unique_visitors" INTEGER NOT NULL DEFAULT 0,
    "avg_time_on_page" INTEGER,
    "bounce_rate" DECIMAL(5,2),
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_performance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ab_tests" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "page_id" TEXT,
    "element_type" TEXT NOT NULL,
    "control_value" TEXT NOT NULL,
    "variant_a_value" TEXT,
    "variant_b_value" TEXT,
    "traffic_split" JSONB NOT NULL,
    "results" JSONB,
    "winner" TEXT,
    "confidence" DECIMAL(5,2),
    "status" TEXT NOT NULL DEFAULT 'running',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ab_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_rules" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "rule_type" TEXT NOT NULL,
    "configuration" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_executed_at" TIMESTAMP(3),
    "execution_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitors" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "competitor_url" TEXT NOT NULL,
    "competitor_name" TEXT,
    "content_topics" JSONB,
    "keywords_they_rank_for" JSONB,
    "content_gaps" JSONB,
    "last_analyzed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competitors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_shopify_domain_key" ON "organizations"("shopify_domain");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_shopify_shop_id_key" ON "organizations"("shopify_shop_id");

-- CreateIndex
CREATE INDEX "organizations_shopify_domain_idx" ON "organizations"("shopify_domain");

-- CreateIndex
CREATE INDEX "organizations_plan_tier_billing_status_idx" ON "organizations"("plan_tier", "billing_status");

-- CreateIndex
CREATE INDEX "organizations_is_active_idx" ON "organizations"("is_active");

-- CreateIndex
CREATE INDEX "users_organization_id_idx" ON "users"("organization_id");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_organization_id_is_active_idx" ON "users"("organization_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "users_organization_id_email_key" ON "users"("organization_id", "email");

-- CreateIndex
CREATE INDEX "products_organization_id_idx" ON "products"("organization_id");

-- CreateIndex
CREATE INDEX "products_organization_id_status_idx" ON "products"("organization_id", "status");

-- CreateIndex
CREATE INDEX "products_organization_id_seo_score_idx" ON "products"("organization_id", "seo_score");

-- CreateIndex
CREATE INDEX "products_shopify_product_id_idx" ON "products"("shopify_product_id");

-- CreateIndex
CREATE INDEX "products_handle_idx" ON "products"("handle");

-- CreateIndex
CREATE INDEX "products_organization_id_needs_review_idx" ON "products"("organization_id", "needs_review");

-- CreateIndex
CREATE UNIQUE INDEX "products_organization_id_shopify_product_id_key" ON "products"("organization_id", "shopify_product_id");

-- CreateIndex
CREATE INDEX "content_generations_organization_id_idx" ON "content_generations"("organization_id");

-- CreateIndex
CREATE INDEX "content_generations_organization_id_status_idx" ON "content_generations"("organization_id", "status");

-- CreateIndex
CREATE INDEX "content_generations_organization_id_target_type_idx" ON "content_generations"("organization_id", "target_type");

-- CreateIndex
CREATE INDEX "content_generations_product_id_idx" ON "content_generations"("product_id");

-- CreateIndex
CREATE INDEX "content_generations_organization_id_created_at_idx" ON "content_generations"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "keywords_organization_id_idx" ON "keywords"("organization_id");

-- CreateIndex
CREATE INDEX "keywords_organization_id_is_targeted_idx" ON "keywords"("organization_id", "is_targeted");

-- CreateIndex
CREATE INDEX "keywords_keyword_idx" ON "keywords"("keyword");

-- CreateIndex
CREATE INDEX "keywords_product_id_idx" ON "keywords"("product_id");

-- CreateIndex
CREATE INDEX "keywords_organization_id_current_position_idx" ON "keywords"("organization_id", "current_position");

-- CreateIndex
CREATE UNIQUE INDEX "keywords_organization_id_keyword_product_id_key" ON "keywords"("organization_id", "keyword", "product_id");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_idx" ON "audit_logs"("organization_id");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_user_id_idx" ON "audit_logs"("organization_id", "user_id");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_action_idx" ON "audit_logs"("organization_id", "action");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_resource_type_resource_id_idx" ON "audit_logs"("organization_id", "resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_created_at_idx" ON "audit_logs"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "webhook_events_organization_id_idx" ON "webhook_events"("organization_id");

-- CreateIndex
CREATE INDEX "webhook_events_organization_id_status_idx" ON "webhook_events"("organization_id", "status");

-- CreateIndex
CREATE INDEX "webhook_events_organization_id_topic_idx" ON "webhook_events"("organization_id", "topic");

-- CreateIndex
CREATE INDEX "webhook_events_status_retry_count_idx" ON "webhook_events"("status", "retry_count");

-- CreateIndex
CREATE INDEX "webhook_events_created_at_idx" ON "webhook_events"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_organization_id_shopify_event_id_key" ON "webhook_events"("organization_id", "shopify_event_id");

-- CreateIndex
CREATE INDEX "analytics_snapshots_organization_id_idx" ON "analytics_snapshots"("organization_id");

-- CreateIndex
CREATE INDEX "analytics_snapshots_organization_id_snapshot_date_idx" ON "analytics_snapshots"("organization_id", "snapshot_date");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_snapshots_organization_id_snapshot_date_snapshot__key" ON "analytics_snapshots"("organization_id", "snapshot_date", "snapshot_type");

-- CreateIndex
CREATE UNIQUE INDEX "business_profiles_organization_id_key" ON "business_profiles"("organization_id");

-- CreateIndex
CREATE INDEX "business_profiles_organization_id_idx" ON "business_profiles"("organization_id");

-- CreateIndex
CREATE INDEX "business_profiles_industry_idx" ON "business_profiles"("industry");

-- CreateIndex
CREATE INDEX "custom_question_templates_organization_id_idx" ON "custom_question_templates"("organization_id");

-- CreateIndex
CREATE INDEX "custom_question_templates_business_profile_id_idx" ON "custom_question_templates"("business_profile_id");

-- CreateIndex
CREATE INDEX "custom_question_templates_organization_id_priority_idx" ON "custom_question_templates"("organization_id", "priority");

-- CreateIndex
CREATE INDEX "custom_question_templates_category_idx" ON "custom_question_templates"("category");

-- CreateIndex
CREATE INDEX "qa_pages_organization_id_idx" ON "qa_pages"("organization_id");

-- CreateIndex
CREATE INDEX "qa_pages_organization_id_status_idx" ON "qa_pages"("organization_id", "status");

-- CreateIndex
CREATE INDEX "qa_pages_target_keyword_idx" ON "qa_pages"("target_keyword");

-- CreateIndex
CREATE INDEX "qa_pages_organization_id_monthly_traffic_idx" ON "qa_pages"("organization_id", "monthly_traffic");

-- CreateIndex
CREATE INDEX "qa_pages_shopify_blog_post_id_idx" ON "qa_pages"("shopify_blog_post_id");

-- CreateIndex
CREATE INDEX "internal_links_organization_id_idx" ON "internal_links"("organization_id");

-- CreateIndex
CREATE INDEX "internal_links_source_url_idx" ON "internal_links"("source_url");

-- CreateIndex
CREATE INDEX "internal_links_target_url_idx" ON "internal_links"("target_url");

-- CreateIndex
CREATE INDEX "internal_links_source_page_id_idx" ON "internal_links"("source_page_id");

-- CreateIndex
CREATE UNIQUE INDEX "internal_links_organization_id_source_url_target_url_anchor_key" ON "internal_links"("organization_id", "source_url", "target_url", "anchor_text");

-- CreateIndex
CREATE INDEX "content_performance_page_id_date_idx" ON "content_performance"("page_id", "date");

-- CreateIndex
CREATE INDEX "content_performance_date_idx" ON "content_performance"("date");

-- CreateIndex
CREATE UNIQUE INDEX "content_performance_page_id_date_key" ON "content_performance"("page_id", "date");

-- CreateIndex
CREATE INDEX "ab_tests_organization_id_idx" ON "ab_tests"("organization_id");

-- CreateIndex
CREATE INDEX "ab_tests_page_id_idx" ON "ab_tests"("page_id");

-- CreateIndex
CREATE INDEX "ab_tests_status_idx" ON "ab_tests"("status");

-- CreateIndex
CREATE INDEX "automation_rules_organization_id_idx" ON "automation_rules"("organization_id");

-- CreateIndex
CREATE INDEX "automation_rules_organization_id_rule_type_idx" ON "automation_rules"("organization_id", "rule_type");

-- CreateIndex
CREATE INDEX "automation_rules_enabled_idx" ON "automation_rules"("enabled");

-- CreateIndex
CREATE INDEX "competitors_organization_id_idx" ON "competitors"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "competitors_organization_id_competitor_url_key" ON "competitors"("organization_id", "competitor_url");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_generations" ADD CONSTRAINT "content_generations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_generations" ADD CONSTRAINT "content_generations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keywords" ADD CONSTRAINT "keywords_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keywords" ADD CONSTRAINT "keywords_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_snapshots" ADD CONSTRAINT "analytics_snapshots_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_question_templates" ADD CONSTRAINT "custom_question_templates_business_profile_id_fkey" FOREIGN KEY ("business_profile_id") REFERENCES "business_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qa_pages" ADD CONSTRAINT "qa_pages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_links" ADD CONSTRAINT "internal_links_source_page_id_fkey" FOREIGN KEY ("source_page_id") REFERENCES "qa_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_performance" ADD CONSTRAINT "content_performance_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "qa_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ab_tests" ADD CONSTRAINT "ab_tests_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "qa_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "business_profiles"("organization_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitors" ADD CONSTRAINT "competitors_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
