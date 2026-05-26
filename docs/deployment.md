# Deployment

This document covers the Phase 17 AWS/Terraform deployment path for the development environment.

## Prerequisites

- Terraform `>= 1.7`.
- AWS CLI authenticated to the target account.
- Docker for building and pushing images.
- An ACM certificate in the same region as the ALB for HTTPS.
- A DNS record pointing your domain to the ALB when you want Mercado Pago to call real HTTPS URLs.

## Terraform Layout

```text
infra/terraform
  environments/dev
  modules/network
  modules/ecr
  modules/alb
  modules/ecs
  modules/rds
  modules/redis
  modules/rabbitmq
  modules/secrets
```

## First Plan

```bash
cd infra/terraform/environments/dev
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
```

The example file keeps ECS desired counts at `0`. This is intentional for Free Tier-friendly development: first create network, ALB, ECR, RDS and secret containers; then populate secrets and choose when to run tasks.

When the plan is reviewed and you are ready to create or update AWS resources, the Makefile wrapper runs the full image and infrastructure flow:

```bash
make deploy
```

`make deploy` can create billable AWS resources. Use `make deploy-plan` first when reviewing changes.

The deploy flow is:

1. Run `terraform init`.
2. Apply infrastructure with ECS desired count at `0`.
3. Configure ECS secrets from Terraform outputs and the AWS-managed RDS master secret.
4. Build and push one Docker image per ECS service to its own ECR repository.
5. Run Prisma migrations as ECS one-off tasks inside the VPC.
6. Run a final Terraform apply with ECS desired count at `1` so task definitions point at the pushed images.

For the least noisy workflow, run the checks separately first:

```bash
make deploy-plan
make deploy-preflight
make deploy
```

By default `make deploy` uses a timestamp tag like `dev-20260525143000`. Override it when needed:

```bash
make deploy AWS_DEPLOY_IMAGE_TAG=dev-my-test
```

## HTTPS For Mercado Pago

Mercado Pago real checkout needs public HTTPS URLs. Set `certificate_arn` and use an HTTPS domain:

```hcl
certificate_arn      = "arn:aws:acm:us-east-1:123456789012:certificate/..."
frontend_base_url    = "https://app.example.com"
api_gateway_base_url = "https://app.example.com/api/v1"
payment_provider     = "MERCADO_PAGO"
```

The ALB will expose `443` and redirect `80` to `443`. Configure Mercado Pago with:

```text
https://app.example.com/api/v1/payments/mercado-pago/webhook
https://app.example.com/es/payment/success
https://app.example.com/es/payment/failure
https://app.example.com/es/payment/pending
```

Do not use the plain `http://<alb-dns-name>` endpoint for Mercado Pago.

## Image Build And Push

Each app/service has its own ECR repository:

- `northlane-apparel-dev-web`
- `northlane-apparel-dev-api-gateway`
- `northlane-apparel-dev-auth-service`
- `northlane-apparel-dev-user-service`
- `northlane-apparel-dev-catalog-service`
- `northlane-apparel-dev-inventory-service`
- `northlane-apparel-dev-cart-service`
- `northlane-apparel-dev-order-service`
- `northlane-apparel-dev-payment-service`
- `northlane-apparel-dev-notification-service`

The old shared `northlane-apparel-dev-backend` repository is retained by default during migration so existing Terraform state does not fail on repository deletion. ECS task definitions do not use it. After confirming it is empty or no longer needed, set `retain_legacy_backend_repository = false`.

`make deploy` builds and pushes these images automatically. To push images only, after ECR and ALB exist:

```bash
make deploy-images
```

To verify AWS credentials, ECR access and Docker login without building or pushing images:

```bash
make deploy-preflight
```

The script reads ECR repository URLs and the public API URL from Terraform outputs. It writes temporary ECR auth into an isolated Docker config instead of relying on your global Docker credential store. If you want to inspect repository URLs manually:

```bash
terraform output ecr_repository_urls
```

If ECR authentication fails, check:

- `aws sts get-caller-identity` returns the same account as the ECR URLs.
- Docker Desktop is running with Linux containers.
- AWS credentials are not expired.
- VPN/proxy settings are not intercepting `*.dkr.ecr.<region>.amazonaws.com`.
- Run `docker logout <account-id>.dkr.ecr.<region>.amazonaws.com` and retry `make deploy-preflight`.

## Secrets

Terraform creates secret containers but does not require real values in source control. The Makefile wrapper configures the required app secrets automatically:

```bash
make deploy-secrets
```

`make deploy-secrets` reads:

- `secret_arns`
- `rds_endpoint`
- `rds_master_user_secret_arn`
- `rabbitmq_endpoints`

It writes service-owned Prisma URLs, `jwt-access-secret`, `rabbitmq-url`, and placeholder Mercado Pago secrets when real Mercado Pago credentials are not configured yet. Each database URL keeps a separate PostgreSQL schema:

```text
postgresql://northlane:<password>@<rds-endpoint>:5432/northlane_platform?schema=auth_service
postgresql://northlane:<password>@<rds-endpoint>:5432/northlane_platform?schema=user_service
postgresql://northlane:<password>@<rds-endpoint>:5432/northlane_platform?schema=catalog_service
postgresql://northlane:<password>@<rds-endpoint>:5432/northlane_platform?schema=inventory_service
postgresql://northlane:<password>@<rds-endpoint>:5432/northlane_platform?schema=cart_service
postgresql://northlane:<password>@<rds-endpoint>:5432/northlane_platform?schema=order_service
postgresql://northlane:<password>@<rds-endpoint>:5432/northlane_platform?schema=payment_service
postgresql://northlane:<password>@<rds-endpoint>:5432/northlane_platform?schema=notification_service
```

RabbitMQ credentials are generated locally in `.aws-rabbitmq-password`, which is ignored by git. Keep that file if you want Terraform to keep the same Amazon MQ user password across repeated `make deploy` runs.

To use an externally managed RabbitMQ instead of Amazon MQ:

```bash
make deploy AWS_ENABLE_RABBITMQ=false AWS_RABBITMQ_URL="amqps://user:password@broker-endpoint:5671"
```

## Starting Services

After infrastructure, images, secrets and migrations exist, start or update ECS services with:

```bash
make deploy-services
```

To run only database migrations:

```bash
make deploy-migrate
```

`make deploy-migrate` runs one Fargate task per Prisma-backed service using the service task definition and its own database secret. It must run after `make deploy-images`, because the task images need the Prisma CLI and each service `prisma` directory.

Catalog seed data is not run by Terraform. Run it as a separate controlled one-off task when you intentionally want to load or refresh demo data.

## Optional Resources

- `rds_backup_retention_period = 0` is the dev default for AWS Free Tier accounts that restrict automated backup retention. Raise it for non-free-tier or persistent environments.
- `enable_redis = true` creates ElastiCache Redis.
- `enable_rabbitmq = true` creates Amazon MQ for RabbitMQ.
- `enable_nat_gateway = true` lets private ECS tasks reach the internet without public IPs, at higher fixed monthly cost.
- `ecs_assign_public_ip = false` should be paired with NAT Gateway or VPC endpoints for ECR, CloudWatch Logs and Secrets Manager.

## Destroy

```bash
make destroy
```

This targets Terraform only and does not touch local Docker Compose development resources. For shared environments, enable `rds_deletion_protection = true` and avoid using the dev destroy target.
