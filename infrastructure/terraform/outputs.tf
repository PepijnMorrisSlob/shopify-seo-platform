# =====================================
# VPC Outputs
# =====================================

output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "private_subnet_ids" {
  description = "IDs of private subnets"
  value       = module.vpc.private_subnets
}

output "public_subnet_ids" {
  description = "IDs of public subnets"
  value       = module.vpc.public_subnets
}

output "database_subnet_ids" {
  description = "IDs of database subnets"
  value       = module.vpc.database_subnets
}

# =====================================
# Database Outputs
# =====================================

output "rds_cluster_endpoint" {
  description = "Aurora cluster endpoint (write)"
  value       = aws_rds_cluster.aurora.endpoint
  sensitive   = true
}

output "rds_cluster_reader_endpoint" {
  description = "Aurora cluster reader endpoint (read)"
  value       = aws_rds_cluster.aurora.reader_endpoint
  sensitive   = true
}

output "rds_cluster_port" {
  description = "Aurora cluster port"
  value       = aws_rds_cluster.aurora.port
}

output "database_name" {
  description = "Database name"
  value       = aws_rds_cluster.aurora.database_name
}

# =====================================
# Redis Outputs
# =====================================

output "redis_primary_endpoint" {
  description = "Redis primary endpoint"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
  sensitive   = true
}

output "redis_reader_endpoint" {
  description = "Redis reader endpoint"
  value       = aws_elasticache_replication_group.redis.reader_endpoint_address
  sensitive   = true
}

output "redis_port" {
  description = "Redis port"
  value       = aws_elasticache_replication_group.redis.port
}

# =====================================
# S3 Outputs
# =====================================

output "content_bucket_name" {
  description = "Content S3 bucket name"
  value       = aws_s3_bucket.content.id
}

output "content_bucket_arn" {
  description = "Content S3 bucket ARN"
  value       = aws_s3_bucket.content.arn
}

output "images_bucket_name" {
  description = "Images S3 bucket name"
  value       = aws_s3_bucket.images.id
}

output "images_bucket_arn" {
  description = "Images S3 bucket ARN"
  value       = aws_s3_bucket.images.arn
}

# =====================================
# CloudFront Outputs
# =====================================

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.content.id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.content.domain_name
}

# =====================================
# SQS Outputs
# =====================================

output "webhooks_queue_url" {
  description = "Webhooks SQS queue URL"
  value       = aws_sqs_queue.webhooks.url
}

output "webhooks_queue_arn" {
  description = "Webhooks SQS queue ARN"
  value       = aws_sqs_queue.webhooks.arn
}

output "content_generation_queue_url" {
  description = "Content generation SQS queue URL"
  value       = aws_sqs_queue.content_generation.url
}

output "content_generation_queue_arn" {
  description = "Content generation SQS queue ARN"
  value       = aws_sqs_queue.content_generation.arn
}

# =====================================
# ECS Outputs
# =====================================

output "ecs_cluster_id" {
  description = "ECS cluster ID"
  value       = aws_ecs_cluster.main.id
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

# =====================================
# ALB Outputs
# =====================================

output "alb_dns_name" {
  description = "ALB DNS name"
  value       = aws_lb.main.dns_name
}

output "alb_arn" {
  description = "ALB ARN"
  value       = aws_lb.main.arn
}

output "alb_zone_id" {
  description = "ALB zone ID (for Route53)"
  value       = aws_lb.main.zone_id
}

output "backend_target_group_arn" {
  description = "Backend target group ARN"
  value       = aws_lb_target_group.backend.arn
}

output "frontend_target_group_arn" {
  description = "Frontend target group ARN"
  value       = aws_lb_target_group.frontend.arn
}

# =====================================
# ECR Outputs
# =====================================

output "backend_ecr_repository_url" {
  description = "Backend ECR repository URL"
  value       = aws_ecr_repository.backend.repository_url
}

output "frontend_ecr_repository_url" {
  description = "Frontend ECR repository URL"
  value       = aws_ecr_repository.frontend.repository_url
}

# =====================================
# IAM Outputs
# =====================================

output "ecs_task_execution_role_arn" {
  description = "ECS task execution role ARN"
  value       = aws_iam_role.ecs_task_execution.arn
}

output "ecs_task_role_arn" {
  description = "ECS task role ARN"
  value       = aws_iam_role.ecs_task.arn
}

# =====================================
# Security Group Outputs
# =====================================

output "alb_security_group_id" {
  description = "ALB security group ID"
  value       = aws_security_group.alb.id
}

output "ecs_tasks_security_group_id" {
  description = "ECS tasks security group ID"
  value       = aws_security_group.ecs_tasks.id
}

output "rds_security_group_id" {
  description = "RDS security group ID"
  value       = aws_security_group.rds.id
}

output "elasticache_security_group_id" {
  description = "ElastiCache security group ID"
  value       = aws_security_group.elasticache.id
}

# =====================================
# Monitoring Outputs
# =====================================

output "sns_alerts_topic_arn" {
  description = "SNS alerts topic ARN"
  value       = aws_sns_topic.alerts.arn
}

output "cloudwatch_dashboard_name" {
  description = "CloudWatch dashboard name"
  value       = aws_cloudwatch_dashboard.main.dashboard_name
}

output "cloudwatch_log_group_backend" {
  description = "Backend CloudWatch log group name"
  value       = aws_cloudwatch_log_group.backend.name
}

output "cloudwatch_log_group_frontend" {
  description = "Frontend CloudWatch log group name"
  value       = aws_cloudwatch_log_group.frontend.name
}

# =====================================
# Connection Strings (for application configuration)
# =====================================

output "database_url" {
  description = "PostgreSQL connection string"
  value       = "postgresql://${var.db_username}:${var.db_password}@${aws_rds_cluster.aurora.endpoint}:${aws_rds_cluster.aurora.port}/${aws_rds_cluster.aurora.database_name}"
  sensitive   = true
}

output "redis_url" {
  description = "Redis connection string"
  value       = "rediss://:${var.redis_auth_token}@${aws_elasticache_replication_group.redis.primary_endpoint_address}:${aws_elasticache_replication_group.redis.port}"
  sensitive   = true
}

# =====================================
# Environment Summary
# =====================================

output "environment_summary" {
  description = "Summary of deployed environment"
  value = {
    environment          = var.environment
    region              = var.aws_region
    vpc_id              = module.vpc.vpc_id
    ecs_cluster         = aws_ecs_cluster.main.name
    alb_endpoint        = "https://${aws_lb.main.dns_name}"
    cloudfront_endpoint = "https://${aws_cloudfront_distribution.content.domain_name}"
  }
}
