resource "aws_ecr_repository" "this" {
  for_each = var.repositories

  force_delete         = false
  image_tag_mutability = "MUTABLE"
  name                 = each.value

  encryption_configuration {
    encryption_type = "AES256"
  }

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = merge(var.tags, {
    Name = each.value
  })
}

resource "aws_ecr_lifecycle_policy" "this" {
  for_each = aws_ecr_repository.this

  repository = each.value.name

  policy = jsonencode({
    rules = [
      {
        action = {
          type = "expire"
        }
        description  = "Keep the last ${var.image_retention_count} tagged images."
        rulePriority = 1
        selection = {
          countNumber   = var.image_retention_count
          countType     = "imageCountMoreThan"
          tagPrefixList = var.lifecycle_tag_prefixes
          tagStatus     = "tagged"
        }
      }
    ]
  })
}
