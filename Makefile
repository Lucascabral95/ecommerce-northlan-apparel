.PHONY: install dev up down logs build lint test test-e2e test-e2e-live clean

install:
	npm install

dev:
	npm run dev

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs --tail=100

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
