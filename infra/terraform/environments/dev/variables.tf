variable "aws_region" {
  description = "AWS region."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name."
  type        = string
  default     = "northlane-apparel"
}

variable "environment" {
  description = "Environment name."
  type        = string
  default     = "dev"
}

variable "vpc_cidr" {
  description = "VPC CIDR block."
  type        = string
  default     = "10.40.0.0/16"
}

variable "availability_zone_count" {
  description = "Number of availability zones to use."
  type        = number
  default     = 2
}

variable "enable_nat_gateway" {
  description = "Create a NAT Gateway for private ECS egress. Disabled by default to reduce dev cost."
  type        = bool
  default     = false
}

variable "ecs_assign_public_ip" {
  description = "Assign public IP to ECS tasks. Useful for low-cost dev when NAT Gateway is disabled."
  type        = bool
  default     = true
}

variable "certificate_arn" {
  description = "ACM certificate ARN for ALB HTTPS. Required for real Mercado Pago webhook/back URLs."
  type        = string
  default     = null
}

variable "frontend_base_url" {
  description = "Public frontend URL. If empty, the ALB URL is used."
  type        = string
  default     = ""
}

variable "api_gateway_base_url" {
  description = "Public API Gateway base URL. If empty, frontend_base_url plus /api/v1 is used."
  type        = string
  default     = ""
}

variable "payment_provider" {
  description = "Payment provider for deployed services."
  type        = string
  default     = "MOCK"

  validation {
    condition     = contains(["MOCK", "MERCADO_PAGO"], var.payment_provider)
    error_message = "payment_provider must be MOCK or MERCADO_PAGO."
  }
}

variable "mercado_pago_http_demo_mode" {
  description = "Enable demo-grade Mercado Pago Checkout Pro over plain HTTP ALB by relying on return URL sync and omitting webhook notification_url."
  type        = bool
  default     = false
}

variable "image_tag" {
  description = "ECR image tag used by all ECS task definitions. make deploy passes a fresh timestamp tag."
  type        = string
  default     = "latest"
}

variable "retain_legacy_backend_repository" {
  description = "Keep the old shared backend ECR repository during migration to per-service repositories."
  type        = bool
  default     = true
}

variable "ecs_desired_count" {
  description = "Default desired count for each ECS service. Keep 0 until images and secrets are ready."
  type        = number
  default     = 0
}

variable "rds_instance_class" {
  description = "RDS PostgreSQL instance class."
  type        = string
  default     = "db.t4g.micro"
}

variable "rds_allocated_storage" {
  description = "RDS allocated storage in GB."
  type        = number
  default     = 20
}

variable "rds_backup_retention_period" {
  description = "RDS backup retention in days. Use 0 for AWS Free Tier accounts that restrict automated backups."
  type        = number
  default     = 0

  validation {
    condition     = var.rds_backup_retention_period >= 0 && var.rds_backup_retention_period <= 35
    error_message = "rds_backup_retention_period must be between 0 and 35."
  }
}

variable "rds_deletion_protection" {
  description = "Enable RDS deletion protection."
  type        = bool
  default     = false
}

variable "enable_redis" {
  description = "Create ElastiCache Redis."
  type        = bool
  default     = false
}

variable "enable_rabbitmq" {
  description = "Create Amazon MQ for RabbitMQ."
  type        = bool
  default     = false
}

variable "rabbitmq_username" {
  description = "Amazon MQ RabbitMQ username."
  type        = string
  default     = null
}

variable "rabbitmq_password" {
  description = "Amazon MQ RabbitMQ password."
  type        = string
  default     = null
  sensitive   = true
}

variable "secret_values" {
  description = "Optional initial Secrets Manager values keyed by short secret name. Values are stored in Terraform state."
  type        = map(string)
  default     = {}
  sensitive   = true
}
