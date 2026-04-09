.PHONY: help install build test dev start db-create db-check db-migrate db-seed db-reset bootstrap setup

help:
	@echo "Targets disponibles:"
	@echo "  make install      Instala dependencias"
	@echo "  make build        Compila TypeScript"
	@echo "  make test         Ejecuta pruebas"
	@echo "  make db-create    Crea la base local configurada en .env si aun no existe"
	@echo "  make db-check     Verifica que el target de BD sea seguro para reset/undo"
	@echo "  make db-migrate   Ejecuta migrations usando DATABASE_URL o credenciales DB_*"
	@echo "  make db-seed      Ejecuta seeders idempotentes"
	@echo "  make bootstrap    Ejecuta migrations y seeders"
	@echo "  make setup        Instala, compila y bootstrapea la base"
	@echo "  make dev          Inicia el backend en desarrollo"
	@echo "  make start        Inicia el backend compilado"
	@echo "  make db-reset     Revierte seeders y migrations"
	@echo "  Usa ALLOW_REMOTE_DB=1 solo si realmente necesitas operar contra una base remota"

install:
	npm install

build:
	npm run build

test:
	npm test

db-create:
	npm run db:create

db-check:
	npm run db:assert-safe

db-migrate: db-create
	npm run db:migrate

db-seed:
	npm run db:seed:all

bootstrap: db-migrate db-seed

setup: install build bootstrap

dev:
	npm run dev

start:
	npm start

db-reset: db-check
	npm run db:seed:undo:all
	npm run db:migrate:undo:all
