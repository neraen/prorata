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

# Check if Let's Encrypt certs already exist
if docker compose -f docker-compose.prod.yml run --rm certbot certificates 2>/dev/null | grep -q "$DOMAIN"; then
    echo "Let's Encrypt certificate already exists for $DOMAIN"
    echo "Copying existing certificates..."

    # Copy certs from certbot volume to nginx/ssl
    docker compose -f docker-compose.prod.yml run --rm \
        -v "$(pwd)/nginx/ssl:/output" \
        --entrypoint "" \
        certbot sh -c "cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem /output/ && cp /etc/letsencrypt/live/$DOMAIN/privkey.pem /output/ && chmod 644 /output/*.pem"

    echo "Restarting nginx..."
    docker compose -f docker-compose.prod.yml restart nginx
    echo "=== SSL ready! ==="
    exit 0
fi

# Generate temporary self-signed certificate for initial nginx startup
echo "Generating temporary self-signed certificate..."
openssl req -x509 -nodes -newkey rsa:2048 \
    -keyout nginx/ssl/privkey.pem \
    -out nginx/ssl/fullchain.pem \
    -days 1 \
    -subj "/CN=$DOMAIN" 2>/dev/null

echo "Starting nginx with temporary certificate..."
docker compose -f docker-compose.prod.yml up -d nginx

echo "Waiting for nginx to start..."
sleep 5

# Test if nginx is responding
if ! curl -s -o /dev/null -w "%{http_code}" http://localhost/.well-known/acme-challenge/test 2>/dev/null | grep -q "404\|200"; then
    echo "Warning: nginx might not be responding correctly"
fi

echo "Requesting Let's Encrypt certificate for $DOMAIN..."
echo "Make sure your DNS A record points to this server!"
echo ""

# Request certificate
docker compose -f docker-compose.prod.yml run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$LETSENCRYPT_EMAIL" \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    -d "$DOMAIN"

echo "Copying Let's Encrypt certificates to nginx..."
docker compose -f docker-compose.prod.yml run --rm \
    -v "$(pwd)/nginx/ssl:/output" \
    --entrypoint "" \
    certbot sh -c "cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem /output/ && cp /etc/letsencrypt/live/$DOMAIN/privkey.pem /output/ && chmod 644 /output/*.pem"

echo "Restarting nginx with Let's Encrypt certificate..."
docker compose -f docker-compose.prod.yml restart nginx

echo ""
echo "=== SSL initialization complete! ==="
echo "Your site should now be available at https://$DOMAIN"
echo ""
echo "To verify: curl -I https://$DOMAIN"
