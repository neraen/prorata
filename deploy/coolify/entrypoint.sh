#!/bin/sh
set -eu
test -r "$JWT_SECRET_KEY" || { echo 'Restore the private JWT key before starting.' >&2; exit 1; }
test -r "$JWT_PUBLIC_KEY" || { echo 'Restore the public JWT key before starting.' >&2; exit 1; }
# Warm the cache with runtime secrets. Never run database migrations here.
php bin/console cache:clear --env=prod --no-debug --no-interaction
exec docker-php-entrypoint "$@"
