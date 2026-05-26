variable "create" {
  description = "Whether to create Amazon MQ for RabbitMQ."
  type        = bool
  default     = false
}

variable "name" {
  description = "Name prefix used for RabbitMQ resources."
  type        = string
}

variable "vpc_id" {
  description = "VPC ID."
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for Amazon MQ."
  type        = list(string)
}

variable "ecs_security_group_id" {
  description = "ECS service security group allowed to reach RabbitMQ."
  type        = string
}

variable "engine_version" {
  description = "Amazon MQ RabbitMQ engine version."
  type        = string
  default     = "3.13"
}

variable "host_instance_type" {
  description = "Amazon MQ broker instance type."
  type        = string
  default     = "mq.m7g.medium"
}

variable "deployment_mode" {
  description = "Amazon MQ deployment mode."
  type        = string
  default     = "SINGLE_INSTANCE"
}

variable "username" {
  description = "RabbitMQ admin username."
  type        = string
  default     = null
}

variable "password" {
  description = "RabbitMQ admin password."
  type        = string
  default     = null
  sensitive   = true
}

variable "tags" {
  description = "Tags applied to all resources."
  type        = map(string)
  default     = {}
}
