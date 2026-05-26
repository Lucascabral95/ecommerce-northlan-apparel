resource "aws_security_group" "rabbitmq" {
  count = var.create ? 1 : 0

  description = "RabbitMQ access from ECS."
  name        = "${var.name}-rabbitmq-sg"
  vpc_id      = var.vpc_id

  ingress {
    description     = "RabbitMQ TLS AMQP from ECS services"
    from_port       = 5671
    protocol        = "tcp"
    security_groups = [var.ecs_security_group_id]
    to_port         = 5671
  }

  egress {
    cidr_blocks = ["0.0.0.0/0"]
    description = "Outbound"
    from_port   = 0
    protocol    = "-1"
    to_port     = 0
  }

  tags = merge(var.tags, {
    Name = "${var.name}-rabbitmq-sg"
  })
}

resource "aws_mq_broker" "this" {
  count = var.create ? 1 : 0

  apply_immediately          = true
  auto_minor_version_upgrade = true
  broker_name                = "${var.name}-rabbitmq"
  deployment_mode            = var.deployment_mode
  engine_type                = "RabbitMQ"
  engine_version             = var.engine_version
  host_instance_type         = var.host_instance_type
  publicly_accessible        = false
  security_groups            = [aws_security_group.rabbitmq[0].id]
  subnet_ids                 = var.deployment_mode == "SINGLE_INSTANCE" ? [var.private_subnet_ids[0]] : var.private_subnet_ids

  logs {
    general = true
  }

  user {
    password = var.password
    username = var.username
  }

  tags = merge(var.tags, {
    Name = "${var.name}-rabbitmq"
  })

  lifecycle {
    precondition {
      condition     = !var.create || (var.username != null && var.password != null)
      error_message = "RabbitMQ username and password are required when create=true."
    }
  }
}
