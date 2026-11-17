# Relatório da execução dos testes — T2 OrangeHRM / PIM Dependents

**Data das execuções:** 17/11/2026 (Mac do estudante).  
**Responsável:** autor da pasta `felipe-velasque/` no repositório da turma.  
**Referência GitHub:** [PR #31](https://github.com/masmangan/literate-lamp/pull/31); Issues em `../issues/roteiro.md`.  
**Código analisado (PHPUnit):** clone `orangehrm/orangehrm` no commit `56e23b3b09e7af29317a0943523b825843fff527`.  
**Aplicação HTTP (Playwright):** imagem Docker `orangehrm/orangehrm:5.9` em `http://localhost:8200`.

## 1. Ambiente

| Item | Versão |
|---|---|
| Sistema operacional | macOS (Darwin 24.6.0, Apple Silicon) |
| Docker | 29.9.3 (Docker Compose do ambiente `mateus-neubarth/ambiente/docker-compose.yml`) |
| Banco de dados | MariaDB 10.11.19 (contêiner `db`; banco isolado `test_orangehrm_dev` para PHPUnit) |
| PHP / PHPUnit | PHP 8.3 no contêiner `phpunit`; PHPUnit 9.6.16 |
| Node.js / Playwright | Node 22.23.2; `@playwright/test` 1.56.1; navegador Chromium |

## 2. Resultados

Todos os números abaixo foram conferidos nos logs da pasta `resultados/` antes de registrados.

### 2.1 Testes autorais

| Nível | Arquivo | Testes | Asserções | Resultado | Evidência |
|---|---|---:|---:|---|---|
| Unitário | `unitario/T2Dependents/EmpDependentAndServiceUnitTest.php` | 9 | 13 | **OK** | `resultados/phpunit-unitario.txt` |
| Integração (Doctrine + MariaDB) | `integracao/T2Dependents/EmployeeDependentPersistenceIntegrationTest.php` | 8 | 30 | **OK** | `resultados/phpunit-integracao.txt` |
| Integração (API REST) | `sistema/tests/02-api-contrato.spec.js` | 3 | — | **3 passaram** | `resultados/playwright-execucao.txt`, `resultados/playwright-junit.xml` |
| Sistema (UI + API + banco) | `sistema/tests/01-jornada-dependentes.spec.js` | 7 | — | **7 passaram** | mesmos arquivos |

**Total autoral:** 27 testes, todos aprovados na execução final (9 unitários, 8 de integração com banco, 3 de integração REST, 7 de sistema). O Playwright não contabiliza asserções como o PHPUnit, por isso a coluna fica vazia. O JUnit final registra `tests="10" failures="0" skipped="0" errors="0"`.

### 2.2 Testes originais do OrangeHRM (mesmo módulo)

| Arquivo original | Testes | Asserções | Resultado | Evidência |
|---|---:|---:|---|---|
| `test/Entity/EmpDependentTest.php` | 1 | 5 | **OK** | `resultados/phpunit-entidade-original.txt` |
| `test/Service/EmployeeDependentServiceTest.php` | 6 | 20 | **OK** | `resultados/phpunit-servico-original.txt` |
| `test/Dao/EmployeeDependentDaoTest.php` | 9 | 28 | **OK, mas 9 risky** | `resultados/phpunit-dao-original.txt` |

Total original: 16 testes, 53 asserções. **7 OK e 9 risky**, portanto não é correto declarar os 16 como completamente aprovados.

**Por que o DAO original é *risky*:** o PHPUnit registra `Creation of dynamic property ...EmployeeDependentDaoTest::$fixture is deprecated` na linha 46 do teste original. O `setUp` atribui `$this->fixture` sem declarar a propriedade, o que gera aviso de depreciação a partir do PHP 8.2. Nenhuma asserção falhou. **Classificação:** risco de manutenção e compatibilidade da suíte de testes, **não** defeito funcional do módulo Dependents. O código original não foi alterado para esconder o aviso.

## 3. Histórico das execuções com falha

As falhas intermediárias foram preservadas em `resultados/historico/` (detalhes em `resultados/historico/README.md`).

| Execução | Resultado | Causa | Natureza | Correção |
|---|---|---|---|---|
| 1 (≈15:23) | 6 passaram, 4 falharam (ST-01..ST-04, timeout 60 s) | O nome acessível do botão **Add** é `" Add"` (glifo do ícone antes do texto); `exact: true` nunca casava | Defeito do **teste** | Seletor `{name: /\bAdd$/}` |
| 2 (≈15:26) | 9 passaram, 1 falhou (ST-05) | O formulário de edição carrega o registro de forma assíncrona e sobrescrevia o nome digitado | Defeito do **teste** (condição de corrida; ST-05 passou na execução 1) | Esperar o campo exibir o valor carregado antes de editar |
| 3 a 6 | 10/10 nas quatro execuções | — | — | — |

A execução 6, via `scripts/rodar-playwright.sh`, gerou as evidências finais. O JUnit original da execução 1 foi mantido sem edição. O log da execução 2 não foi salvo em arquivo; o trecho relevante foi transcrito da sessão de depuração e isso está indicado no histórico.

## 4. Defeitos

**Nenhum defeito funcional do OrangeHRM foi confirmado na jornada Dependents.** As duas falhas observadas eram do código de teste e foram corrigidas e reexecutadas.

| ID | Observação | Classificação |
|---|---|---|
| OBS-01 | Suíte DAO original: 9 testes *risky* por propriedade dinâmica `$fixture` (PHP 8.2+) | Dívida técnica da suíte de testes original; não é defeito do produto |
| OBS-02 | O formulário "Edit Dependent" aceita digitação antes de terminar de carregar, e o carregamento sobrescreve o que foi digitado | Observação de usabilidade, só reproduzida por automação; não registrada como defeito |

Modelo para eventual defeito confirmado: `ID; Issue; ambiente/versão; data; pré-condições; passos; entrada; resultado esperado; resultado observado; evidência; severidade; status; teste de regressão`.

## 5. Como reproduzir

Da raiz de `literate-lamp`, com o clone em `../orangehrm` e os contêineres do ambiente da turma ativos:

```bash
bash felipe-velasque/scripts/rodar-phpunit.sh
```

```bash
bash felipe-velasque/scripts/rodar-playwright.sh
```

O primeiro gera `phpunit-unitario.txt` e `phpunit-integracao.txt`; o segundo gera `playwright-execucao.txt` e `playwright-junit.xml`. Os testes originais foram executados com:

```bash
docker compose -f mateus-neubarth/ambiente/docker-compose.yml exec -T phpunit ./src/vendor/bin/phpunit -c phpunit.xml src/plugins/orangehrmPimPlugin/test/Dao/EmployeeDependentDaoTest.php
```

(trocando o caminho para `Entity/EmpDependentTest.php` e `Service/EmployeeDependentServiceTest.php`).

## 6. Limitações e riscos

1. PHPUnit roda contra o clone no commit registrado; a interface HTTP usa a imagem `orangehrm/orangehrm:5.9`. As duas são a versão 5.9, mas não foi verificado que o SHA da imagem coincide com o commit do clone.
2. As fixtures do PHPUnit reinicializam tabelas: executar **somente** no banco de testes.
3. Os testes Playwright criam e excluem funcionários fictícios na instância local; uma trava no código impede execução contra a demo pública.
4. **Cobertura de código não foi medida.** Nenhum percentual é declarado.
5. Casos planejados sem implementação (autorização de outro usuário, data inválida na UI, nome com 99 caracteres, `Other` sem especificação pela API) estão listados em `02-plano-de-testes.md` como lacunas.

## 7. Uso de IA

- **ChatGPT (OpenAI):** planejamento, análise estática do código, rascunho dos casos de teste, primeira versão dos testes e scripts, redação inicial dos documentos.
- **Claude Code (Anthropic, modelo Claude Opus 5.5):** depuração das duas falhas do Playwright e correção dos testes, reexecução das suítes com registro dos logs, preservação do histórico de falhas, atualização dos relatórios e organização dos commits.

Os resultados foram obtidos por execução real no Mac do estudante; nenhum número foi estimado. A revisão final e a responsabilidade pela entrega são do autor.
