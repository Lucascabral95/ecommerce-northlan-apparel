.PHONY: install dev images infra-up bootstrap up start down logs observability-logs build lint test test-e2e test-e2e-live deploy deploy-infra deploy-reconcile deploy-preflight deploy-secrets deploy-images deploy-bootstrap-if-needed deploy-migrate deploy-seed deploy-services ensure-deploy-image-tag deploy-plan deploy-status deploy-stop destroy clean

ifneq (,$(wildcard .env))
include .env
endif

COMPOSE_BAKE ?= true
COMPOSE_PARALLEL_LIMIT ?= 4
TF_ENV ?= dev
TF_DIR ?= infra/terraform/environments/$(TF_ENV)
AWS_PAYMENT_PROVIDER ?= $(firstword $(PAYMENT_PROVIDER_MODE) $(PAYMENT_PROVIDER) MOCK)
AWS_DEPLOY_IMAGE_TAG_FILE ?= .aws-deploy-image-tag
AWS_DEPLOY_BOOTSTRAP_MARKER ?= .aws-deploy-bootstrap-required
AWS_DEPLOY_RDS_RESOURCE_MARKER ?= .aws-deploy-rds-resource-id
AWS_DEPLOY_IMAGE_TAG_DEFAULT := dev-$(shell powershell -NoProfile -Command "Get-Date -Format yyyyMMddHHmmss")
AWS_DEPLOY_IMAGE_TAG_FROM_FILE := $(shell powershell -NoProfile -ExecutionPolicy Bypass -Command "if (Test-Path '$(AWS_DEPLOY_IMAGE_TAG_FILE)') { (Get-Content '$(AWS_DEPLOY_IMAGE_TAG_FILE)' -Raw).Trim() }")
AWS_DEPLOY_IMAGE_TAG_ORIGIN := $(origin AWS_DEPLOY_IMAGE_TAG)
ifeq ($(AWS_DEPLOY_IMAGE_TAG_ORIGIN), undefined)
ifneq ($(filter deploy deploy-images,$(MAKECMDGOALS)),)
AWS_DEPLOY_IMAGE_TAG := $(AWS_DEPLOY_IMAGE_TAG_DEFAULT)
else ifneq ($(strip $(AWS_DEPLOY_IMAGE_TAG_FROM_FILE)),)
AWS_DEPLOY_IMAGE_TAG := $(AWS_DEPLOY_IMAGE_TAG_FROM_FILE)
else
AWS_DEPLOY_IMAGE_TAG := $(AWS_DEPLOY_IMAGE_TAG_DEFAULT)
endif
endif
AWS_DOCKER_PLATFORM ?= linux/amd64
AWS_REGION ?= us-east-1
AWS_ECS_CLUSTER ?= northlane-apparel-dev-cluster
AWS_ECS_DESIRED_COUNT ?= 1
AWS_ECS_SERVICES ?= web api-gateway auth-service user-service catalog-service inventory-service cart-service order-service payment-service notification-service
AWS_RABBITMQ_URL ?=
AWS_ENABLE_RABBITMQ ?= true
AWS_RABBITMQ_USERNAME ?= northlane
AWS_RABBITMQ_PASSWORD_FILE ?= .aws-rabbitmq-password
AWS_RABBITMQ_PASSWORD ?= $(shell powershell -NoProfile -ExecutionPolicy Bypass -Command "if (Test-Path '$(AWS_RABBITMQ_PASSWORD_FILE)') { (Get-Content '$(AWS_RABBITMQ_PASSWORD_FILE)' -Raw).Trim() } else { $$password = (([guid]::NewGuid().ToString('N')) + ([guid]::NewGuid().ToString('N'))).Substring(0, 32); Set-Content -NoNewline -Path '$(AWS_RABBITMQ_PASSWORD_FILE)' -Value $$password; $$password }")
TF_DEPLOY_VARS := -var="image_tag=$(AWS_DEPLOY_IMAGE_TAG)" -var="payment_provider=$(strip $(AWS_PAYMENT_PROVIDER))"
ifeq ($(AWS_ENABLE_RABBITMQ),true)
TF_DEPLOY_VARS += -var="enable_rabbitmq=true" -var="rabbitmq_username=$(AWS_RABBITMQ_USERNAME)" -var="rabbitmq_password=$(AWS_RABBITMQ_PASSWORD)"
endif
export COMPOSE_BAKE COMPOSE_PARALLEL_LIMIT PAYMENT_PROVIDER PAYMENT_PROVIDER_MODE MERCADO_PAGO_ACCESS_TOKEN MERCADO_PAGO_PUBLIC_KEY MERCADO_PAGO_WEBHOOK_SECRET MERCADO_PAGO_HTTP_DEMO_MODE

install:
	npm install

dev:
	cd apps/web && npm run dev

images:
	docker compose build backend-runtime bootstrap web

infra-up:
	docker compose up -d postgres rabbitmq redis

bootstrap: images infra-up
	docker compose --profile bootstrap run --rm bootstrap

up: bootstrap
	docker compose up -d --no-build

start: images
	docker compose up -d --no-build

down:
	docker compose down --remove-orphans

logs:
	docker compose logs --tail=100 -f

observability-logs:
	docker compose logs -f prometheus grafana loki alloy

test:
	npm test

test-e2e:
	npm run test:e2e

test-e2e-live:
	npm run test:e2e:live

lint:
	npm run lint

build:
	npm run build

# Terraform deployment
deploy:
	@$(MAKE) deploy-infra AWS_DEPLOY_IMAGE_TAG="$(AWS_DEPLOY_IMAGE_TAG)"
	@powershell -NoProfile -ExecutionPolicy Bypass -File scripts/aws/detect-deploy-bootstrap-needed.ps1 -TerraformDir "$(TF_DIR)" -Region "$(AWS_REGION)" -MarkerPath "$(AWS_DEPLOY_BOOTSTRAP_MARKER)" -DbResourceMarkerPath "$(AWS_DEPLOY_RDS_RESOURCE_MARKER)"
	@$(MAKE) deploy-secrets AWS_DEPLOY_IMAGE_TAG="$(AWS_DEPLOY_IMAGE_TAG)"
	@$(MAKE) deploy-images AWS_DEPLOY_IMAGE_TAG="$(AWS_DEPLOY_IMAGE_TAG)"
	@$(MAKE) deploy-bootstrap-if-needed AWS_DEPLOY_IMAGE_TAG="$(AWS_DEPLOY_IMAGE_TAG)"
	@$(MAKE) deploy-services AWS_DEPLOY_IMAGE_TAG="$(AWS_DEPLOY_IMAGE_TAG)"

deploy-infra:
	powershell -NoProfile -ExecutionPolicy Bypass -File scripts/aws/invoke-terraform.ps1 -TerraformDir "$(TF_DIR)" init
	@powershell -NoProfile -ExecutionPolicy Bypass -File scripts/aws/reconcile-terraform-existing-resources.ps1 -TerraformDir "$(TF_DIR)" -Region "$(AWS_REGION)"
	@echo Applying AWS infrastructure with ECS desired_count=0...
	@powershell -NoProfile -ExecutionPolicy Bypass -File scripts/aws/invoke-terraform.ps1 -TerraformDir "$(TF_DIR)" apply -auto-approve $(TF_DEPLOY_VARS) -var="ecs_desired_count=0"

deploy-reconcile:
	powershell -NoProfile -ExecutionPolicy Bypass -File scripts/aws/invoke-terraform.ps1 -TerraformDir "$(TF_DIR)" init
	@powershell -NoProfile -ExecutionPolicy Bypass -File scripts/aws/reconcile-terraform-existing-resources.ps1 -TerraformDir "$(TF_DIR)" -Region "$(AWS_REGION)"

deploy-preflight: deploy-infra
	powershell -NoProfile -ExecutionPolicy Bypass -File scripts/aws/deploy-ecr-images.ps1 -TerraformDir "$(TF_DIR)" -ImageTag "$(AWS_DEPLOY_IMAGE_TAG)" -DockerPlatform "$(AWS_DOCKER_PLATFORM)" -SkipDockerBuild

deploy-images:
	powershell -NoProfile -ExecutionPolicy Bypass -File scripts/aws/deploy-ecr-images.ps1 -TerraformDir "$(TF_DIR)" -ImageTag "$(AWS_DEPLOY_IMAGE_TAG)" -DockerPlatform "$(AWS_DOCKER_PLATFORM)"
	@powershell -NoProfile -ExecutionPolicy Bypass -Command "Set-Content -NoNewline -Path '$(AWS_DEPLOY_IMAGE_TAG_FILE)' -Value '$(AWS_DEPLOY_IMAGE_TAG)'"

deploy-bootstrap-if-needed: ensure-deploy-image-tag
	@powershell -NoProfile -ExecutionPolicy Bypass -File scripts/aws/run-deploy-bootstrap-if-needed.ps1 -MarkerPath "$(AWS_DEPLOY_BOOTSTRAP_MARKER)" -DbResourceMarkerPath "$(AWS_DEPLOY_RDS_RESOURCE_MARKER)" -TerraformDir "$(TF_DIR)" -Region "$(AWS_REGION)"

ensure-deploy-image-tag:
	@powershell -NoProfile -ExecutionPolicy Bypass -Command "if ('$(AWS_DEPLOY_IMAGE_TAG_ORIGIN)' -ne 'undefined') { exit 0 }; if (-not (Test-Path '$(AWS_DEPLOY_IMAGE_TAG_FILE)')) { throw 'No deployed image tag found. Run make deploy-images first, run make deploy, or pass AWS_DEPLOY_IMAGE_TAG=<tag> explicitly.' }"

deploy-services: ensure-deploy-image-tag
	@echo Updating ECS services with desired_count=$(AWS_ECS_DESIRED_COUNT)...
	@powershell -NoProfile -ExecutionPolicy Bypass -File scripts/aws/invoke-terraform.ps1 -TerraformDir "$(TF_DIR)" apply -auto-approve $(TF_DEPLOY_VARS) -var="ecs_desired_count=$(AWS_ECS_DESIRED_COUNT)"

deploy-migrate:
	@echo Running Prisma migrations in ECS one-off tasks...
	@powershell -NoProfile -ExecutionPolicy Bypass -File scripts/aws/run-prisma-migrations.ps1 -TerraformDir "$(TF_DIR)" -Region "$(AWS_REGION)"

deploy-seed: ensure-deploy-image-tag
	@echo Seeding catalog and synchronizing inventory in ECS one-off tasks...
	@powershell -NoProfile -ExecutionPolicy Bypass -File scripts/aws/run-catalog-seed.ps1 -TerraformDir "$(TF_DIR)" -Region "$(AWS_REGION)"

deploy-secrets:
	@echo Configuring AWS Secrets Manager values...
	@powershell -NoProfile -ExecutionPolicy Bypass -File scripts/aws/configure-ecs-secrets.ps1 -TerraformDir "$(TF_DIR)" -Region "$(AWS_REGION)" -PaymentProvider "$(strip $(AWS_PAYMENT_PROVIDER))" -RabbitMqUrl "$(AWS_RABBITMQ_URL)" -RabbitMqUsername "$(AWS_RABBITMQ_USERNAME)" -RabbitMqPassword "$(AWS_RABBITMQ_PASSWORD)"

deploy-plan:
	powershell -NoProfile -ExecutionPolicy Bypass -File scripts/aws/invoke-terraform.ps1 -TerraformDir "$(TF_DIR)" init
	@powershell -NoProfile -ExecutionPolicy Bypass -File scripts/aws/reconcile-terraform-existing-resources.ps1 -TerraformDir "$(TF_DIR)" -Region "$(AWS_REGION)"
	@powershell -NoProfile -ExecutionPolicy Bypass -File scripts/aws/invoke-terraform.ps1 -TerraformDir "$(TF_DIR)" plan $(TF_DEPLOY_VARS) -var="ecs_desired_count=$(AWS_ECS_DESIRED_COUNT)"

deploy-status:
	aws ecs describe-services --region $(AWS_REGION) --cluster $(AWS_ECS_CLUSTER) --services $(AWS_ECS_SERVICES) --query "services[].{name:serviceName,desired:desiredCount,running:runningCount,pending:pendingCount,status:status,taskDefinition:taskDefinition}" --output table

deploy-stop:
	@echo Stopping ECS services with desired_count=0...
	@powershell -NoProfile -ExecutionPolicy Bypass -File scripts/aws/invoke-terraform.ps1 -TerraformDir "$(TF_DIR)" apply -auto-approve $(TF_DEPLOY_VARS) -var="ecs_desired_count=0"

# destroy:
# 	terraform -chdir=$(TF_DIR) destroy
destroy:
	powershell -NoProfile -ExecutionPolicy Bypass -File scripts/aws/invoke-terraform.ps1 -TerraformDir "$(TF_DIR)" init
	@powershell -NoProfile -ExecutionPolicy Bypass -File scripts/aws/remove-ecr-from-terraform-state.ps1 -TerraformDir "$(TF_DIR)"
	powershell -NoProfile -ExecutionPolicy Bypass -File scripts/aws/invoke-terraform.ps1 -TerraformDir "$(TF_DIR)" destroy -auto-approve $(TF_DEPLOY_VARS) -var="ecs_desired_count=0"
# Destruir con esto 
# cd infra/terraform/environments/dev
# terraform destroy

clean:
	npm run clean
