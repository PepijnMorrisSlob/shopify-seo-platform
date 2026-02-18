#!/bin/bash

# =====================================
# Generate Secure Secrets Script
# =====================================
# This script generates cryptographically secure secrets
# for the Shopify SEO Platform environment variables.
# =====================================

set -e

echo "=================================================="
echo "Shopify SEO Platform - Secret Generator"
echo "=================================================="
echo ""
echo "This script will generate secure secrets for your environment."
echo "Save these values in a secure password manager."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to generate random string
generate_random() {
    local length=$1
    openssl rand -base64 48 | tr -d "=+/" | cut -c1-${length}
}

# Generate secrets
echo -e "${BLUE}Generating secrets...${NC}"
echo ""

# Database password (24 characters)
DB_PASSWORD=$(generate_random 24)
echo -e "${GREEN}DATABASE_PASSWORD=${NC}"
echo "$DB_PASSWORD"
echo ""

# Redis auth token (24 characters)
REDIS_PASSWORD=$(generate_random 24)
echo -e "${GREEN}REDIS_AUTH_TOKEN=${NC}"
echo "$REDIS_PASSWORD"
echo ""

# JWT secret (64 characters)
JWT_SECRET=$(generate_random 64)
echo -e "${GREEN}JWT_SECRET=${NC}"
echo "$JWT_SECRET"
echo ""

# Encryption key (32 characters exactly)
ENCRYPTION_KEY=$(openssl rand -base64 32 | head -c 32)
echo -e "${GREEN}ENCRYPTION_KEY=${NC}"
echo "$ENCRYPTION_KEY"
echo ""

# Session secret (64 characters)
SESSION_SECRET=$(generate_random 64)
echo -e "${GREEN}SESSION_SECRET=${NC}"
echo "$SESSION_SECRET"
echo ""

# Webhook secret (32 characters)
WEBHOOK_SECRET=$(generate_random 32)
echo -e "${GREEN}SHOPIFY_WEBHOOK_SECRET=${NC}"
echo "$WEBHOOK_SECRET"
echo ""

# Generate .env file
echo -e "${YELLOW}Would you like to create a .env file with these values? (y/n)${NC}"
read -r CREATE_ENV

if [ "$CREATE_ENV" = "y" ] || [ "$CREATE_ENV" = "Y" ]; then
    if [ -f .env ]; then
        echo -e "${YELLOW}Warning: .env file already exists. Creating backup...${NC}"
        mv .env .env.backup.$(date +%Y%m%d-%H%M%S)
    fi

    echo "Creating .env file..."
    cp .env.example .env

    # Replace placeholder values
    sed -i.tmp "s/your-jwt-secret-64-characters-long-change-this-in-production/$JWT_SECRET/" .env
    sed -i.tmp "s/your-encryption-key-32-chars-xx/$ENCRYPTION_KEY/" .env
    sed -i.tmp "s/your-session-secret-change-this/$SESSION_SECRET/" .env
    sed -i.tmp "s/your_webhook_secret/$WEBHOOK_SECRET/" .env

    # Clean up temp files
    rm -f .env.tmp

    echo -e "${GREEN}.env file created successfully!${NC}"
    echo ""
    echo -e "${YELLOW}IMPORTANT:${NC}"
    echo "1. Edit .env and fill in remaining values (API keys, etc.)"
    echo "2. Never commit .env to version control"
    echo "3. Keep these secrets secure"
fi

# Generate Terraform secrets file
echo ""
echo -e "${YELLOW}Would you like to create terraform.tfvars with these secrets? (y/n)${NC}"
read -r CREATE_TFVARS

if [ "$CREATE_TFVARS" = "y" ] || [ "$CREATE_TFVARS" = "Y" ]; then
    TFVARS_FILE="infrastructure/terraform/terraform.tfvars"

    if [ -f "$TFVARS_FILE" ]; then
        echo -e "${YELLOW}Warning: terraform.tfvars already exists. Creating backup...${NC}"
        mv "$TFVARS_FILE" "$TFVARS_FILE.backup.$(date +%Y%m%d-%H%M%S)"
    fi

    echo "Creating terraform.tfvars..."
    cat > "$TFVARS_FILE" << EOF
# Shopify SEO Platform - Terraform Variables
# Generated on $(date)

# General Configuration
project_name = "shopify-seo"
environment  = "dev"
aws_region   = "us-east-1"

# Database Configuration
db_name     = "shopify_seo"
db_username = "postgres"
db_password = "$DB_PASSWORD"

# Redis Configuration
redis_node_type  = "cache.t4g.micro"
redis_auth_token = "$REDIS_PASSWORD"

# Security Configuration
jwt_secret     = "$JWT_SECRET"
encryption_key = "$ENCRYPTION_KEY"

# Shopify Configuration (FILL THESE IN)
shopify_api_key    = "YOUR_SHOPIFY_API_KEY"
shopify_api_secret = "YOUR_SHOPIFY_API_SECRET"

# Optional: External Services
openai_api_key    = ""
anthropic_api_key = ""
datadog_api_key   = ""
sentry_dsn        = ""

# Monitoring
alert_email = "alerts@example.com"

# Tags
tags = {
  Team    = "Engineering"
  Owner   = "DevOps"
  Project = "Shopify SEO Platform"
}
EOF

    echo -e "${GREEN}terraform.tfvars created successfully!${NC}"
    echo ""
    echo -e "${YELLOW}IMPORTANT:${NC}"
    echo "1. Edit terraform.tfvars and fill in Shopify API keys"
    echo "2. Never commit terraform.tfvars to version control"
    echo "3. Use different secrets for production"
fi

# Generate AWS Secrets Manager upload script
echo ""
echo -e "${YELLOW}Would you like to create a script to upload secrets to AWS Secrets Manager? (y/n)${NC}"
read -r CREATE_AWS_SCRIPT

if [ "$CREATE_AWS_SCRIPT" = "y" ] || [ "$CREATE_AWS_SCRIPT" = "Y" ]; then
    SCRIPT_FILE="scripts/upload-secrets-to-aws.sh"

    cat > "$SCRIPT_FILE" << 'EOF'
#!/bin/bash
# Upload secrets to AWS Secrets Manager
# Usage: ./upload-secrets-to-aws.sh <environment>

ENVIRONMENT=${1:-dev}
REGION=${AWS_REGION:-us-east-1}

echo "Uploading secrets to AWS Secrets Manager for environment: $ENVIRONMENT"

# Read from .env file
source .env

# Function to create or update secret
upsert_secret() {
    local secret_name=$1
    local secret_value=$2

    if aws secretsmanager describe-secret --secret-id "$secret_name" --region "$REGION" >/dev/null 2>&1; then
        echo "Updating existing secret: $secret_name"
        aws secretsmanager update-secret \
            --secret-id "$secret_name" \
            --secret-string "$secret_value" \
            --region "$REGION"
    else
        echo "Creating new secret: $secret_name"
        aws secretsmanager create-secret \
            --name "$secret_name" \
            --secret-string "$secret_value" \
            --region "$REGION"
    fi
}

# Upload secrets
upsert_secret "shopify-seo/database-url-$ENVIRONMENT" "$DATABASE_URL"
upsert_secret "shopify-seo/redis-url-$ENVIRONMENT" "$REDIS_URL"
upsert_secret "shopify-seo/jwt-secret-$ENVIRONMENT" "$JWT_SECRET"
upsert_secret "shopify-seo/encryption-key-$ENVIRONMENT" "$ENCRYPTION_KEY"
upsert_secret "shopify-seo/shopify-api-key-$ENVIRONMENT" "$SHOPIFY_API_KEY"
upsert_secret "shopify-seo/shopify-api-secret-$ENVIRONMENT" "$SHOPIFY_API_SECRET"

if [ -n "$OPENAI_API_KEY" ]; then
    upsert_secret "shopify-seo/openai-api-key-$ENVIRONMENT" "$OPENAI_API_KEY"
fi

if [ -n "$ANTHROPIC_API_KEY" ]; then
    upsert_secret "shopify-seo/anthropic-api-key-$ENVIRONMENT" "$ANTHROPIC_API_KEY"
fi

if [ -n "$DATADOG_API_KEY" ]; then
    upsert_secret "shopify-seo/datadog-api-key-$ENVIRONMENT" "$DATADOG_API_KEY"
fi

if [ -n "$SENTRY_DSN" ]; then
    upsert_secret "shopify-seo/sentry-dsn-$ENVIRONMENT" "$SENTRY_DSN"
fi

echo ""
echo "Secrets uploaded successfully!"
echo "Verify in AWS Console: https://console.aws.amazon.com/secretsmanager/"
EOF

    chmod +x "$SCRIPT_FILE"
    echo -e "${GREEN}AWS upload script created: $SCRIPT_FILE${NC}"
fi

echo ""
echo "=================================================="
echo -e "${GREEN}Secret generation complete!${NC}"
echo "=================================================="
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Save all generated secrets in a secure password manager"
echo "2. Fill in remaining API keys in .env (Shopify, OpenAI, etc.)"
echo "3. For production, generate new secrets (never reuse dev secrets)"
echo "4. Rotate secrets every 90 days"
echo ""
echo -e "${YELLOW}Security reminders:${NC}"
echo "- Never commit .env or terraform.tfvars to git"
echo "- Use AWS Secrets Manager for production"
echo "- Enable MFA on all AWS/GitHub accounts"
echo "- Regularly audit secret access logs"
echo ""
