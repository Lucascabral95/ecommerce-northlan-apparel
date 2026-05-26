output "alb_dns_name" {
  description = "ALB DNS name."
  value       = aws_lb.this.dns_name
}

output "alb_arn" {
  description = "ALB ARN."
  value       = aws_lb.this.arn
}

output "alb_security_group_id" {
  description = "ALB security group ID."
  value       = aws_security_group.alb.id
}

output "target_group_arns" {
  description = "Target group ARNs keyed by target group key."
  value       = { for key, target_group in aws_lb_target_group.this : key => target_group.arn }
}

output "https_enabled" {
  description = "Whether HTTPS listener is enabled."
  value       = local.has_certificate
}
