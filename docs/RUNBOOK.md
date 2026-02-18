# Shopify SEO Platform - Operations Runbook

This runbook provides operational procedures for managing the Shopify SEO Platform in production.

## Table of Contents

1. [System Overview](#system-overview)
2. [Monitoring & Alerts](#monitoring--alerts)
3. [Common Operations](#common-operations)
4. [Incident Response](#incident-response)
5. [Maintenance Procedures](#maintenance-procedures)
6. [Disaster Recovery](#disaster-recovery)

---

## System Overview

### Architecture Components

| Component | Purpose | Scaling |
|-----------|---------|---------|
| ALB | Load balancing, SSL termination | Auto (AWS managed) |
| ECS Fargate (Backend) | API server, business logic | 2-10 tasks |
| ECS Fargate (Frontend) | Static content, React SPA | 2-6 tasks |
| RDS Aurora PostgreSQL | Primary database | Serverless 0.5-64 ACUs |
| ElastiCache Redis | Cache, session storage | 3 nodes (Multi-AZ) |
| S3 | Content storage, images | Unlimited |
| CloudFront | CDN for static assets | Auto (AWS managed) |
| SQS | Async job processing | Auto (AWS managed) |

### Service Dependencies

```
Internet
  ↓
CloudFront (CDN) ──→ S3 (Images)
  ↓
ALB
  ├─→ Frontend (ECS) ──→ Backend (ECS)
  └─→ Backend (ECS)
         ├─→ RDS Aurora (Database)
         ├─→ ElastiCache Redis (Cache)
         ├─→ SQS (Queues)
         ├─→ S3 (Content)
         ├─→ Shopify API (External)
         └─→ OpenAI API (External)
```

### Key Metrics

**SLA Targets:**
- Uptime: 99.9% (43 minutes downtime/month max)
- API Latency (P95): <500ms
- API Latency (P99): <1000ms
- Error Rate: <1%

---

## Monitoring & Alerts

### CloudWatch Dashboard

**Access:** AWS Console → CloudWatch → Dashboards → `shopify-seo-dashboard-production`

**Key Metrics:**
- ECS CPU/Memory utilization
- ALB request count, latency, 5xx errors
- RDS connections, CPU, read/write latency
- Redis CPU, memory usage, evictions
- SQS queue depth, message age

### Alert Channels

- **Email:** alerts@example.com
- **Slack:** #shopify-seo-alerts
- **PagerDuty:** Production incidents (P1/P2)
- **DataDog:** https://app.datadoghq.com

### Alert Severity Levels

**P1 - Critical (Immediate Response Required)**
- Application completely down
- Database unavailable
- Data loss or corruption
- Security breach

**P2 - High (Response within 1 hour)**
- Degraded performance (>50% slower)
- Partial service outage
- Error rate >5%
- Auto-scaling maxed out

**P3 - Medium (Response within 4 hours)**
- Performance degradation (<50% slower)
- Non-critical component failure
- Error rate 1-5%
- Approaching resource limits

**P4 - Low (Response within 24 hours)**
- Minor performance issues
- Warnings in logs
- Approaching thresholds

---

## Common Operations

### 1. Scale Services Manually

**Increase backend capacity:**
```bash
aws ecs update-service \
  --cluster shopify-seo-cluster-production \
  --service shopify-seo-backend-production \
  --desired-count 5
```

**Increase frontend capacity:**
```bash
aws ecs update-service \
  --cluster shopify-seo-cluster-production \
  --service shopify-seo-frontend-production \
  --desired-count 4
```

**Verify scaling:**
```bash
aws ecs describe-services \
  --cluster shopify-seo-cluster-production \
  --services shopify-seo-backend-production \
  --query 'services[0].[runningCount,desiredCount]'
```

### 2. View Real-Time Logs

**Backend logs:**
```bash
aws logs tail /ecs/shopify-seo-backend-production --follow
```

**Frontend logs:**
```bash
aws logs tail /ecs/shopify-seo-frontend-production --follow
```

**Filter for errors:**
```bash
aws logs tail /ecs/shopify-seo-backend-production \
  --follow \
  --filter-pattern 'ERROR'
```

**Search logs (last 1 hour):**
```bash
aws logs filter-log-events \
  --log-group-name /ecs/shopify-seo-backend-production \
  --start-time $(date -u -d '1 hour ago' +%s)000 \
  --filter-pattern 'ERROR'
```

### 3. Execute Commands in Running Container

**Enable ECS Exec (if not enabled):**
```bash
aws ecs update-service \
  --cluster shopify-seo-cluster-production \
  --service shopify-seo-backend-production \
  --enable-execute-command
```

**Get task ARN:**
```bash
TASK_ARN=$(aws ecs list-tasks \
  --cluster shopify-seo-cluster-production \
  --service-name shopify-seo-backend-production \
  --query 'taskArns[0]' \
  --output text)
```

**Execute command:**
```bash
aws ecs execute-command \
  --cluster shopify-seo-cluster-production \
  --task $TASK_ARN \
  --container backend \
  --interactive \
  --command "/bin/sh"
```

**Example commands inside container:**
```bash
# Check database connectivity
node -e "require('pg').Client().connect()"

# Check Redis connectivity
redis-cli -h $REDIS_HOST -p 6379 -a $REDIS_PASSWORD ping

# View environment variables
env | grep DATABASE_URL
```

### 4. Database Operations

**Connect to database (from ECS task):**
```bash
aws ecs execute-command \
  --cluster shopify-seo-cluster-production \
  --task $TASK_ARN \
  --container backend \
  --interactive \
  --command "psql $DATABASE_URL"
```

**Common queries:**
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check database size
SELECT pg_size_pretty(pg_database_size('shopify_seo'));

-- Check table sizes
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;

-- Check slow queries (over 1 second)
SELECT
  pid,
  now() - query_start as duration,
  query
FROM pg_stat_activity
WHERE state = 'active' AND now() - query_start > interval '1 second'
ORDER BY duration DESC;

-- Kill long-running query
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid = 12345;
```

**Run migrations:**
```bash
# From local machine (with VPN or bastion)
cd backend
DATABASE_URL="postgresql://user:pass@endpoint:5432/shopify_seo" \
  npx prisma migrate deploy

# Or from ECS task
aws ecs execute-command \
  --cluster shopify-seo-cluster-production \
  --task $TASK_ARN \
  --container backend \
  --interactive \
  --command "npx prisma migrate deploy"
```

### 5. Redis Operations

**Connect to Redis:**
```bash
aws ecs execute-command \
  --cluster shopify-seo-cluster-production \
  --task $TASK_ARN \
  --container backend \
  --interactive \
  --command "redis-cli -h $REDIS_HOST -p 6379 -a $REDIS_PASSWORD --tls"
```

**Common commands:**
```redis
# Check memory usage
INFO memory

# Get cache hit rate
INFO stats

# Count keys
DBSIZE

# Clear cache (DANGEROUS - use with caution)
FLUSHDB

# Get/set specific keys
GET user:session:123
DEL user:session:123

# Monitor real-time commands
MONITOR
```

### 6. SQS Queue Management

**Check queue depth:**
```bash
aws sqs get-queue-attributes \
  --queue-url https://sqs.us-east-1.amazonaws.com/ACCOUNT/shopify-webhooks-production.fifo \
  --attribute-names ApproximateNumberOfMessages ApproximateNumberOfMessagesNotVisible
```

**Purge queue (DANGEROUS - use with caution):**
```bash
aws sqs purge-queue \
  --queue-url https://sqs.us-east-1.amazonaws.com/ACCOUNT/shopify-webhooks-production.fifo
```

**Move messages from DLQ to main queue:**
```bash
# Receive messages from DLQ
aws sqs receive-message \
  --queue-url $DLQ_URL \
  --max-number-of-messages 10 > messages.json

# Send to main queue (manual process)
# Parse messages.json and resend to main queue
```

---

## Incident Response

### P1: Application Down

**Symptoms:**
- Health checks failing
- All requests return 5xx errors
- No running ECS tasks

**Immediate Actions:**

1. **Check ECS service status:**
```bash
aws ecs describe-services \
  --cluster shopify-seo-cluster-production \
  --services shopify-seo-backend-production shopify-seo-frontend-production
```

2. **Check task status:**
```bash
aws ecs describe-tasks \
  --cluster shopify-seo-cluster-production \
  --tasks $(aws ecs list-tasks --cluster shopify-seo-cluster-production --query 'taskArns' --output text)
```

3. **Check logs for errors:**
```bash
aws logs tail /ecs/shopify-seo-backend-production --since 10m
```

4. **If deployment caused issue, rollback:**
```bash
# Get previous task definition revision
aws ecs list-task-definitions --family-prefix shopify-seo-backend-production

# Update service to previous revision
aws ecs update-service \
  --cluster shopify-seo-cluster-production \
  --service shopify-seo-backend-production \
  --task-definition shopify-seo-backend-production:PREVIOUS_REV
```

5. **If database is down:**
```bash
# Check RDS cluster status
aws rds describe-db-clusters --db-cluster-identifier shopify-seo-aurora-production

# Check recent events
aws rds describe-events --source-type db-cluster --source-identifier shopify-seo-aurora-production
```

### P2: High Error Rate

**Symptoms:**
- 5xx error rate >5%
- CloudWatch alarm triggered
- Users reporting errors

**Investigation Steps:**

1. **Check ALB metrics:**
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name HTTPCode_Target_5XX_Count \
  --dimensions Name=LoadBalancer,Value=app/shopify-seo-alb-production/xxx \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

2. **Review error logs:**
```bash
aws logs filter-log-events \
  --log-group-name /ecs/shopify-seo-backend-production \
  --start-time $(date -u -d '1 hour ago' +%s)000 \
  --filter-pattern 'ERROR' | jq -r '.events[].message' | head -20
```

3. **Check Sentry for error details:**
Visit: https://sentry.io/organizations/shopify-seo/issues/

4. **Check external service status:**
- Shopify API: https://www.shopifystatus.com/
- OpenAI: https://status.openai.com/

### P2: High Latency

**Symptoms:**
- API response time >500ms P95
- CloudWatch alarm triggered
- Users reporting slow performance

**Investigation Steps:**

1. **Check ALB latency:**
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name TargetResponseTime \
  --dimensions Name=LoadBalancer,Value=app/shopify-seo-alb-production/xxx \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum
```

2. **Check database performance:**
```bash
# Check RDS metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name ReadLatency WriteLatency \
  --dimensions Name=DBClusterIdentifier,Value=shopify-seo-aurora-production \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

3. **Check slow queries in database:**
```sql
SELECT pid, now() - query_start as duration, query
FROM pg_stat_activity
WHERE state = 'active' AND now() - query_start > interval '1 second'
ORDER BY duration DESC;
```

4. **Check DataDog APM:**
Visit: https://app.datadoghq.com/apm/traces

**Mitigation:**
- Scale up services if CPU/memory high
- Add database read replicas if read-heavy
- Increase Redis cache size if memory pressure
- Optimize slow queries

---

## Maintenance Procedures

### Planned Downtime

**Communication:**
1. Notify users 48 hours in advance
2. Post status on status page
3. Send email to all customers

**Maintenance Window:**
- Preferred: Sunday 2-4 AM EST (lowest traffic)
- Maximum duration: 2 hours

**Procedure:**
1. Enable maintenance mode (return 503 with Retry-After header)
2. Perform maintenance
3. Run smoke tests
4. Disable maintenance mode
5. Monitor for issues

### Database Maintenance

**Vacuum and analyze:**
```sql
-- Run during low-traffic period
VACUUM ANALYZE;

-- Check bloat
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Update statistics:**
```sql
ANALYZE VERBOSE;
```

### Certificate Renewal

**ACM certificates auto-renew, but verify:**
```bash
aws acm describe-certificate --certificate-arn $CERT_ARN
```

### Security Updates

**Update ECS task definitions with new base images:**
1. Rebuild Docker images with updated base images
2. Push to ECR
3. Update task definitions
4. Deploy to staging first
5. Monitor for 24 hours
6. Deploy to production

---

## Disaster Recovery

### RDS Backup and Restore

**Create manual snapshot:**
```bash
aws rds create-db-cluster-snapshot \
  --db-cluster-snapshot-identifier shopify-seo-manual-$(date +%Y%m%d-%H%M%S) \
  --db-cluster-identifier shopify-seo-aurora-production
```

**Restore from snapshot:**
```bash
aws rds restore-db-cluster-from-snapshot \
  --db-cluster-identifier shopify-seo-aurora-restored \
  --snapshot-identifier shopify-seo-manual-20260119-120000 \
  --engine aurora-postgresql
```

**Point-in-time recovery:**
```bash
aws rds restore-db-cluster-to-point-in-time \
  --db-cluster-identifier shopify-seo-aurora-pitr \
  --source-db-cluster-identifier shopify-seo-aurora-production \
  --restore-to-time 2026-01-19T12:00:00Z
```

### S3 Data Recovery

**S3 versioning is enabled, restore deleted object:**
```bash
aws s3api list-object-versions \
  --bucket shopify-seo-content-production \
  --prefix path/to/file

aws s3api get-object \
  --bucket shopify-seo-content-production \
  --key path/to/file \
  --version-id VERSION_ID \
  file-restored.ext
```

### Infrastructure Recreation

**If complete infrastructure loss:**
```bash
cd infrastructure/terraform

# Restore from latest backup
terraform init
terraform plan -var-file=terraform.tfvars -var="environment=production"
terraform apply -var-file=terraform.tfvars -var="environment=production"
```

**Recovery Time Objective (RTO):** 2 hours
**Recovery Point Objective (RPO):** 15 minutes (RDS automated backups)

---

## Contact Information

**On-Call Rotation:**
- View: https://example.pagerduty.com/schedules
- Escalate: Call +1-555-ONCALL

**Team Contacts:**
- DevOps Lead: devops-lead@example.com
- Backend Lead: backend-lead@example.com
- Database Admin: dba@example.com

**Vendor Support:**
- AWS Support: Premium Support (Case priority 1-4)
- DataDog: support@datadoghq.com
- Sentry: support@sentry.io

---

**Last Updated:** 2026-01-19
**Next Review:** 2026-02-19
