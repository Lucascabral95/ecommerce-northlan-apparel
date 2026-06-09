output "alb_dns_name" {
  description = "ALB DNS name."
  value       = module.alb.alb_dns_name
}

output "alb_https_enabled" {
  description = "Whether HTTPS is enabled on the ALB."
  value       = module.alb.https_enabled
}

output "frontend_url" {
  description = "Frontend URL used by ECS environment variables."
  value       = local.frontend_base_url
}

output "api_gateway_base_url" {
  description = "API Gateway base URL used by ECS environment variables."
  value       = local.api_base_url
}

output "ecr_repository_urls" {
  description = "ECR repository URLs."
  value       = module.ecr.repository_urls
}

output "ecs_cluster_name" {
  description = "ECS cluster name."
  value       = module.ecs.cluster_name
}

output "ecs_service_names" {
  description = "ECS service names."
  value       = module.ecs.service_names
}

output "rds_endpoint" {
  description = "RDS endpoint."
  value       = module.rds.endpoint
}

output "rds_instance_identifier" {
  description = "RDS DB instance identifier."
  value       = module.rds.identifier
}

output "rds_master_user_secret_arn" {
  description = "AWS-managed RDS master user secret ARN."
  value       = module.rds.master_user_secret_arn
  sensitive   = true
}

output "redis_endpoint" {
  description = "Redis endpoint when enabled."
  value       = module.redis.endpoint
}

output "rabbitmq_endpoints" {
  description = "Amazon MQ endpoints when enabled."
  value       = module.rabbitmq.endpoints
}

output "secret_arns" {
  description = "Application secret ARNs."
  value       = module.secrets.secret_arns
  sensitive   = true
}
