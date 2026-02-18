# =====================================
# General Variables
# =====================================

variable "project_name" {
  type        = string
  description = "Project name used for resource naming"
  default     = "shopify-seo"
}

variable "environment" {
  type        = string
  description = "Environment name (dev, staging, production)"
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

variable "aws_region" {
  type        = string
  description = "AWS region for infrastructure deployment"
  default     = "us-east-1"
}

# =====================================
# VPC Variables
# =====================================

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for VPC"
  default     = "10.0.0.0/16"
}

variable "private_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for private subnets"
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "public_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for public subnets"
  default     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}

variable "database_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for database subnets"
  default     = ["10.0.201.0/24", "10.0.202.0/24", "10.0.203.0/24"]
}

# =====================================
# Database Variables
# =====================================

variable "db_name" {
  type        = string
  description = "Database name"
  default     = "shopify_seo"
}

variable "db_username" {
  type        = string
  description = "Database master username"
  default     = "postgres"
  sensitive   = true
}

variable "db_password" {
  type        = string
  description = "Database master password"
  sensitive   = true
  validation {
    condition     = length(var.db_password) >= 16
    error_message = "Database password must be at least 16 characters long."
  }
}

# =====================================
# Redis Variables
# =====================================

variable "redis_node_type" {
  type        = string
  description = "ElastiCache Redis node type"
  default     = "cache.r6g.large"
}

variable "redis_auth_token" {
  type        = string
  description = "Redis authentication token"
  sensitive   = true
  validation {
    condition     = length(var.redis_auth_token) >= 16
    error_message = "Redis auth token must be at least 16 characters long."
  }
}

# =====================================
# ECS Variables
# =====================================

variable "backend_cpu" {
  type        = number
  description = "CPU units for backend task (1024 = 1 vCPU)"
  default     = 2048
}

variable "backend_memory" {
  type        = number
  description = "Memory (MB) for backend task"
  default     = 4096
}

variable "frontend_cpu" {
  type        = number
  description = "CPU units for frontend task (1024 = 1 vCPU)"
  default     = 512
}

variable "frontend_memory" {
  type        = number
  description = "Memory (MB) for frontend task"
  default     = 1024
}

variable "backend_desired_count" {
  type        = number
  description = "Desired number of backend tasks"
  default     = 2
}

variable "frontend_desired_count" {
  type        = number
  description = "Desired number of frontend tasks"
  default     = 2
}

variable "backend_autoscaling_min" {
  type        = number
  description = "Minimum number of backend tasks"
  default     = 2
}

variable "backend_autoscaling_max" {
  type        = number
  description = "Maximum number of backend tasks"
  default     = 10
}

variable "frontend_autoscaling_min" {
  type        = number
  description = "Minimum number of frontend tasks"
  default     = 2
}

variable "frontend_autoscaling_max" {
  type        = number
  description = "Maximum number of frontend tasks"
  default     = 6
}

# =====================================
# Application Variables
# =====================================

variable "backend_image_tag" {
  type        = string
  description = "Backend Docker image tag"
  default     = "latest"
}

variable "frontend_image_tag" {
  type        = string
  description = "Frontend Docker image tag"
  default     = "latest"
}

variable "shopify_api_key" {
  type        = string
  description = "Shopify API key"
  sensitive   = true
}

variable "shopify_api_secret" {
  type        = string
  description = "Shopify API secret"
  sensitive   = true
}

variable "jwt_secret" {
  type        = string
  description = "JWT secret for authentication"
  sensitive   = true
  validation {
    condition     = length(var.jwt_secret) >= 64
    error_message = "JWT secret must be at least 64 characters long."
  }
}

variable "encryption_key" {
  type        = string
  description = "Encryption key for sensitive data (32 bytes)"
  sensitive   = true
  validation {
    condition     = length(var.encryption_key) == 32
    error_message = "Encryption key must be exactly 32 characters long."
  }
}

# =====================================
# External Service Variables
# =====================================

variable "openai_api_key" {
  type        = string
  description = "OpenAI API key"
  sensitive   = true
  default     = ""
}

variable "anthropic_api_key" {
  type        = string
  description = "Anthropic API key"
  sensitive   = true
  default     = ""
}

variable "datadog_api_key" {
  type        = string
  description = "DataDog API key for monitoring"
  sensitive   = true
  default     = ""
}

variable "sentry_dsn" {
  type        = string
  description = "Sentry DSN for error tracking"
  sensitive   = true
  default     = ""
}

# =====================================
# SSL Certificate Variables
# =====================================

variable "acm_certificate_arn" {
  type        = string
  description = "ARN of ACM certificate for HTTPS"
  default     = ""
}

variable "domain_name" {
  type        = string
  description = "Domain name for the application"
  default     = ""
}

# =====================================
# Monitoring Variables
# =====================================

variable "alert_email" {
  type        = string
  description = "Email address for CloudWatch alerts"
  default     = ""
}

variable "enable_monitoring" {
  type        = bool
  description = "Enable enhanced monitoring and logging"
  default     = true
}

# =====================================
# Backup Variables
# =====================================

variable "backup_retention_days" {
  type        = number
  description = "Number of days to retain database backups"
  default     = 7
}

# =====================================
# Tags
# =====================================

variable "tags" {
  type        = map(string)
  description = "Additional tags for all resources"
  default     = {}
}
