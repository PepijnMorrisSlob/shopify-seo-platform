# Shopify SEO Platform - Deployment Guide

This guide provides step-by-step instructions for deploying the Shopify SEO Platform to AWS.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [AWS Infrastructure Deployment](#aws-infrastructure-deployment)
4. [Application Deployment](#application-deployment)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

- **AWS CLI** (v2.x): `aws --version`
- **Terraform** (v1.6+): `terraform --version`
- **Docker** (v24+): `docker --version`
- **Docker Compose** (v2.x): `docker compose version`
- **Node.js** (v20.x): `node --version`
- **Git**: `git --version`

### AWS Account Setup

1. **Create AWS Account** (if not already created)
2. **Create IAM User** with Administrator access
3. **Generate Access Keys**:
   ```bash
   aws configure
   # Enter: AWS Access Key ID
   # Enter: AWS Secret Access Key
   # Enter: Default region (us-east-1)
   # Enter: Default output format (json)
   ```

4. **Verify Access**:
   ```bash
   aws sts get-caller-identity
   ```

### GitHub Setup

1. **Fork or Clone Repository**
2. **Configure GitHub Secrets** (Settings → Secrets and variables → Actions):
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `SHOPIFY_API_KEY`
   - `SHOPIFY_API_SECRET`
   - `DATADOG_API_KEY` (optional)
   - `SENTRY_DSN` (optional)
   - `SLACK_WEBHOOK_URL` (optional)

---

## Local Development Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/shopify-seo-platform.git
cd shopify-seo-platform
```

### 2. Environment Configuration

Create environment files:

```bash
# Copy example environment files
cp .env.example .env

# Edit .env with your local configuration
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/shopify_seo
# REDIS_URL=redis://localhost:6379
# etc.
```

### 3. Start Local Services

Using Docker Compose:

```bash
# Start PostgreSQL and Redis
docker compose up -d postgres redis

# View logs
docker compose logs -f

# Check service health
docker compose ps
```

### 4. Install Dependencies

```bash
# Backend
cd backend
npm install
npx prisma generate
npx prisma migrate dev

# Frontend
cd ../frontend
npm install
```

### 5. Run Application Locally

```bash
# Terminal 1 - Backend
cd backend
npm run start:dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Access the application:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- API Docs: http://localhost:3000/api-docs
- pgAdmin: http://localhost:5050 (admin@shopify-seo.local / admin)
- Redis Commander: http://localhost:8081

### 6. Run Tests

```bash
# Backend tests
cd backend
npm test
npm run test:e2e

# Frontend tests
cd frontend
npm test
npm run test:e2e
```

---

## AWS Infrastructure Deployment

### 1. Prepare Terraform Backend

Create S3 bucket and DynamoDB table for Terraform state:

```bash
# Create S3 bucket for Terraform state
aws s3api create-bucket \
  --bucket shopify-seo-terraform-state \
  --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket shopify-seo-terraform-state \
  --versioning-configuration Status=Enabled

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name shopify-seo-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### 2. Configure Terraform Variables

```bash
cd infrastructure/terraform

# Copy example variables
cp terraform.tfvars.example terraform.tfvars

# Edit terraform.tfvars with your configuration
# IMPORTANT: Generate secure passwords and keys
```

**Generate Secure Secrets:**

```bash
# Database password (16+ characters)
openssl rand -base64 24

# Redis auth token (16+ characters)
openssl rand -base64 24

# JWT secret (64 characters)
openssl rand -base64 48

# Encryption key (32 characters exactly)
openssl rand -base64 32 | head -c 32
```

### 3. Initialize Terraform

```bash
cd infrastructure/terraform

terraform init
```

### 4. Plan Infrastructure

```bash
# Review what will be created
terraform plan -var-file=terraform.tfvars

# Save plan for review
terraform plan -var-file=terraform.tfvars -out=tfplan

# Review saved plan
terraform show tfplan
```

### 5. Deploy Infrastructure

**Development Environment:**

```bash
terraform apply -var-file=terraform.tfvars -var="environment=dev"
```

**Staging Environment:**

```bash
terraform apply -var-file=terraform.tfvars -var="environment=staging"
```

**Production Environment:**

```bash
# ⚠️ CRITICAL: Review carefully before production deployment
terraform apply -var-file=terraform.tfvars -var="environment=production"
```

**Deployment will create:**
- VPC with 3 availability zones
- RDS Aurora PostgreSQL (Serverless v2)
- ElastiCache Redis (Multi-AZ)
- ECS Fargate cluster
- Application Load Balancer
- S3 buckets (content, images, ALB logs)
- CloudFront CDN
- SQS queues (webhooks, content generation)
- CloudWatch alarms and dashboards
- SNS topics for alerts
- ECR repositories
- IAM roles and policies
- Secrets Manager secrets

**Estimated deployment time:** 15-20 minutes

### 6. Save Terraform Outputs

```bash
# Save outputs to file
terraform output -json > terraform-outputs.json

# View specific output
terraform output alb_dns_name
terraform output database_url
terraform output redis_url
```

---

## Application Deployment

### Option 1: Manual Deployment

#### 1. Build Docker Images

```bash
# Get ECR login credentials
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build and push backend
docker build -t shopify-seo-backend:latest -f docker/Dockerfile.backend .
docker tag shopify-seo-backend:latest ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/shopify-seo-backend-ENV:latest
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/shopify-seo-backend-ENV:latest

# Build and push frontend
docker build -t shopify-seo-frontend:latest -f docker/Dockerfile.frontend .
docker tag shopify-seo-frontend:latest ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/shopify-seo-frontend-ENV:latest
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/shopify-seo-frontend-ENV:latest
```

#### 2. Register Task Definitions

```bash
# Update task definitions with your account ID
sed -i 's/ACCOUNT_ID/YOUR_ACCOUNT_ID/g' infrastructure/ecs/backend-task-definition.json
sed -i 's/ENV/dev/g' infrastructure/ecs/backend-task-definition.json

# Register task definitions
aws ecs register-task-definition \
  --cli-input-json file://infrastructure/ecs/backend-task-definition.json

aws ecs register-task-definition \
  --cli-input-json file://infrastructure/ecs/frontend-task-definition.json
```

#### 3. Deploy Services

```bash
# Update backend service
aws ecs update-service \
  --cluster shopify-seo-cluster-dev \
  --service shopify-seo-backend-dev \
  --force-new-deployment

# Update frontend service
aws ecs update-service \
  --cluster shopify-seo-cluster-dev \
  --service shopify-seo-frontend-dev \
  --force-new-deployment
```

### Option 2: CI/CD with GitHub Actions (Recommended)

#### 1. Configure GitHub Environments

1. Go to **Settings → Environments**
2. Create environments: `dev`, `staging`, `production`
3. Add environment-specific secrets

#### 2. Trigger Deployment

**Automatic (on push):**
```bash
# Push to develop branch → deploys to staging
git push origin develop

# Push to main branch → deploys to production
git push origin main
```

**Manual:**
1. Go to **Actions** tab
2. Select **Deploy to AWS ECS** workflow
3. Click **Run workflow**
4. Select environment
5. Click **Run workflow**

---

## Post-Deployment Verification

### 1. Check Service Health

```bash
# Check ECS services
aws ecs describe-services \
  --cluster shopify-seo-cluster-dev \
  --services shopify-seo-backend-dev shopify-seo-frontend-dev

# Check running tasks
aws ecs list-tasks \
  --cluster shopify-seo-cluster-dev

# Check task health
aws ecs describe-tasks \
  --cluster shopify-seo-cluster-dev \
  --tasks TASK_ARN
```

### 2. Check Load Balancer

```bash
# Get ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names shopify-seo-alb-dev \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

echo "Application URL: https://${ALB_DNS}"

# Check target health
aws elbv2 describe-target-health \
  --target-group-arn TARGET_GROUP_ARN
```

### 3. Test Application Endpoints

```bash
# Health check
curl https://${ALB_DNS}/health

# API health
curl https://${ALB_DNS}/api/health

# Frontend (should return HTML)
curl https://${ALB_DNS}/
```

### 4. Check Database Connectivity

```bash
# Get database endpoint
terraform output rds_cluster_endpoint

# Connect using psql (from bastion or ECS Exec)
psql "postgresql://username:password@endpoint:5432/shopify_seo"
```

### 5. Check Redis Connectivity

```bash
# Get Redis endpoint
terraform output redis_primary_endpoint

# Connect using redis-cli (from bastion or ECS Exec)
redis-cli -h endpoint -p 6379 -a auth_token --tls
```

### 6. View Logs

```bash
# Backend logs
aws logs tail /ecs/shopify-seo-backend-dev --follow

# Frontend logs
aws logs tail /ecs/shopify-seo-frontend-dev --follow

# Filter for errors
aws logs tail /ecs/shopify-seo-backend-dev --follow --filter-pattern ERROR
```

### 7. Check CloudWatch Dashboard

```bash
# Open CloudWatch dashboard
aws cloudwatch get-dashboard \
  --dashboard-name shopify-seo-dashboard-dev
```

Or visit AWS Console: **CloudWatch → Dashboards → shopify-seo-dashboard-dev**

---

## Troubleshooting

### Service Won't Start

**Check task logs:**
```bash
aws logs tail /ecs/shopify-seo-backend-dev --follow
```

**Common issues:**
- Database connection failure → Check security groups
- Redis connection failure → Check auth token
- Missing secrets → Check Secrets Manager
- Image pull failure → Check ECR permissions

### High CPU/Memory Usage

**Check metrics:**
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=shopify-seo-backend-dev \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

**Solutions:**
- Increase task CPU/memory
- Enable auto-scaling
- Optimize application code

### Database Connection Pool Exhausted

**Check connections:**
```sql
SELECT count(*) FROM pg_stat_activity;
```

**Solutions:**
- Increase pool size
- Optimize queries
- Add read replicas

### Deployment Fails

**Check deployment events:**
```bash
aws ecs describe-services \
  --cluster shopify-seo-cluster-dev \
  --services shopify-seo-backend-dev \
  --query 'services[0].events[0:10]'
```

**Common issues:**
- Health check failures
- Task definition errors
- IAM permission issues
- Resource constraints

### Rollback Deployment

**Automatic (circuit breaker enabled):**
ECS will automatically rollback if deployment fails.

**Manual:**
```bash
# List task definition revisions
aws ecs list-task-definitions \
  --family-prefix shopify-seo-backend

# Update service to previous revision
aws ecs update-service \
  --cluster shopify-seo-cluster-dev \
  --service shopify-seo-backend-dev \
  --task-definition shopify-seo-backend-dev:PREVIOUS_REVISION
```

---

## Additional Resources

- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Docker Documentation](https://docs.docker.com/)
- [NestJS Documentation](https://docs.nestjs.com/)
- [React Documentation](https://react.dev/)

---

## Support

For deployment issues:
1. Check this guide
2. Review CloudWatch logs
3. Check GitHub Issues
4. Contact DevOps team

**Emergency Contacts:**
- DevOps Lead: devops@example.com
- On-Call: oncall@example.com
