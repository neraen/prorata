FROM php:8.4-fpm-alpine
RUN apk add --no-cache icu-dev libzip-dev unzip openssl \
    && docker-php-ext-install -j2 intl opcache pdo_mysql zip
COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer
WORKDIR /var/www/html
ENV APP_ENV=prod APP_DEBUG=0
COPY backend/composer.json backend/composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction
COPY backend/ ./
RUN printf 'APP_ENV=prod\nAPP_DEBUG=0\n' > .env \
    && composer dump-autoload --no-dev --classmap-authoritative --no-scripts \
    && mkdir -p var/cache var/log \
    && chown -R www-data:www-data var \
    && printf 'opcache.enable=1\nopcache.validate_timestamps=0\nopcache.memory_consumption=128\nexpose_php=Off\ndisplay_errors=Off\nlog_errors=On\n' > /usr/local/etc/php/conf.d/prorata.ini
COPY deploy/coolify/entrypoint.sh /usr/local/bin/prorata-entrypoint
COPY deploy/coolify/readiness.php /usr/local/share/prorata-readiness.php
RUN chmod 755 /usr/local/bin/prorata-entrypoint
USER www-data
EXPOSE 9000
ENTRYPOINT ["prorata-entrypoint"]
CMD ["php-fpm", "-F"]
