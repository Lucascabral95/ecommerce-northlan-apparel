variable "name" {
  description = "Name prefix used for ECS resources."
  type        = string
}

variable "cluster_name" {
  description = "ECS cluster name."
  type        = string
}

variable "vpc_id" {
  description = "VPC ID."
  type        = string
}

variable "subnet_ids" {
  description = "Subnet IDs for ECS services."
  type        = list(string)
}

variable "assign_public_ip" {
  description = "Assign public IPs to Fargate tasks. Useful for low-cost dev without NAT Gateway."
  type        = bool
  default     = true
}

variable "alb_security_group_id" {
  description = "ALB security group ID allowed to reach ECS service ports."
  type        = string
}

variable "target_group_arns" {
  description = "ALB target group ARNs keyed by target group key."
  type        = map(string)
  default     = {}
}

variable "common_environment" {
  description = "Environment variables applied to every service."
  type        = map(string)
  default     = {}
}

variable "common_secrets" {
  description = "Secrets applied to every service, keyed by environment variable name."
  type        = map(string)
  default     = {}
}

variable "services" {
  description = "ECS services to run."
  type = map(object({
    command           = optional(list(string))
    cpu               = number
    desired_count     = number
    environment       = optional(map(string), {})
    health_check_path = string
    image             = string
    memory            = number
    port              = number
    secrets           = optional(map(string), {})
    target_group_key  = optional(string)
  }))
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days."
  type        = number
  default     = 14
}

variable "tags" {
  description = "Tags applied to all resources."
  type        = map(string)
  default     = {}
}
