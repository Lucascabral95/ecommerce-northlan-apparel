variable "name" {
  description = "Name prefix used for ALB resources."
  type        = string
}

variable "vpc_id" {
  description = "VPC ID."
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnet IDs for the ALB."
  type        = list(string)
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to reach the public ALB."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "certificate_arn" {
  description = "ACM certificate ARN. When provided, ALB exposes HTTPS and redirects HTTP to HTTPS."
  type        = string
  default     = null
}

variable "default_target_group_key" {
  description = "Target group key used by the default listener action."
  type        = string
}

variable "target_groups" {
  description = "Target groups to create."
  type = map(object({
    health_check_path = string
    port              = number
  }))
}

variable "listener_rules" {
  description = "Path based listener rules."
  type = map(object({
    path_patterns    = list(string)
    priority         = number
    target_group_key = string
  }))
  default = {}
}

variable "tags" {
  description = "Tags applied to all resources."
  type        = map(string)
  default     = {}
}
