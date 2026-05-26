output "broker_id" {
  description = "Amazon MQ broker ID."
  value       = try(aws_mq_broker.this[0].id, null)
}

output "endpoints" {
  description = "Amazon MQ broker endpoints."
  value       = try(aws_mq_broker.this[0].instances[0].endpoints, [])
}

output "security_group_id" {
  description = "RabbitMQ security group ID."
  value       = try(aws_security_group.rabbitmq[0].id, null)
}
