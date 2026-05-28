#!/bin/bash
set -e

echo "🛑 Stopping Social Planner development services..."

docker compose -f docker/docker-compose.dev.yml down

echo "✅ All services stopped."
