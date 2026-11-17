# Testes de integração — PIM Dependents

**Fontes autorais:**

- `T2Dependents/EmployeeDependentPersistenceIntegrationTest.php` — 8 cenários com **Doctrine + MariaDB** do banco isolado `test_orangehrm_dev`.
- `../sistema/tests/02-api-contrato.spec.js` — 3 cenários de **integração REST HTTP** com API, autenticação e persistência.

## Importante: banco de TESTES

O `setUp()` do PHPUnit executa `TestDataService::populate` que reinicializa tabelas da fixture. Nunca rodar estes testes contra dados reais ou contra o banco da aplicação (`orangehrm_app`). Os testes HTTP criam e removem funcionários fictícios **somente na instalação local**.

## Execução PHP

Da raiz do repositório `literate-lamp`, com o clone `../orangehrm` e contêiner `phpunit` já preparado:

```bash
bash felipe-velasque/scripts/rodar-phpunit.sh
```

O script copia os testes autorais para `../orangehrm/src/plugins/orangehrmPimPlugin/test/T2Dependents/`, executa PHP lint, roda unitários e integração e salva `resultados/phpunit-unitario.txt` e `resultados/phpunit-integracao.txt`.

**Resultado em 17/11/2026:** 8 testes, 30 asserções, **OK** (MariaDB 10.11.19, PHPUnit 9.6.16).

## Execução API HTTP

Suba também a aplicação local do OrangeHRM (serviço `app`) e instale-a, se ainda necessário; veja `../sistema/README.md`. Então:

```bash
cd felipe-velasque/sistema
npm install
npx playwright install chromium
npx playwright test tests/02-api-contrato.spec.js
```

Os testes verificam CRUD, limites de 100/101 caracteres e rejeição de `relationshipType` inválido, com limpeza do funcionário fictício ao final. Não executam na demo pública por proteção explícita no código.

**Resultado em 17/11/2026:** 3 de 3 passaram (`resultados/playwright-junit.xml`).
