module "network" {
  source = "../../modules/network"

  availability_zone_count = var.availability_zone_count
  enable_nat_gateway      = var.enable_nat_gateway
  name                    = local.name_prefix
  tags                    = local.tags
  vpc_cidr                = var.vpc_cidr
}

module "ecr" {
  source = "../../modules/ecr"

  repositories = local.ecr_repository_names
  tags         = local.tags
}

module "alb" {
  source = "../../modules/alb"

  certificate_arn          = var.certificate_arn
  default_target_group_key = "web"
  name                     = local.name_prefix
  public_subnet_ids        = module.network.public_subnet_ids
  tags                     = local.tags
  vpc_id                   = module.network.vpc_id

  target_groups = {
    api = {
      health_check_path = "/api/v1/health"
      port              = local.service_ports["api-gateway"]
    }
    web = {
      health_check_path = "/es"
      port              = local.service_ports["web"]
    }
  }

  listener_rules = {
    api = {
      path_patterns    = ["/api/*"]
      priority         = 10
      target_group_key = "api"
    }
  }
}

module "secrets" {
  source = "../../modules/secrets"

  name_prefix   = local.name_prefix
  secret_names  = local.secret_names
  secret_values = var.secret_values
  tags          = local.tags
}

module "ecs" {
  source = "../../modules/ecs"

  alb_security_group_id = module.alb.alb_security_group_id
  assign_public_ip      = var.ecs_assign_public_ip
  cluster_name          = "${local.name_prefix}-cluster"
  common_environment    = local.common_environment
  common_secrets        = {}
  name                  = local.name_prefix
  services              = local.ecs_services
  subnet_ids            = var.ecs_assign_public_ip ? module.network.public_subnet_ids : module.network.private_subnet_ids
  tags                  = local.tags
  target_group_arns     = module.alb.target_group_arns
  vpc_id                = module.network.vpc_id
}

module "rds" {
  source = "../../modules/rds"

  allocated_storage       = var.rds_allocated_storage
  backup_retention_period = var.rds_backup_retention_period
  database_name           = "northlane_platform"
  deletion_protection     = var.rds_deletion_protection
  ecs_security_group_id   = module.ecs.service_security_group_id
  instance_class          = var.rds_instance_class
  master_username         = "northlane"
  name                    = local.name_prefix
  private_subnet_ids      = module.network.private_subnet_ids
  tags                    = local.tags
  vpc_id                  = module.network.vpc_id
}

module "redis" {
  source = "../../modules/redis"

  create                = var.enable_redis
  ecs_security_group_id = module.ecs.service_security_group_id
  name                  = local.name_prefix
  private_subnet_ids    = module.network.private_subnet_ids
  tags                  = local.tags
  vpc_id                = module.network.vpc_id
}

module "rabbitmq" {
  source = "../../modules/rabbitmq"

  create                = var.enable_rabbitmq
  ecs_security_group_id = module.ecs.service_security_group_id
  name                  = local.name_prefix
  password              = var.rabbitmq_password
  private_subnet_ids    = module.network.private_subnet_ids
  tags                  = local.tags
  username              = var.rabbitmq_username
  vpc_id                = module.network.vpc_id
}
