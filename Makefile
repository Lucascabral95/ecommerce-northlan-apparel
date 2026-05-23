.PHONY: install dev images infra-up bootstrap up start down logs build lint test test-e2e test-e2e-live clean

COMPOSE_BAKE ?= true
COMPOSE_PARALLEL_LIMIT ?= 4
export COMPOSE_BAKE COMPOSE_PARALLEL_LIMIT

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

clean:
	npm run clean
