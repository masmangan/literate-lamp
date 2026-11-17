#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$HERE/sistema"
export OHRM_BASE_URL="${OHRM_BASE_URL:-http://localhost:8200/web/index.php}"
export OHRM_USER="${OHRM_USER:-Admin}"
# Somente a instância local de testes aceita esta senha de desenvolvimento.
export OHRM_PASSWORD="${OHRM_PASSWORD:-Admin@OHRM123}"
mkdir -p "$HERE/resultados"
node --version
if [ ! -d node_modules ]; then
  npm install
fi
npx playwright install chromium
npx playwright test 2>&1 | tee "$HERE/resultados/playwright-execucao.txt"
