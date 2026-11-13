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

## P2: touhid-96 (Java + TestNG + Selenium)

Arquivos: `src/test/java/TestRunners/PIMTestRunner.java`, `Pages/PIMPage.java`, `Config/Setup.java`,
`Utils/PasswordGenerator.java`, `Utils/Utils.java`.

O projeto tem dois testes de PIM: `createEmployeeWithShortPass` (priority 1) e `createEmployee` (priority 2).
Os dois exercitam o fluxo A2 (com login).

| Critério | Avaliação |
|---|---|
| Nível | Sistema (UI), contra o servidor de demonstração. |
| Técnica | Há um par **válido/inválido** para o tamanho da senha (6 caracteres × 8 caracteres), o que é um começo de particionamento e de análise de limite. Os dados vêm do JavaFaker, e as senhas de um gerador que garante maiúscula, minúscula, número e caractere especial (`PasswordGenerator.checkPass`). |
| Cobertura | FP + A2 e E6 (senha curta). Não cobre E1–E5, E7 e E8, nem foto (A1) ou ID manual (A3). O README descreve um cenário bem maior (buscar pelo ID, Directory, login como o novo usuário, *My Info*, tipo sanguíneo, suíte de *smoke*), mas o código só implementa os 2 testes de PIM e 3 de login. |
| Isolamento | Médio. O `@BeforeTest` abre um navegador e faz login uma vez para a classe inteira, e os testes dependem de `priority`. O primeiro termina com o formulário preenchido e **sem salvar**; o segundo só funciona porque clica no menu PIM de novo. O teste positivo grava o funcionário em `src/test/resources/employees.json` para uso posterior: um **estado compartilhado em arquivo versionado**. Não há exclusão dos funcionários criados. |
| Oráculo | Melhor que P1, mas com problemas: (1) o caso positivo só confere o título "Personal Details"; não confere o nome nem se o usuário foi realmente criado (o que é relevante para o risco R1). (2) **O caso negativo está desatualizado:** ele espera o texto `"Should have at least 7 characters"`, mas a política padrão do OrangeHRM 5.4+ exige 8 (`installer/Migration/V5_4_0/Migration.php`), então a mensagem esperada hoje é "Should have at least 8 characters" e o teste **deve falhar contra a configuração padrão atual** (a confirmar no servidor de demonstração durante a execução). O oráculo foi copiado do comportamento observado numa versão antiga, e não de uma especificação. (3) **O caso positivo também deve falhar hoje:** ele usa `PasswordGenerator.generatePassword(8)`, e nenhuma senha de 8 caracteres atinge a força mínima `strong` da configuração padrão (defeito D2 em `docs/defeitos.md`). |
| Legibilidade | Boa intenção (Page Factory e `description` em cada `@Test`), mas os locators são **posicionais**: `txtFields.get(5)`, `buttons.get(2)`, `menuItems.get(1)`, `findElements(By.className("oxd-input")).get(4)`. Para saber que `get(5)` é o username, é preciso abrir a página. `createEmployee` e `createEmployeeFail` são quase idênticos (só muda o clique em Save). Há `Thread.sleep(2000)` misturado com `WebDriverWait` de 50 s. |
| Reprodutibilidade | O README manda rodar com `-PsuiteName="masterRegressionSuite"`, mas não há nenhum XML de suíte TestNG no repositório e o `build.gradle` ignora `suiteName`. As propriedades `username`/`password` são repassadas, mas os testes usam `"Admin"`/`"admin123"` fixos. |
| Detalhes de código | `random.nextInt(charSet.length()-1)` nunca sorteia o último caractere do conjunto (`/`). `Utils.getFakerInfo()` é chamado três vezes, então o username (`nome.sobrenome`) não corresponde ao nome do funcionário cadastrado. |
| Lacunas | Oráculo baseado na especificação; verificação do usuário criado; limites exatos (7/8); exceções E1–E5; limpeza de dados. |

**Veredito:** é o projeto que mais se aproxima da nossa jornada (cobre o fluxo com login e um caso negativo),
mas a fragilidade dos locators e o oráculo desatualizado mostram o custo de testar sem uma especificação.

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
