.PHONY: install dev images infra-up bootstrap up start down logs build lint test test-e2e test-e2e-live clean

install:
	npm install

dev:
	npm run dev

images:
	docker compose build backend-runtime web

infra-up:
	docker compose up -d postgres rabbitmq redis

bootstrap: infra-up
	docker compose --profile bootstrap run --rm --build bootstrap

up: images bootstrap
	docker compose up -d

start: images
	docker compose up -d

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
