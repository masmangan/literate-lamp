# Análise crítica de testes de terceiros: jornada Add Employee

> Três projetos públicos que automatizam o cadastro de funcionário no OrangeHRM, analisados pela grade
> da disciplina (nível, técnica, cobertura, isolamento, oráculo, legibilidade e lacunas). Todos são testes de
> **sistema (E2E)** que rodam contra um servidor publicado; nenhum tem testes unitários ou de API para a jornada.
> Os riscos R1–R4 e as exceções E1–E9 citados abaixo estão definidos em [`../docs/jornada.md`](../docs/jornada.md).

| ID | Projeto | Stack | Commit analisado | Commits no histórico |
|---|---|---|---|---|
| P1 | [imranc07/orangehrmpom](https://github.com/imranc07/orangehrmpom) | Python, pytest, Selenium, pytest-html | `e174dac1` (21/11/2024) | 11 |
| P2 | [touhid-96/OrangeHRM-Automation-Selenium-TestNG-Project](https://github.com/touhid-96/OrangeHRM-Automation-Selenium-TestNG-Project) | Java, TestNG, Selenium 4.19, Gradle, JavaFaker, Allure | `a7afb74d` (28/10/2024) | 4 |
| P3 | [pavanoltraining/POC_Playwright_MCP_orangehrm](https://github.com/pavanoltraining/POC_Playwright_MCP_orangehrm) | TypeScript, Playwright 1.60, Playwright MCP (testes gerados por IA) | `06dcfc2c` (20/08/2026) | 1 |

## P1: imranc07/orangehrmpom (pytest + Selenium)

Arquivos: `TestScripts/test_OrangeHRM.py`, `PageObject/OrangeHRM.py`, `TestLocators/locators.py`, `TestData/data.py`.

O teste é dividido em seis funções que **dependem da ordem de execução**: `test_start`, `test_login`,
`test_click_pim`, `test_click_add`, `test_add_employee` e `test_shutdown`.

| Critério | Avaliação |
|---|---|
| Nível | Sistema (UI), contra o servidor de demonstração. |
| Técnica | Nenhuma técnica de projeto: um único caminho feliz, com dados fixos (`Angelina Jule Smith`). O README promete "positive and negative scenarios" de login, mas não há nenhum caso negativo. |
| Cobertura | Só o fluxo principal (FP). Nenhum fluxo alternativo (A1–A3) e nenhuma exceção (E1–E9). |
| Isolamento | **Ruim.** O `webdriver.Chrome(...)` é criado como **atributo de classe** (`OrangeHRMAutomation.driver`), na hora do *import*, e cada teste instancia a classe de novo para reaproveitar o mesmo navegador. Os testes só funcionam em sequência: rodar `test_add_employee` sozinho falha. Não há limpeza, e cada execução cria mais um "Angelina Jule Smith" no servidor compartilhado. |
| Oráculo | **Tautológico.** Os métodos do Page Object retornam constantes (`return True` / `return None`), e os testes fazem `assert ... == True`. Se o cadastro falhar no servidor, `test_add_employee` passa do mesmo jeito: nada confere a mensagem "Successfully Saved", a URL de *Personal Details* ou o nome gravado. Uma falha só aparece se o Selenium não encontrar algum elemento. |
| Legibilidade | A separação em `PageObject`, `TestLocators` e `TestData` é didática. Mas os locators são **XPaths absolutos** (`//*[@id="app"]/div[1]/div[2]/.../button[2]`), que quebram com qualquer mudança de layout. Os nomes dos testes descrevem cliques, e não comportamentos. Não há esperas explícitas, só `implicitly_wait(10)`. |
| Lacunas | Oráculo real; independência entre testes; dados únicos; exceções; validação de campos. |

**Veredito:** serve como exemplo de estrutura de Page Object, mas **não testa** o cadastro. Os testes não
conseguem falhar por um defeito funcional.

> Em andamento: os demais projetos, o comparativo e as lições entram nos próximos commits.

## Fontes

- imranc07, *OrangehrmPOM*, https://github.com/imranc07/orangehrmpom (commit `e174dac1`).
- touhid-96, *OrangeHRM-Automation-Selenium-TestNG-Project*,
  https://github.com/touhid-96/OrangeHRM-Automation-Selenium-TestNG-Project (commit `a7afb74d`).
- pavanoltraining, *POC_Playwright_MCP_orangehrm*, https://github.com/pavanoltraining/POC_Playwright_MCP_orangehrm
  (commit `06dcfc2c`).
- OrangeHRM, política de senha padrão: `installer/Migration/V5_4_0/Migration.php`, commit `56e23b3b` de
  https://github.com/orangehrm/orangehrm.
- Playwright, *Locators* (boas práticas): https://playwright.dev/docs/locators
- Uso de IA: busca do projeto P3, leitura dos repositórios e redação inicial feitas com Claude Code
  (Claude Opus 5.5), revisadas pelo autor.
