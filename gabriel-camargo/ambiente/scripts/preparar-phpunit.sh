#!/usr/bin/env bash
# Prepara o clone do OrangeHRM para rodar PHPUnit (executar UMA vez, a partir de ambiente/):
#   docker compose up -d db phpunit
#   docker compose exec phpunit bash /scripts/preparar-phpunit.sh
# Reproduz as etapas do CI oficial (.github/workflows/test.yml), sem o build do front-end.
set -euo pipefail
cd /app
composer install -d src --no-interaction --no-progress
composer install -d devTools/core --no-interaction --no-progress
if [ ! -f lib/confs/Conf.php ]; then
  php installer/cli_install.php
fi
php devTools/core/console.php i:create-test-db -p root --dump-options=--ssl=0
echo ">> pronto: docker compose exec phpunit ./src/vendor/bin/phpunit --group JornadaUsuarios --testdox"
