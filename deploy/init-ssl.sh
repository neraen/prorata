#!/bin/bash
set -e

echo "=== Prorata SSL Initialization ==="

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

if [ -z "$DOMAIN" ]; then
    echo "Error: DOMAIN must be set in .env"
    exit 1
fi

if [ -z "$LETSENCRYPT_EMAIL" ]; then
    echo "Error: LETSENCRYPT_EMAIL must be set in .env"
    exit 1
fi

echo "Domain: $DOMAIN"
echo "Email: $LETSENCRYPT_EMAIL"
echo ""

# Create directories
mkdir -p nginx/ssl
mkdir -p certbot/www
mkdir -p certbot/conf

# Generate self-signed certificate for initial startup
echo "[1/5] Generating temporary self-signed certificate..."
openssl req -x509 -nodes -newkey rsa:2048 \
    -keyout nginx/ssl/privkey.pem \
    -out nginx/ssl/fullchain.pem \
    -days 1 \
    -subj "/CN=$DOMAIN" 2>/dev/null

echo "[2/5] Stopping existing containers..."
docker compose -f docker-compose.prod.yml down 2>/dev/null || true

echo "[3/5] Starting nginx only..."
docker compose -f docker-compose.prod.yml up -d nginx

echo "Waiting for nginx..."
sleep 5

# Test HTTP access
echo "[4/5] Testing HTTP access..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://$DOMAIN/" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "000" ]; then
    echo "ERROR: Cannot reach http://$DOMAIN"
    echo "Check that:"
    echo "  - DNS points to this server: dig +short $DOMAIN"
    echo "  - Port 80 is open: ufw status"
    echo "  - Nginx is running: docker compose -f docker-compose.prod.yml logs nginx"
    exit 1
fi
echo "HTTP responding with code: $HTTP_CODE"

echo "[5/5] Requesting Let's Encrypt certificate..."
docker run --rm \
    -v "$(pwd)/certbot/www:/var/www/certbot" \
    -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$LETSENCRYPT_EMAIL" \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    -d "$DOMAIN"

echo "Copying certificates..."
cp "certbot/conf/live/$DOMAIN/fullchain.pem" nginx/ssl/
cp "certbot/conf/live/$DOMAIN/privkey.pem" nginx/ssl/

echo "Restarting nginx with Let's Encrypt certificate..."
docker compose -f docker-compose.prod.yml restart nginx

echo ""
echo "=== SSL initialization complete! ==="
echo "Your site: https://$DOMAIN"
echo ""
echo "To verify: curl -I https://$DOMAIN"