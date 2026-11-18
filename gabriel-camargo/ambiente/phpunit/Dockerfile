# PHP 8.3 CLI com as extensoes exigidas pelo OrangeHRM (as mesmas do Dockerfile oficial),
# cliente MariaDB (mysqldump, usado por i:create-test-db), Composer e PCOV (cobertura).
FROM php:8.3-cli-bookworm

RUN set -ex; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        libfreetype6-dev libjpeg-dev libpng-dev libzip-dev libldap2-dev libicu-dev \
        unzip git mariadb-client; \
    docker-php-ext-configure gd --with-freetype --with-jpeg; \
    docker-php-ext-configure ldap --with-libdir=lib/$(uname -m)-linux-gnu/; \
    docker-php-ext-install -j "$(nproc)" gd intl pdo_mysql zip ldap; \
    pecl install pcov; \
    docker-php-ext-enable pcov; \
    echo "memory_limit=1G" > /usr/local/etc/php/conf.d/memory.ini; \
    rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
