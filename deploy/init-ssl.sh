#!/bin/bash
set -e

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

if [ -z "$DOMAIN" ] || [ -z "$LETSENCRYPT_EMAIL" ]; then
    echo "Error: DOMAIN and LETSENCRYPT_EMAIL must be set in .env"
    exit 1
fi

echo "=== Initializing SSL for $DOMAIN ==="

# Create SSL directory
mkdir -p nginx/ssl

# Generate temporary self-signed certificate
echo "Generating temporary self-signed certificate..."
openssl req -x509 -nodes -newkey rsa:4096 \
    -keyout nginx/ssl/privkey.pem \
    -out nginx/ssl/fullchain.pem \
    -days 1 \
    -subj "/CN=$DOMAIN"

echo "Starting nginx with temporary certificate..."
docker compose -f docker-compose.prod.yml up -d nginx

echo "Waiting for nginx to start..."
sleep 5

echo "Requesting Let's Encrypt certificate..."
docker compose -f docker-compose.prod.yml run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $LETSENCRYPT_EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN

echo "Copying Let's Encrypt certificates..."
# The certbot container stores certs in the volume, we need to update nginx config
# to point to the correct location

echo "Updating nginx to use Let's Encrypt certificates..."
sed -i "s|/etc/nginx/ssl/fullchain.pem|/etc/letsencrypt/live/$DOMAIN/fullchain.pem|g" nginx/prod.conf
sed -i "s|/etc/nginx/ssl/privkey.pem|/etc/letsencrypt/live/$DOMAIN/privkey.pem|g" nginx/prod.conf

echo "Restarting nginx..."
docker compose -f docker-compose.prod.yml restart nginx

echo "=== SSL initialization complete! ==="
echo "Your site should now be available at https://$DOMAIN"