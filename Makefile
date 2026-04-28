start:
	@bash scripts/start.sh
	docker-compose up

dev:
	@bash scripts/start.sh
	docker-compose up -d
	docker-compose logs -f

down:
	docker-compose down