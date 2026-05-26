output "endpoint" {
  description = "RDS endpoint."
  value       = aws_db_instance.this.address
}

output "port" {
  description = "RDS port."
  value       = aws_db_instance.this.port
}

output "master_user_secret_arn" {
  description = "AWS-managed master user secret ARN."
  value       = try(aws_db_instance.this.master_user_secret[0].secret_arn, null)
}

output "security_group_id" {
  description = "RDS security group ID."
  value       = aws_security_group.postgres.id
}
