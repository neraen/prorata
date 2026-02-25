#!/bin/bash
set -e

echo "=========================================="
echo "  Prorata Production Deployment Script"
echo "=========================================="

# Check .env file
if [ ! -f .env ]; then
    echo "Error: .env file not found!"
    echo "Copy .env.example to .env and configure it."
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

echo ""
echo "Domain: $DOMAIN"
echo ""

# Pull latest code (if using git)
if [ -d "../.git" ]; then
    echo "[1/7] Pulling latest code..."
    cd .. && git pull && cd deploy
else
    echo "[1/7] Skipping git pull (not a git repository)"
fi

# Build containers
echo ""
echo "[2/7] Building Docker containers..."
docker compose -f docker-compose.prod.yml build --no-cache

# Stop existing containers
echo ""
echo "[3/7] Stopping existing containers..."
docker compose -f docker-compose.prod.yml down

# Start database first
echo ""
echo "[4/7] Starting database..."
docker compose -f docker-compose.prod.yml up -d database
echo "Waiting for database to be healthy..."
sleep 30

# Run migrations
echo ""
echo "[5/7] Running database migrations..."
docker compose -f docker-compose.prod.yml run --rm php php bin/console doctrine:migrations:migrate --no-interaction

# Start all services
echo ""
echo "[6/7] Starting all services..."
docker compose -f docker-compose.prod.yml up -d

# Clear cache
echo ""
echo "[7/7] Clearing cache..."
docker compose -f docker-compose.prod.yml exec php php bin/console cache:clear --env=prod

echo ""
echo "=========================================="
echo "  Deployment complete!"
echo "=========================================="
echo ""
echo "Your application should be available at:"
echo "  https://$DOMAIN"
echo ""
echo "To view logs:"
echo "  docker compose -f docker-compose.prod.yml logs -f"
echo ""