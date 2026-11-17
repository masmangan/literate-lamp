# Testes de sistema — OrangeHRM / PIM Dependents

Automação **Playwright/JavaScript** com casos ST-01 a ST-07, para o OrangeHRM **local de testes**. Os testes iniciam sessão, criam um funcionário fictício pela API, exercitam o fluxo pela interface e conferem também a persistência. Após cada caso, o funcionário criado é excluído via API.

Os testes da API em `tests/02-api-contrato.spec.js` são classificados como **integração**, não testes de sistema.

## Preparação do ambiente

Da raiz de `literate-lamp`:

```bash
# Deve existir o clone do OrangeHRM em ../orangehrm
HOST_UID=$(id -u) HOST_GID=$(id -g) docker compose -f mateus-neubarth/ambiente/docker-compose.yml up -d db app
```

**Somente na primeira vez**, se a aplicação ainda não estiver instalada, seguindo `mateus-neubarth/docs/ambiente.md`:

```bash
docker compose -f mateus-neubarth/ambiente/docker-compose.yml exec app php installer/cli_install.php
```

Confirme que `http://localhost:8200/web/index.php/auth/login` responde e que `Admin` entra com a senha local configurada no instalador de testes. Se a aplicação já estiver instalada, **não repita o instalador**.

O OrangeHRM `app` é a imagem Docker 5.9, compatível com o commit de origem analisado; **a revisão da imagem não foi aferida por build SHA**, então documente essa diferença entre a instância HTTP e o clone PHPUnit.

## Execução

No Mac, verifique `node --version` e `npm --version`. Se Node não estiver instalado, instale Node LTS (não é necessário instalar PHP/Composer no Mac). Da raiz de `literate-lamp`:

```bash
cd felipe-velasque/sistema
npm install
npx playwright install chromium
npx playwright test --list
npx playwright test tests/01-jornada-dependentes.spec.js
npx playwright test tests/02-api-contrato.spec.js
```

Ou execute tudo e capture a saída:

```bash
cd ../..  # retorne à raiz, se você estava em felipe-velasque/sistema
bash felipe-velasque/scripts/rodar-playwright.sh
```

O relatório JUnit é escrito em `felipe-velasque/resultados/playwright-junit.xml`; os artefatos de falhas ficam em `sistema/test-results/` e `sistema/playwright-report/`, que **não são versionados** (traces podem conter cookies de sessão). As evidências versionadas são o log, o JUnit e o histórico em `resultados/historico/`.

## Casos por nível

- **Sistema (7):** ST-01 CRUD criação + recarga; ST-02 tabela de decisão `Other`; ST-03 campo obrigatório; ST-04 cancelar criação; ST-05 edição; ST-06 exclusão/cancelamento; ST-07 limite 101.
- **Integração REST (3):** IT-API-01 criar/ler/editar; IT-API-02 limite 100/101; IT-API-03 tipo inválido.

## Segurança e limitações

Os testes destroem apenas dados de funcionários fictícios recém-criados. Há uma trava que rejeita hosts diferentes de `localhost`, `127.0.0.1` e `host.docker.internal`; **não mudar a trava para usar demo pública**. Os seletores foram projetados pela leitura dos componentes Vue e ajustados após a execução real.

## Resultado (17/11/2026)

**10 de 10 passaram** (7 sistema + 3 integração REST) na execução final, com Playwright 1.56.1 e Chromium. Duas falhas anteriores eram do próprio teste e foram corrigidas:

- ST-01..ST-04: o botão *Add* tem nome acessível `" Add"` (ícone antes do texto); `exact: true` nunca casava.
- ST-05: o formulário de edição carrega os dados de forma assíncrona e sobrescrevia o nome digitado; o teste agora espera o valor carregado.

Detalhes em `../docs/03-relatorio-execucao.md` e `../resultados/historico/`.
