output "repository_urls" {
  description = "Repository URLs keyed by repository name."
  value       = { for name, repository in aws_ecr_repository.this : name => repository.repository_url }
}

output "repository_arns" {
  description = "Repository ARNs keyed by repository name."
  value       = { for name, repository in aws_ecr_repository.this : name => repository.arn }
}
