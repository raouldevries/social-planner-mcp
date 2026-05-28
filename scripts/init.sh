#!/bin/bash
set -e

echo "🚀 Initializing Social Planner development environment..."

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed."; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed."; exit 1; }

# Check Node version
NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "❌ Node.js 20 or higher is required. Current version: $(node -v)"
  exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
  echo "📝 Creating .env file from .env.example..."
  cp .env.example .env
fi

# Start Docker services
echo "🐳 Starting Docker services..."
docker compose -f docker/docker-compose.dev.yml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 5

# Wait for PostgreSQL
echo "   Checking PostgreSQL..."
until docker exec planner-postgres pg_isready -U planner -d planner_dev > /dev/null 2>&1; do
  sleep 1
done
echo "   ✓ PostgreSQL ready"

# Wait for Redis
echo "   Checking Redis..."
until docker exec planner-redis redis-cli ping > /dev/null 2>&1; do
  sleep 1
done
echo "   ✓ Redis ready"

# Wait for MinIO
echo "   Checking MinIO..."
until docker exec planner-minio mc ready local > /dev/null 2>&1; do
  sleep 1
done
echo "   ✓ MinIO ready"

# Set up MinIO bucket with public read access
echo "📦 Setting up MinIO bucket..."
docker exec planner-minio mc mb --ignore-existing local/planner-media
docker exec planner-minio mc anonymous set download local/planner-media
echo "   ✓ MinIO bucket configured with public read access"

# Run database migrations (once Prisma is set up)
# echo "🗄️ Running database migrations..."
# npm run db:migrate

# Seed database (optional)
if [ "$1" = "--seed" ]; then
  echo "🌱 Seeding database..."
  npm run db:seed
fi

echo ""
echo "✅ Development environment ready!"
echo ""
echo "Services:"
echo "  - PostgreSQL: localhost:5432"
echo "  - Redis: localhost:6379"
echo "  - MinIO Console: http://localhost:9001 (minioadmin/minioadmin)"
echo "  - MailHog: http://localhost:8025"
echo ""
echo "Run 'npm run dev' to start the development servers."
