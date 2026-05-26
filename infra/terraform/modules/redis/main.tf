resource "aws_security_group" "redis" {
  count = var.create ? 1 : 0

  description = "Redis access from ECS."
  name        = "${var.name}-redis-sg"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Redis from ECS services"
    from_port       = 6379
    protocol        = "tcp"
    security_groups = [var.ecs_security_group_id]
    to_port         = 6379
  }

  egress {
    cidr_blocks = ["0.0.0.0/0"]
    description = "Outbound"
    from_port   = 0
    protocol    = "-1"
    to_port     = 0
  }

  tags = merge(var.tags, {
    Name = "${var.name}-redis-sg"
  })
}

resource "aws_elasticache_subnet_group" "this" {
  count = var.create ? 1 : 0

  name       = "${var.name}-redis"
  subnet_ids = var.private_subnet_ids

  tags = merge(var.tags, {
    Name = "${var.name}-redis"
  })
}

resource "aws_elasticache_replication_group" "this" {
  count = var.create ? 1 : 0

  at_rest_encryption_enabled = true
  automatic_failover_enabled = false
  description                = "Redis for ${var.name}"
  engine                     = "redis"
  node_type                  = var.node_type
  num_cache_clusters         = 1
  replication_group_id       = "${var.name}-redis"
  security_group_ids         = [aws_security_group.redis[0].id]
  subnet_group_name          = aws_elasticache_subnet_group.this[0].name
  transit_encryption_enabled = var.transit_encryption_enabled

  tags = merge(var.tags, {
    Name = "${var.name}-redis"
  })
}
