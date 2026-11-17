#!/usr/bin/env bash
set -euo pipefail

# Copia testes autorais para o clone do OrangeHRM e executa usando o contêiner
# criado pela turma. Nunca executar contra banco de produção.
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SELF="$REPO_ROOT/felipe-velasque"
OHRM_SRC="${OHRM_SRC:-$(cd "$REPO_ROOT/../orangehrm" && pwd)}"
export OHRM_SRC
export HOST_UID="$(id -u)" HOST_GID="$(id -g)"
COMPOSE="$REPO_ROOT/mateus-neubarth/ambiente/docker-compose.yml"
TEST_DST="$OHRM_SRC/src/plugins/orangehrmPimPlugin/test/T2Dependents"
mkdir -p "$TEST_DST" "$SELF/resultados"
cp "$SELF/unitario/T2Dependents/EmpDependentAndServiceUnitTest.php" "$TEST_DST/"
cp "$SELF/integracao/T2Dependents/EmployeeDependentPersistenceIntegrationTest.php" "$TEST_DST/"

echo "Fonte OrangeHRM: $(git -C "$OHRM_SRC" rev-parse HEAD 2>/dev/null || echo 'revisao desconhecida')"
echo 'Banco de testes isolado: test_orangehrm_dev (não executar contra produção).'
DOCKER=(docker compose -f "$COMPOSE")
"${DOCKER[@]}" exec -T phpunit php -l \
  /app/src/plugins/orangehrmPimPlugin/test/T2Dependents/EmpDependentAndServiceUnitTest.php
"${DOCKER[@]}" exec -T phpunit php -l \
  /app/src/plugins/orangehrmPimPlugin/test/T2Dependents/EmployeeDependentPersistenceIntegrationTest.php

echo '>> Testes unitários autorais'
"${DOCKER[@]}" exec -T phpunit ./src/vendor/bin/phpunit -c phpunit.xml \
  src/plugins/orangehrmPimPlugin/test/T2Dependents/EmpDependentAndServiceUnitTest.php \
  --testdox --colors=never 2>&1 | tee "$SELF/resultados/phpunit-unitario.txt"

echo '>> Testes de integração com banco de dados autorais'
"${DOCKER[@]}" exec -T phpunit ./src/vendor/bin/phpunit -c phpunit.xml \
  src/plugins/orangehrmPimPlugin/test/T2Dependents/EmployeeDependentPersistenceIntegrationTest.php \
  --testdox --colors=never 2>&1 | tee "$SELF/resultados/phpunit-integracao.txt"

echo '>> Concluído: conferir contagens e avisos; atualizar relatório de execução.'
