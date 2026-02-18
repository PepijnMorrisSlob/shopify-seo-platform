# =====================================
# AWS Secrets Manager - Application Secrets
# =====================================

# Database URL
resource "aws_secretsmanager_secret" "database_url" {
  name        = "${var.project_name}/database-url-${var.environment}"
  description = "PostgreSQL connection string"

  tags = {
    Name = "${var.project_name}-database-url-${var.environment}"
  }
}

resource "aws_secretsmanager_secret_version" "database_url" {
  secret_id = aws_secretsmanager_secret.database_url.id
  secret_string = "postgresql://${var.db_username}:${var.db_password}@${aws_rds_cluster.aurora.endpoint}:${aws_rds_cluster.aurora.port}/${aws_rds_cluster.aurora.database_name}"
}

# Redis URL
resource "aws_secretsmanager_secret" "redis_url" {
  name        = "${var.project_name}/redis-url-${var.environment}"
  description = "Redis connection string"

  tags = {
    Name = "${var.project_name}-redis-url-${var.environment}"
  }
}

resource "aws_secretsmanager_secret_version" "redis_url" {
  secret_id = aws_secretsmanager_secret.redis_url.id
  secret_string = "rediss://:${var.redis_auth_token}@${aws_elasticache_replication_group.redis.primary_endpoint_address}:${aws_elasticache_replication_group.redis.port}"
}

# JWT Secret
resource "aws_secretsmanager_secret" "jwt_secret" {
  name        = "${var.project_name}/jwt-secret-${var.environment}"
  description = "JWT secret for authentication"

  tags = {
    Name = "${var.project_name}-jwt-secret-${var.environment}"
  }
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = var.jwt_secret
}

# Encryption Key
resource "aws_secretsmanager_secret" "encryption_key" {
  name        = "${var.project_name}/encryption-key-${var.environment}"
  description = "Encryption key for sensitive data"

  tags = {
    Name = "${var.project_name}-encryption-key-${var.environment}"
  }
}

resource "aws_secretsmanager_secret_version" "encryption_key" {
  secret_id     = aws_secretsmanager_secret.encryption_key.id
  secret_string = var.encryption_key
}

# Shopify API Key
resource "aws_secretsmanager_secret" "shopify_api_key" {
  name        = "${var.project_name}/shopify-api-key-${var.environment}"
  description = "Shopify API key"

  tags = {
    Name = "${var.project_name}-shopify-api-key-${var.environment}"
  }
}

resource "aws_secretsmanager_secret_version" "shopify_api_key" {
  secret_id     = aws_secretsmanager_secret.shopify_api_key.id
  secret_string = var.shopify_api_key
}

# Shopify API Secret
resource "aws_secretsmanager_secret" "shopify_api_secret" {
  name        = "${var.project_name}/shopify-api-secret-${var.environment}"
  description = "Shopify API secret"

  tags = {
    Name = "${var.project_name}-shopify-api-secret-${var.environment}"
  }
}

resource "aws_secretsmanager_secret_version" "shopify_api_secret" {
  secret_id     = aws_secretsmanager_secret.shopify_api_secret.id
  secret_string = var.shopify_api_secret
}

# OpenAI API Key (Optional)
resource "aws_secretsmanager_secret" "openai_api_key" {
  count       = var.openai_api_key != "" ? 1 : 0
  name        = "${var.project_name}/openai-api-key-${var.environment}"
  description = "OpenAI API key"

  tags = {
    Name = "${var.project_name}-openai-api-key-${var.environment}"
  }
}

resource "aws_secretsmanager_secret_version" "openai_api_key" {
  count         = var.openai_api_key != "" ? 1 : 0
  secret_id     = aws_secretsmanager_secret.openai_api_key[0].id
  secret_string = var.openai_api_key
}

# Anthropic API Key (Optional)
resource "aws_secretsmanager_secret" "anthropic_api_key" {
  count       = var.anthropic_api_key != "" ? 1 : 0
  name        = "${var.project_name}/anthropic-api-key-${var.environment}"
  description = "Anthropic API key"

  tags = {
    Name = "${var.project_name}-anthropic-api-key-${var.environment}"
  }
}

resource "aws_secretsmanager_secret_version" "anthropic_api_key" {
  count         = var.anthropic_api_key != "" ? 1 : 0
  secret_id     = aws_secretsmanager_secret.anthropic_api_key[0].id
  secret_string = var.anthropic_api_key
}

# DataDog API Key (Optional)
resource "aws_secretsmanager_secret" "datadog_api_key" {
  count       = var.datadog_api_key != "" ? 1 : 0
  name        = "${var.project_name}/datadog-api-key-${var.environment}"
  description = "DataDog API key"

  tags = {
    Name = "${var.project_name}-datadog-api-key-${var.environment}"
  }
}

resource "aws_secretsmanager_secret_version" "datadog_api_key" {
  count         = var.datadog_api_key != "" ? 1 : 0
  secret_id     = aws_secretsmanager_secret.datadog_api_key[0].id
  secret_string = var.datadog_api_key
}

# Sentry DSN (Optional)
resource "aws_secretsmanager_secret" "sentry_dsn" {
  count       = var.sentry_dsn != "" ? 1 : 0
  name        = "${var.project_name}/sentry-dsn-${var.environment}"
  description = "Sentry DSN for error tracking"

  tags = {
    Name = "${var.project_name}-sentry-dsn-${var.environment}"
  }
}

resource "aws_secretsmanager_secret_version" "sentry_dsn" {
  count         = var.sentry_dsn != "" ? 1 : 0
  secret_id     = aws_secretsmanager_secret.sentry_dsn[0].id
  secret_string = var.sentry_dsn
}

# =====================================
# IAM Policy for Secrets Access
# =====================================

resource "aws_iam_role_policy" "ecs_task_secrets_access" {
  name = "${var.project_name}-ecs-secrets-access-${var.environment}"
  role = aws_iam_role.ecs_task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          aws_secretsmanager_secret.database_url.arn,
          aws_secretsmanager_secret.redis_url.arn,
          aws_secretsmanager_secret.jwt_secret.arn,
          aws_secretsmanager_secret.encryption_key.arn,
          aws_secretsmanager_secret.shopify_api_key.arn,
          aws_secretsmanager_secret.shopify_api_secret.arn
        ]
      }
    ]
  })
}
