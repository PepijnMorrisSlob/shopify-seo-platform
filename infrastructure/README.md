# Shopify SEO Platform - Infrastructure

This directory contains all infrastructure-as-code (IaC), deployment configurations, and monitoring setup for the Shopify SEO Platform.

## Directory Structure

```
infrastructure/
├── terraform/              # Terraform IaC
│   ├── main.tf            # Core AWS infrastructure (VPC, ECS, RDS, etc.)
│   ├── monitoring.tf      # CloudWatch alarms and dashboards
│   ├── ecs-services.tf    # ECS services and auto-scaling
│   ├── secrets.tf         # AWS Secrets Manager configuration
│   ├── variables.tf       # Input variables
│   ├── outputs.tf         # Output values
│   └── terraform.tfvars.example  # Example variable values
├── ecs/                   # ECS task definitions
│   ├── backend-task-definition.json
│   └── frontend-task-definition.json
├── docker/                # Docker initialization scripts
│   └── init-db.sql       # Database initialization
└── monitoring/            # Monitoring configurations
    ├── datadog.yml       # DataDog configuration
    └── sentry-config.js  # Sentry error tracking
```

## Infrastructure Components

### AWS Resources

| Resource | Type | Purpose | Scaling |
|----------|------|---------|---------|
| VPC | Network | Isolated network environment | Fixed (3 AZs) |
| RDS Aurora PostgreSQL | Database | Primary data storage | Serverless (0.5-64 ACUs) |
| ElastiCache Redis | Cache | Session & caching | 2-3 nodes |
| ECS Fargate | Compute | Containerized applications | 2-10 tasks |
| ALB | Load Balancer | Traffic distribution, SSL | Auto-managed |
| S3 | Storage | Static assets, content | Unlimited |
| CloudFront | CDN | Global content delivery | Auto-managed |
| SQS | Queue | Async job processing | Auto-managed |
| CloudWatch | Monitoring | Logs, metrics, alarms | Auto-managed |
| Secrets Manager | Security | Secret storage | Auto-managed |
| ECR | Registry | Docker image storage | Unlimited |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Internet                             │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
           ┌────────────────┐
           │  CloudFront    │ (CDN)
           │  (Static)      │
           └────────┬───────┘
                    │
                    ▼
            ┌───────────────┐
            │      ALB      │ (HTTPS)
            │  (us-east-1)  │
            └───┬───────┬───┘
                │       │
        ┌───────┘       └────────┐
        ▼                        ▼
┌───────────────┐        ┌───────────────┐
│   Frontend    │        │   Backend     │
│  ECS Fargate  │        │  ECS Fargate  │
│  (2-6 tasks)  │        │  (2-10 tasks) │
└───────────────┘        └───┬───────┬───┘
                             │       │
                    ┌────────┘       └────────┐
                    │                         │
                    ▼                         ▼
            ┌──────────────┐          ┌──────────────┐
            │  RDS Aurora  │          │ ElastiCache  │
            │  PostgreSQL  │          │    Redis     │
            │  (Multi-AZ)  │          │  (Multi-AZ)  │
            └──────────────┘          └──────────────┘
                    │
                    ▼
            ┌──────────────┐
            │      S3      │
            │   (Content)  │
            └──────────────┘
```

## Deployment Environments

### Development (dev)
- **Purpose:** Local development and testing
- **Infrastructure:** Minimal (single-AZ, smaller instances)
- **Cost:** ~$100-200/month
- **Access:** All developers

### Staging
- **Purpose:** Pre-production testing
- **Infrastructure:** Production-like (multi-AZ, production sizing)
- **Cost:** ~$300-500/month
- **Access:** QA team, senior developers

### Production
- **Purpose:** Live customer-facing environment
- **Infrastructure:** Full (multi-AZ, auto-scaling, backups)
- **Cost:** ~$800-1500/month (scales with usage)
- **Access:** Limited (approved deployments only)

## Quick Start

### Prerequisites

1. **Install Required Tools:**
   ```bash
   # Terraform
   brew install terraform  # macOS
   # or download from https://www.terraform.io/downloads

   # AWS CLI
   brew install awscli  # macOS
   # or pip install awscli

   # Configure AWS credentials
   aws configure
   ```

2. **Set up GitHub Secrets:**
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `SHOPIFY_API_KEY`
   - `SHOPIFY_API_SECRET`
   - `DATADOG_API_KEY` (optional)
   - `SENTRY_DSN` (optional)

### Deploy Infrastructure

1. **Generate Secrets:**
   ```bash
   ./scripts/generate-secrets.sh
   ```

2. **Configure Terraform:**
   ```bash
   cd infrastructure/terraform
   cp terraform.tfvars.example terraform.tfvars
   # Edit terraform.tfvars with your values
   ```

3. **Initialize Terraform:**
   ```bash
   terraform init
   ```

4. **Plan Deployment:**
   ```bash
   terraform plan -var-file=terraform.tfvars -var="environment=dev"
   ```

5. **Deploy:**
   ```bash
   terraform apply -var-file=terraform.tfvars -var="environment=dev"
   ```

6. **Save Outputs:**
   ```bash
   terraform output -json > outputs.json
   ```

## Monitoring & Observability

### CloudWatch
- **Logs:** `/ecs/shopify-seo-{backend|frontend}-{env}`
- **Dashboard:** `shopify-seo-dashboard-{env}`
- **Alarms:** Auto-configured for critical metrics

### DataDog
- **Dashboard:** https://app.datadoghq.com
- **APM:** Automatic instrumentation
- **Logs:** Centralized log aggregation
- **Metrics:** Custom business metrics

### Sentry
- **Error Tracking:** https://sentry.io
- **Performance:** Transaction monitoring
- **Alerts:** Real-time error notifications

### Key Metrics

| Metric | Target | Alert Threshold |
|--------|--------|----------------|
| API Latency (P95) | <500ms | >500ms |
| Error Rate | <1% | >5% |
| Uptime | 99.9% | <99% |
| Database Connections | <150 | >150 |
| Redis Memory | <85% | >85% |

## Cost Optimization

### Development
- Use Fargate Spot for non-critical workloads
- Single NAT Gateway
- Smaller instance types
- Disable auto-scaling (manual scaling only)

### Production
- Reserved Instances for predictable workloads
- Savings Plans for flexible capacity
- S3 Intelligent-Tiering for old content
- CloudFront with optimal caching
- Auto-scaling based on demand

### Estimated Monthly Costs

| Service | Dev | Staging | Production |
|---------|-----|---------|------------|
| ECS Fargate | $40 | $150 | $400 |
| RDS Aurora | $30 | $100 | $300 |
| ElastiCache | $20 | $80 | $200 |
| ALB | $20 | $20 | $40 |
| NAT Gateway | $30 | $90 | $90 |
| S3 + CloudFront | $10 | $30 | $100 |
| Other (Secrets, Logs) | $10 | $30 | $70 |
| **Total** | **$160** | **$500** | **$1,200** |

*Note: Production costs scale with usage (users, data, API calls)*

## Security

### Network Security
- Private subnets for databases and compute
- Security groups with least-privilege access
- NACLs for additional network filtering
- VPC Flow Logs enabled

### Data Security
- Encryption at rest (RDS, S3, ElastiCache)
- Encryption in transit (TLS 1.3)
- Secrets stored in AWS Secrets Manager
- Regular security audits

### Access Control
- IAM roles with least-privilege
- No hardcoded credentials
- MFA required for production access
- Audit logs for all access

## Disaster Recovery

### Backups
- **RDS:** Automated daily backups (7-day retention)
- **S3:** Versioning enabled
- **Secrets:** Automatic replication

### Recovery Procedures
- **RTO (Recovery Time Objective):** 2 hours
- **RPO (Recovery Point Objective):** 15 minutes

### Backup Locations
- Primary: us-east-1
- Backup: us-west-2 (for critical data only)

## Troubleshooting

### Common Issues

**Issue: Terraform apply fails**
```bash
# Check AWS credentials
aws sts get-caller-identity

# Validate Terraform files
terraform validate

# Check state lock
aws dynamodb scan --table-name shopify-seo-terraform-locks
```

**Issue: ECS tasks won't start**
```bash
# Check task logs
aws logs tail /ecs/shopify-seo-backend-dev --follow

# Check task definition
aws ecs describe-task-definition --task-definition shopify-seo-backend-dev

# Check service events
aws ecs describe-services --cluster shopify-seo-cluster-dev --services shopify-seo-backend-dev
```

**Issue: Database connection fails**
```bash
# Check security groups
aws ec2 describe-security-groups --group-ids sg-xxx

# Check RDS status
aws rds describe-db-clusters --db-cluster-identifier shopify-seo-aurora-dev

# Test connection from ECS
aws ecs execute-command --cluster shopify-seo-cluster-dev --task TASK_ARN --container backend --interactive --command "psql $DATABASE_URL"
```

## Support

### Documentation
- [Deployment Guide](../docs/DEPLOYMENT_GUIDE.md)
- [Operations Runbook](../docs/RUNBOOK.md)
- [AWS Documentation](https://docs.aws.amazon.com/)
- [Terraform Documentation](https://www.terraform.io/docs)

### Contacts
- DevOps Team: devops@example.com
- On-Call: oncall@example.com
- AWS Support: Premium Support (Case priority 1-4)

## Contributing

When making infrastructure changes:

1. Create a feature branch
2. Test changes in dev environment
3. Document changes in this README
4. Create pull request with detailed description
5. Get approval from DevOps team
6. Deploy to staging first
7. Monitor for 24 hours
8. Deploy to production during maintenance window

## License

Copyright © 2026 Shopify SEO Platform. All rights reserved.
