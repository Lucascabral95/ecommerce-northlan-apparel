resource "aws_security_group" "postgres" {
  description = "PostgreSQL access from ECS."
  name        = "${var.name}-postgres-sg"
  vpc_id      = var.vpc_id

  ingress {
    description     = "PostgreSQL from ECS services"
    from_port       = 5432
    protocol        = "tcp"
    security_groups = [var.ecs_security_group_id]
    to_port         = 5432
  }

  egress {
    cidr_blocks = ["0.0.0.0/0"]
    description = "Outbound"
    from_port   = 0
    protocol    = "-1"
    to_port     = 0
  }

  tags = merge(var.tags, {
    Name = "${var.name}-postgres-sg"
  })
}

resource "aws_db_subnet_group" "this" {
  name       = "${var.name}-postgres"
  subnet_ids = var.private_subnet_ids

  tags = merge(var.tags, {
    Name = "${var.name}-postgres"
  })
}

resource "aws_db_instance" "this" {
  allocated_storage               = var.allocated_storage
  auto_minor_version_upgrade      = true
  backup_retention_period         = var.backup_retention_period
  db_name                         = var.database_name
  db_subnet_group_name            = aws_db_subnet_group.this.name
  deletion_protection             = var.deletion_protection
  engine                          = "postgres"
  engine_version                  = "16"
  identifier                      = "${var.name}-postgres"
  instance_class                  = var.instance_class
  manage_master_user_password     = true
  username                        = var.master_username
  multi_az                        = false
  publicly_accessible             = false
  skip_final_snapshot             = var.skip_final_snapshot
  storage_encrypted               = true
  vpc_security_group_ids          = [aws_security_group.postgres.id]
  performance_insights_enabled    = false
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  tags = merge(var.tags, {
    Name = "${var.name}-postgres"
  })
}
