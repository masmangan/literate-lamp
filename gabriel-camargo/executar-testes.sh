#!/usr/bin/env bash
# Executa todos os testes da jornada e grava as evidências em resultados/.
# Pré-requisito: ambiente no ar (ver README, seção 1.3). Não interrompe na primeira falha:
# testes que expõem defeitos conhecidos (grupo "defeito", A10/A11, S07) falham por projeto.
set -uo pipefail
cd "$(dirname "$0")"
R=resultados; mkdir -p "$R"
PHPUNIT="docker compose -f ambiente/docker-compose.yml exec -T phpunit ./src/vendor/bin/phpunit"
T=src/plugins/orangehrmAdminPlugin/test/JornadaUsuarios

echo ">> unitários (PHPUnit)"
$PHPUNIT --testdox --log-junit /tmp/unit.xml --group Unit $T > "$R/unitario.txt" 2>&1
docker compose -f ambiente/docker-compose.yml exec -T phpunit cat /tmp/unit.xml > "$R/unitario-junit.xml"
tail -3 "$R/unitario.txt"

echo ">> integração com banco (PHPUnit)"
$PHPUNIT --testdox --log-junit /tmp/int.xml --group Integration $T > "$R/integracao-php.txt" 2>&1
docker compose -f ambiente/docker-compose.yml exec -T phpunit cat /tmp/int.xml > "$R/integracao-php-junit.xml"
tail -3 "$R/integracao-php.txt"

echo ">> integração da API REST (node:test)"
(cd testes/api && npm test) > "$R/integracao-api.txt" 2>&1
grep -E "^ℹ (tests|pass|fail)" "$R/integracao-api.txt"

echo ">> sistema (Playwright)"
(cd testes/sistema && npx playwright test) > "$R/sistema.txt" 2>&1
tail -4 "$R/sistema.txt"
