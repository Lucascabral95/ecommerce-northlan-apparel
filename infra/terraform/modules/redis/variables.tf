variable "create" {
  description = "Whether to create ElastiCache Redis."
  type        = bool
  default     = false
}

variable "name" {
  description = "Name prefix used for Redis resources."
  type        = string
}

variable "vpc_id" {
  description = "VPC ID."
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for Redis."
  type        = list(string)
}

variable "ecs_security_group_id" {
  description = "ECS service security group allowed to reach Redis."
  type        = string
}

variable "node_type" {
  description = "ElastiCache node type."
  type        = string
  default     = "cache.t4g.micro"
}

variable "transit_encryption_enabled" {
  description = "Enable Redis in-transit encryption."
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags applied to all resources."
  type        = map(string)
  default     = {}
}
