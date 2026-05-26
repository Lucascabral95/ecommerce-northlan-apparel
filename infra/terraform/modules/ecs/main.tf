locals {
  service_secret_arns = flatten([
    for service in values(var.services) : values(merge(var.common_secrets, service.secrets))
  ])
  secret_arns = distinct(compact(local.service_secret_arns))
}

resource "aws_ecs_cluster" "this" {
  name = var.cluster_name

  setting {
    name  = "containerInsights"
    value = "disabled"
  }

  tags = merge(var.tags, {
    Name = var.cluster_name
  })
}

resource "aws_security_group" "ecs" {
  description = "ECS service access."
  name        = "${var.name}-ecs-sg"
  vpc_id      = var.vpc_id

  ingress {
    description     = "ALB to ECS service ports"
    from_port       = 3000
    protocol        = "tcp"
    security_groups = [var.alb_security_group_id]
    to_port         = 4108
  }

  egress {
    cidr_blocks = ["0.0.0.0/0"]
    description = "Outbound"
    from_port   = 0
    protocol    = "-1"
    to_port     = 0
  }

  tags = merge(var.tags, {
    Name = "${var.name}-ecs-sg"
  })
}

resource "aws_iam_role" "execution" {
  name = "${var.name}-ecs-execution"

  assume_role_policy = jsonencode({
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
    Version = "2012-10-17"
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "execution" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
  role       = aws_iam_role.execution.name
}

resource "aws_iam_role_policy" "execution_secrets" {
  name = "${var.name}-ecs-secrets"
  role = aws_iam_role.execution.id

  policy = jsonencode({
    Statement = [
      {
        Action = [
          "secretsmanager:GetSecretValue",
          "ssm:GetParameters",
          "kms:Decrypt"
        ]
        Effect   = "Allow"
        Resource = local.secret_arns
      }
    ]
    Version = "2012-10-17"
  })
}

resource "aws_iam_role" "task" {
  name = "${var.name}-ecs-task"

  assume_role_policy = jsonencode({
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
    Version = "2012-10-17"
  })

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "service" {
  for_each = var.services

  name              = "/ecs/${var.name}/${each.key}"
  retention_in_days = var.log_retention_days

  tags = merge(var.tags, {
    Name = "/ecs/${var.name}/${each.key}"
  })
}

resource "aws_ecs_task_definition" "service" {
  for_each = var.services

  container_definitions = jsonencode([
    merge(
      {
        essential = true
        healthCheck = {
          command = [
            "CMD-SHELL",
            "node -e \"fetch('http://127.0.0.1:${each.value.port}${each.value.health_check_path}').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))\""
          ]
          interval    = 30
          retries     = 3
          startPeriod = 45
          timeout     = 5
        }
        image = each.value.image
        logConfiguration = {
          logDriver = "awslogs"
          options = {
            awslogs-group         = aws_cloudwatch_log_group.service[each.key].name
            awslogs-region        = data.aws_region.current.region
            awslogs-stream-prefix = each.key
          }
        }
        name = each.key
        portMappings = [
          {
            containerPort = each.value.port
            hostPort      = each.value.port
            protocol      = "tcp"
          }
        ]
        environment = [
          for key, value in merge(var.common_environment, each.value.environment) : {
            name  = key
            value = value
          }
        ]
        secrets = [
          for key, value in merge(var.common_secrets, each.value.secrets) : {
            name      = key
            valueFrom = value
          }
        ]
      },
      each.value.command == null ? {} : { command = each.value.command }
    )
  ])
  cpu                      = each.value.cpu
  execution_role_arn       = aws_iam_role.execution.arn
  family                   = "${var.name}-${each.key}"
  memory                   = each.value.memory
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  task_role_arn            = aws_iam_role.task.arn

  tags = merge(var.tags, {
    Name = "${var.name}-${each.key}"
  })
}

resource "aws_ecs_service" "service" {
  for_each = var.services

  cluster         = aws_ecs_cluster.this.id
  desired_count   = each.value.desired_count
  launch_type     = "FARGATE"
  name            = each.key
  task_definition = aws_ecs_task_definition.service[each.key].arn

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  dynamic "load_balancer" {
    for_each = each.value.target_group_key == null ? [] : [each.value.target_group_key]

    content {
      container_name   = each.key
      container_port   = each.value.port
      target_group_arn = var.target_group_arns[load_balancer.value]
    }
  }

  network_configuration {
    assign_public_ip = var.assign_public_ip
    security_groups  = [aws_security_group.ecs.id]
    subnets          = var.subnet_ids
  }

  tags = merge(var.tags, {
    Name = "${var.name}-${each.key}"
  })
}

data "aws_region" "current" {}
