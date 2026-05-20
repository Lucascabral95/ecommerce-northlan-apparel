.PHONY: install dev up down logs build lint test clean

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

lint:
	npm run lint

build:
	npm run build

clean:
	npm run clean
