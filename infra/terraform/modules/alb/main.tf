locals {
  has_certificate = var.certificate_arn != null && trimspace(var.certificate_arn) != ""
}

resource "aws_security_group" "alb" {
  description = "Public ALB access."
  name        = "${var.name}-alb-sg"
  vpc_id      = var.vpc_id

  ingress {
    cidr_blocks = var.allowed_cidr_blocks
    description = "HTTP"
    from_port   = 80
    protocol    = "tcp"
    to_port     = 80
  }

  ingress {
    cidr_blocks = var.allowed_cidr_blocks
    description = "HTTPS"
    from_port   = 443
    protocol    = "tcp"
    to_port     = 443
  }

  egress {
    cidr_blocks = ["0.0.0.0/0"]
    description = "Outbound"
    from_port   = 0
    protocol    = "-1"
    to_port     = 0
  }

  tags = merge(var.tags, {
    Name = "${var.name}-alb-sg"
  })
}

resource "aws_lb" "this" {
  drop_invalid_header_fields = true
  internal                   = false
  load_balancer_type         = "application"
  name                       = "${var.name}-alb"
  security_groups            = [aws_security_group.alb.id]
  subnets                    = var.public_subnet_ids

  tags = merge(var.tags, {
    Name = "${var.name}-alb"
  })
}

resource "aws_lb_target_group" "this" {
  for_each = var.target_groups

  deregistration_delay = 30
  name                 = substr("${var.name}-${each.key}", 0, 32)
  port                 = each.value.port
  protocol             = "HTTP"
  target_type          = "ip"
  vpc_id               = var.vpc_id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200-399"
    path                = each.value.health_check_path
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 3
  }

  tags = merge(var.tags, {
    Name = substr("${var.name}-${each.key}", 0, 32)
  })
}

resource "aws_lb_listener" "http_redirect" {
  count = local.has_certificate ? 1 : 0

  load_balancer_arn = aws_lb.this.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "http_forward" {
  count = local.has_certificate ? 0 : 1

  load_balancer_arn = aws_lb.this.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    target_group_arn = aws_lb_target_group.this[var.default_target_group_key].arn
    type             = "forward"
  }
}

resource "aws_lb_listener" "https" {
  count = local.has_certificate ? 1 : 0

  certificate_arn   = var.certificate_arn
  load_balancer_arn = aws_lb.this.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"

  default_action {
    target_group_arn = aws_lb_target_group.this[var.default_target_group_key].arn
    type             = "forward"
  }
}

resource "aws_lb_listener_rule" "this" {
  for_each = var.listener_rules

  listener_arn = local.has_certificate ? aws_lb_listener.https[0].arn : aws_lb_listener.http_forward[0].arn
  priority     = each.value.priority

  action {
    target_group_arn = aws_lb_target_group.this[each.value.target_group_key].arn
    type             = "forward"
  }

  condition {
    path_pattern {
      values = each.value.path_patterns
    }
  }
}
