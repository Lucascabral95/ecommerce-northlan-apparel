output "secret_arns" {
  description = "Secret ARNs keyed by short secret name."
  value       = { for key, secret in aws_secretsmanager_secret.this : key => secret.arn }
}
