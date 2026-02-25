#!/bin/bash
set -e

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

if [ -z "$JWT_PASSPHRASE" ]; then
    echo "Error: JWT_PASSPHRASE must be set in .env"
    exit 1
fi

echo "=== Generating JWT keys ==="

# Create jwt directory in the php container
docker compose -f docker-compose.prod.yml exec php mkdir -p config/jwt

# Generate private key
echo "Generating private key..."
docker compose -f docker-compose.prod.yml exec php openssl genpkey \
    -out config/jwt/private.pem \
    -aes256 \
    -algorithm rsa \
    -pkeyopt rsa_keygen_bits:4096 \
    -pass pass:$JWT_PASSPHRASE

# Generate public key
echo "Generating public key..."
docker compose -f docker-compose.prod.yml exec php openssl pkey \
    -in config/jwt/private.pem \
    -out config/jwt/public.pem \
    -pubout \
    -passin pass:$JWT_PASSPHRASE

# Set permissions
docker compose -f docker-compose.prod.yml exec php chown -R www-data:www-data config/jwt
docker compose -f docker-compose.prod.yml exec php chmod 600 config/jwt/private.pem
docker compose -f docker-compose.prod.yml exec php chmod 644 config/jwt/public.pem

echo "=== JWT keys generated successfully! ==="