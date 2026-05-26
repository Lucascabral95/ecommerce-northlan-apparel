output "endpoint" {
  description = "Redis primary endpoint address."
  value       = try(aws_elasticache_replication_group.this[0].primary_endpoint_address, null)
}

output "port" {
  description = "Redis port."
  value       = try(aws_elasticache_replication_group.this[0].port, null)
}

output "security_group_id" {
  description = "Redis security group ID."
  value       = try(aws_security_group.redis[0].id, null)
}
