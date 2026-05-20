.PHONY: install dev up down logs db-migrate db-seed test lint build docker-build deploy destroy clean

install:
	npm install

dev:
	npm run dev

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

db-migrate:
	npm run db:migrate

db-seed:
	npm run db:seed

test:
	npm test

lint:
	npm run lint

build:
	npm run build

docker-build:
	docker compose build

deploy:
	@echo "Cloud deployment is intentionally not implemented in Phase 1."

destroy:
	@echo "Cloud infrastructure is intentionally not implemented in Phase 1."

clean:
	npm run clean
