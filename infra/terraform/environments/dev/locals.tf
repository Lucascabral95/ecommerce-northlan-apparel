locals {
  name_prefix = "${var.project_name}-${var.environment}"

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
    Project     = var.project_name
  }

  service_ports = {
    api-gateway          = 4000
    auth-service         = 4101
    user-service         = 4102
    catalog-service      = 4103
    inventory-service    = 4104
    cart-service         = 4105
    order-service        = 4106
    payment-service      = 4107
    notification-service = 4108
    web                  = 3000
  }

  repository_names = {
    for service_name in keys(local.service_ports) : service_name => "${local.name_prefix}-${service_name}"
  }

  legacy_repository_names = var.retain_legacy_backend_repository ? toset(["${local.name_prefix}-backend"]) : toset([])
  ecr_repository_names    = setunion(toset(values(local.repository_names)), local.legacy_repository_names)

  alb_scheme        = var.certificate_arn != null && trimspace(var.certificate_arn) != "" ? "https" : "http"
  inferred_base_url = "${local.alb_scheme}://${module.alb.alb_dns_name}"
  frontend_base_url = trimspace(var.frontend_base_url) != "" ? trimspace(var.frontend_base_url) : local.inferred_base_url
  api_base_url      = trimspace(var.api_gateway_base_url) != "" ? trimspace(var.api_gateway_base_url) : "${local.frontend_base_url}/api/v1"

  secret_names = toset(concat(
    [
      "jwt-access-secret",
      "rabbitmq-url",
      "mercado-pago-access-token",
      "mercado-pago-public-key",
      "mercado-pago-webhook-secret"
    ],
    [for service in keys(local.database_secret_names) : local.database_secret_names[service]]
  ))

  database_secret_names = {
    auth-service         = "auth-database-url"
    user-service         = "user-database-url"
    catalog-service      = "catalog-database-url"
    inventory-service    = "inventory-database-url"
    cart-service         = "cart-database-url"
    order-service        = "order-database-url"
    payment-service      = "payment-database-url"
    notification-service = "notification-database-url"
  }

  common_environment = {
    API_CORS_ORIGIN                   = local.frontend_base_url
    API_GATEWAY_BASE_URL              = local.api_base_url
    API_RATE_LIMIT_LIMIT              = "100"
    API_RATE_LIMIT_TTL_MS             = "60000"
    BCRYPT_SALT_ROUNDS                = "12"
    FRONTEND_BASE_URL                 = local.frontend_base_url
    INVENTORY_RESERVATION_TTL_SECONDS = "900"
    JWT_ACCESS_EXPIRES_IN_SECONDS     = "900"
    JWT_REFRESH_TOKEN_EXPIRES_IN_DAYS = "30"
    LOG_LEVEL                         = "info"
    MERCADO_PAGO_FAILURE_URL          = "${local.frontend_base_url}/es/payment/failure"
    MERCADO_PAGO_NOTIFICATION_URL     = "${local.api_base_url}/payments/mercado-pago/webhook"
    MERCADO_PAGO_PENDING_URL          = "${local.frontend_base_url}/es/payment/pending"
    MERCADO_PAGO_SUCCESS_URL          = "${local.frontend_base_url}/es/payment/success"
    MERCADO_PAGO_WEBHOOK_URL          = "${local.api_base_url}/payments/mercado-pago/webhook"
    NODE_ENV                          = "production"
    PAYMENT_MOCK_FAILURE_AMOUNT       = "13.37"
    PAYMENT_MOCK_FORCE_FAILURE        = "false"
    PAYMENT_PROVIDER                  = var.payment_provider
    PAYMENT_PROVIDER_MODE             = var.payment_provider
    REDIS_URL                         = var.enable_redis ? "rediss://${module.redis.endpoint}:${module.redis.port}" : ""
  }

  import_placeholder_secret_arn = "arn:aws:secretsmanager:${var.aws_region}:000000000000:secret:terraform-import-placeholder"

  backend_common_secrets = {
    JWT_ACCESS_SECRET = try(module.secrets.secret_arns["jwt-access-secret"], local.import_placeholder_secret_arn)
    RABBITMQ_URL      = try(module.secrets.secret_arns["rabbitmq-url"], local.import_placeholder_secret_arn)
  }

  mercado_pago_secrets = var.payment_provider == "MERCADO_PAGO" ? {
    MERCADO_PAGO_ACCESS_TOKEN   = try(module.secrets.secret_arns["mercado-pago-access-token"], local.import_placeholder_secret_arn)
    MERCADO_PAGO_PUBLIC_KEY     = try(module.secrets.secret_arns["mercado-pago-public-key"], local.import_placeholder_secret_arn)
    MERCADO_PAGO_WEBHOOK_SECRET = try(module.secrets.secret_arns["mercado-pago-webhook-secret"], local.import_placeholder_secret_arn)
  } : {}

  service_images = {
    for service_name, repository_name in local.repository_names : service_name => "${try(module.ecr.repository_urls[repository_name], repository_name)}:${var.image_tag}"
  }

  backend_service_defaults = {
    cpu           = 256
    desired_count = var.ecs_desired_count
    memory        = 512
  }

  ecs_services = {
    web = {
      cpu               = 512
      desired_count     = var.ecs_desired_count
      environment       = {}
      health_check_path = "/es"
      image             = local.service_images["web"]
      memory            = 1024
      port              = local.service_ports["web"]
      secrets           = {}
      target_group_key  = "web"
    }
    api-gateway = merge(local.backend_service_defaults, {
      command           = ["node", "apps/api-gateway/dist/main.js"]
      environment       = { API_GATEWAY_PORT = tostring(local.service_ports["api-gateway"]) }
      health_check_path = "/api/v1/health"
      image             = local.service_images["api-gateway"]
      port              = local.service_ports["api-gateway"]
      secrets           = local.backend_common_secrets
      target_group_key  = "api"
    })
    auth-service = merge(local.backend_service_defaults, {
      command           = ["node", "services/auth-service/dist/main.js"]
      environment       = { AUTH_SERVICE_PORT = tostring(local.service_ports["auth-service"]) }
      health_check_path = "/health"
      image             = local.service_images["auth-service"]
      port              = local.service_ports["auth-service"]
      secrets           = merge(local.backend_common_secrets, { AUTH_DATABASE_URL = try(module.secrets.secret_arns[local.database_secret_names["auth-service"]], local.import_placeholder_secret_arn) })
    })
    user-service = merge(local.backend_service_defaults, {
      command           = ["node", "services/user-service/dist/main.js"]
      environment       = { USER_SERVICE_PORT = tostring(local.service_ports["user-service"]) }
      health_check_path = "/health"
      image             = local.service_images["user-service"]
      port              = local.service_ports["user-service"]
      secrets           = merge(local.backend_common_secrets, { USER_DATABASE_URL = try(module.secrets.secret_arns[local.database_secret_names["user-service"]], local.import_placeholder_secret_arn) })
    })
    catalog-service = merge(local.backend_service_defaults, {
      command           = ["node", "services/catalog-service/dist/main.js"]
      environment       = { CATALOG_SERVICE_PORT = tostring(local.service_ports["catalog-service"]) }
      health_check_path = "/health"
      image             = local.service_images["catalog-service"]
      port              = local.service_ports["catalog-service"]
      secrets           = merge(local.backend_common_secrets, { CATALOG_DATABASE_URL = try(module.secrets.secret_arns[local.database_secret_names["catalog-service"]], local.import_placeholder_secret_arn) })
    })
    inventory-service = merge(local.backend_service_defaults, {
      command           = ["node", "services/inventory-service/dist/main.js"]
      environment       = { INVENTORY_SERVICE_PORT = tostring(local.service_ports["inventory-service"]) }
      health_check_path = "/health"
      image             = local.service_images["inventory-service"]
      port              = local.service_ports["inventory-service"]
      secrets = merge(local.backend_common_secrets, {
        CATALOG_DATABASE_URL   = try(module.secrets.secret_arns[local.database_secret_names["catalog-service"]], local.import_placeholder_secret_arn)
        INVENTORY_DATABASE_URL = try(module.secrets.secret_arns[local.database_secret_names["inventory-service"]], local.import_placeholder_secret_arn)
      })
    })
    cart-service = merge(local.backend_service_defaults, {
      command           = ["node", "services/cart-service/dist/main.js"]
      environment       = { CART_SERVICE_PORT = tostring(local.service_ports["cart-service"]) }
      health_check_path = "/health"
      image             = local.service_images["cart-service"]
      port              = local.service_ports["cart-service"]
      secrets           = merge(local.backend_common_secrets, { CART_DATABASE_URL = try(module.secrets.secret_arns[local.database_secret_names["cart-service"]], local.import_placeholder_secret_arn) })
    })
    order-service = merge(local.backend_service_defaults, {
      command           = ["node", "services/order-service/dist/main.js"]
      environment       = { ORDER_SERVICE_PORT = tostring(local.service_ports["order-service"]) }
      health_check_path = "/health"
      image             = local.service_images["order-service"]
      port              = local.service_ports["order-service"]
      secrets           = merge(local.backend_common_secrets, { ORDER_DATABASE_URL = try(module.secrets.secret_arns[local.database_secret_names["order-service"]], local.import_placeholder_secret_arn) })
    })
    payment-service = merge(local.backend_service_defaults, {
      command           = ["node", "services/payment-service/dist/main.js"]
      environment       = { PAYMENT_SERVICE_PORT = tostring(local.service_ports["payment-service"]) }
      health_check_path = "/health"
      image             = local.service_images["payment-service"]
      port              = local.service_ports["payment-service"]
      secrets           = merge(local.backend_common_secrets, local.mercado_pago_secrets, { PAYMENT_DATABASE_URL = try(module.secrets.secret_arns[local.database_secret_names["payment-service"]], local.import_placeholder_secret_arn) })
    })
    notification-service = merge(local.backend_service_defaults, {
      command           = ["node", "services/notification-service/dist/main.js"]
      environment       = { NOTIFICATION_SERVICE_PORT = tostring(local.service_ports["notification-service"]) }
      health_check_path = "/health"
      image             = local.service_images["notification-service"]
      port              = local.service_ports["notification-service"]
      secrets           = merge(local.backend_common_secrets, { NOTIFICATION_DATABASE_URL = try(module.secrets.secret_arns[local.database_secret_names["notification-service"]], local.import_placeholder_secret_arn) })
    })
  }
}
