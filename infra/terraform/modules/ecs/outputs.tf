output "cluster_name" {
  description = "ECS cluster name."
  value       = aws_ecs_cluster.this.name
}

output "cluster_arn" {
  description = "ECS cluster ARN."
  value       = aws_ecs_cluster.this.arn
}

output "service_security_group_id" {
  description = "ECS service security group ID."
  value       = aws_security_group.ecs.id
}

output "service_names" {
  description = "ECS service names."
  value       = { for key, service in aws_ecs_service.service : key => service.name }
}
