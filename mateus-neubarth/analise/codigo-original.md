# Análise crítica dos testes do código original: jornada Add Employee

> Repositório `orangehrm/orangehrm`, commit `56e23b3b09e7af29317a0943523b825843fff527` (29/06/2026).
> Escopo: testes que exercitam o cadastro de funcionário (PIM › Add Employee) e as partes que ele usa:
> criação de usuário, política de senha e geração de Employee Id.
> Grade de avaliação: nível, técnica, cobertura, isolamento, oráculo, legibilidade e lacunas.

## 1. Panorama

O OrangeHRM tem três frentes de teste automatizado:

| Frente | Ferramenta | Onde | Relação com a jornada |
|---|---|---|---|
| Back-end | PHPUnit 9 (`phpunit.xml` na raiz, bootstrap `src/test/phpunit/Util/bootstrap.php`) | `src/plugins/*/test/` | **Principal.** Só o plugin PIM tem 537 métodos de teste em 103 arquivos. |
| Front-end | Jest | `src/client/src/**/__tests__/` | Indireta: há testes das regras de validação genéricas, mas nenhum do formulário `SaveEmployee.vue`. |
| E2E | Cypress | `src/test/functional/cypress/e2e/` | **Nenhuma.** As 11 specs cobrem login, Leave e Admin (job titles, categorias, status). PIM não aparece. |

O CI roda os testes em `.github/workflows/test.yml` (PHPUnit) e `cypress.yml`.

Arquivos analisados:

| # | Arquivo de teste | Classe base | Alvo |
|---|---|---|---|
| T1 | `orangehrmPimPlugin/test/Api/EmployeeAPITest.php` + `fixtures/testcases/EmployeeAPITestCases.yml` (seção `Create`) | `EndpointIntegrationTestCase` | `EmployeeAPI::create` e suas regras de validação |
| T2 | `orangehrmPimPlugin/test/Service/EmployeeServiceTest.php` | `TestCase` | `EmployeeService` |
| T3 | `orangehrmPimPlugin/test/Service/EmployeePictureServiceTest.php` | `KernelTestCase` | `EmployeePictureService::saveEmployeePicture`, `pictureSizeAdjust` |
| T4 | `orangehrmCorePlugin/test/Service/IDGeneratorServiceTest.php` | `KernelTestCase` | `IDGeneratorService::getNextID`, `incrementId` |
| T5 | `orangehrmAdminPlugin/test/Api/UserAPITest.php` + `UserAPITestCases.yaml` (seção `Create`) | `EndpointIntegrationTestCase` | `UserAPI::create` (passo A2) |
| T6 | `orangehrmAuthenticationPlugin/test/Service/PasswordStrengthServiceTest.php` | `KernelTestCase` | `checkPasswordPolicies`, `isValidPassword` |
| T7 | `orangehrmAuthenticationPlugin/test/Api/PasswordStrengthValidationAPITest.php` + `PasswordStrengthValidationAPITestCases.yaml` | `EndpointIntegrationTestCase` | política de senha via API |
| T8 | `src/client/src/core/util/validation/__tests__/rules.spec.ts` | Jest | regras de validação do front-end |

(Os caminhos começam em `src/plugins/`, exceto T8.)

## 2. Como funciona o oráculo dos testes de API

Os testes de endpoint (T1, T5, T7) seguem um padrão **orientado a dados**: o método PHP é genérico, e cada
caso é uma entrada no YAML com `body`, usuário logado (`userId`) e o resultado esperado. O resultado pode ser
`data` (resposta), `invalidOnly` (quais parâmetros devem falhar) ou `exception`.

O oráculo fica em `src/test/phpunit/Util/EndpointIntegrationTestCase.php::assertValidTestCase`:

1. Se o caso é inválido, confere que a validação falha **exatamente** nos parâmetros listados.
2. Senão, executa a operação e compara `$result->normalize()` com o `data` esperado (`assertEquals`).
3. Compara `meta`, se houver, e confere que os serviços declarados foram inicializados.

**Consequência:** o oráculo olha **só a resposta** da API. Nenhum caso confere o estado do banco depois da
operação: se a foto foi gravada, se o contador de ID avançou, se o evento de criação foi disparado.

## 3. Avaliação por arquivo

### T1: `EmployeeAPITest` (create)

Casos da seção `Create`: `without body`, `with only first name`, `with ess user id`,
`with only first and last name`, `with all details`, `with all details and emp picture`.

| Critério | Avaliação |
|---|---|
| Nível | **Integração**, apesar de rodar no PHPUnit: usa kernel real, banco de teste com fixtures (`EmployeeAPITest.yml`) e serviços reais (`EmployeeService`, `ConfigService`, `UserService`). |
| Técnica | Particionamento simples: um caso por classe (sem corpo, sem sobrenome, usuário sem permissão, mínimo válido, completo, completo com foto). Não há análise de valor-limite. |
| Cobertura | Cobre o fluxo principal, A1 (foto), A3 (ID manual), E1 (nome vazio) e E9 (sem permissão). **Não cobre** E2 (ID duplicado), E3 (foto inválida) nem E7 (tamanhos máximos). |
| Isolamento | Bom: cada caso recarrega as fixtures (`populateFixtures`) e fixa a data com `registerMockDateTimeHelper`. Os casos não dependem uns dos outros. |
| Oráculo | Fraco para efeitos colaterais. No caso com foto, o esperado é só o JSON do funcionário; não se verifica se a foto foi gravada em `hs_hr_emp_picture` nem se o contador `hs_hr_unique_id` avançou. É justamente onde está o risco **R2**. |
| Legibilidade | Boa: os nomes dos casos dizem a intenção, e o YAML separa dados de código. Por outro lado, o `base64` da foto ocupa linhas enormes no YAML, e a lista de `services` se repete em todo caso. |
| Lacunas | ID duplicado; limites 30/31 e 10/11; foto com tipo inválido; nome do arquivo com mais de 100 caracteres; estado do banco após criar com foto. |

### T2: `EmployeeServiceTest`

| Critério | Avaliação |
|---|---|
| Nível | Unitário/integração (mistura mocks de DAO com chamadas reais). |
| Cobertura | 8 métodos de teste, nenhum sobre a jornada. **`saveNewEmployee()` e `dispatchAddEmployeeEvent()` não têm teste** em nenhum lugar do repositório (busca por esses nomes em `src/plugins/*/test` não retorna nada). |
| Lacunas | O método que incrementa o contador de ID e salva o funcionário não é testado diretamente. |

### T3: `EmployeePictureServiceTest::testSaveEmployeePicture`

| Critério | Avaliação |
|---|---|
| Nível | Unitário, com o DAO mockado. |
| Técnica | Nenhuma técnica de projeto; é um teste de "passa direto" (*pass-through*). |
| Oráculo | **Tautológico:** o mock do DAO devolve o próprio objeto recebido, e o teste confere `instanceof EmpPicture`. Passaria mesmo que o serviço não fizesse nada útil. |
| Ponto positivo | `testPictureSizeAdjust` usa `@dataProvider` com imagens de vários tamanhos: aqui sim há particionamento. |

### T4: `IDGeneratorServiceTest`

| Critério | Avaliação |
|---|---|
| Nível | Unitário, com `IDGeneratorDao` mockado. Bom isolamento. |
| Técnica | `@dataProvider` com 6 combinações de entidade × ID atual. |
| Cobertura | Só testa `getNextID` com `$update = true` (o padrão). O formulário usa `getNextID(Employee::class, false)` (`SaveEmployeeController`), e esse ramo **não é testado**. |
| Valor-limite | Ausente. Para `Employee` só aparecem 4→`0005` e 5→`0006`; faltam as transições de dígito (999→`1000`, 9999→`10000`), onde o `str_pad` muda de comportamento. |
| Oráculo | `testIncrementId` só exige que `updateNextId` seja chamado **uma vez**, sem conferir o argumento. Se o código gravasse `currentId` em vez de `currentId + 1`, o teste continuaria passando. Bastaria `->with(Employee::class, 2)`. |

### T5: `UserAPITest` (create)

Casos: usuário ativo, desativado, funcionário com nome do meio, `empNumber` inexistente, username existente,
papel não atribuível, username existente mas excluído, e OIDC ativo (senha vazia).

| Critério | Avaliação |
|---|---|
| Nível | Integração (mesmo padrão de T1). |
| Técnica | Particionamento bem feito para username (existente, existente-mas-excluído) e papel. Bons casos de borda de negócio. |
| Cobertura | Cobre E4. **Não cobre** os limites de username (4/5/40/41) nem senhas inválidas: todos os casos usam senhas fortes (`Jacqueline@OHRM123`). |
| Oráculo | Igual ao T1: resposta da API; não confere o hash gravado nem o vínculo no banco. |
| Lacunas | O passo A2 da jornada nunca é testado **junto** com a criação do funcionário. A atomicidade (risco **R1**) fica sem teste em qualquer nível. |

### T6 e T7: política de senha

| Critério | T6 `PasswordStrengthServiceTest` | T7 `PasswordStrengthValidationAPITest` |
|---|---|---|
| Nível | Integração (fixtures + `ConfigService` real) | Integração |
| Técnica | 2 entradas avulsas | 10 casos no YAML, organizados por classe: só minúsculas, sem maiúscula, < 8, > 64, vazia, nula, 8 sem número/especial, válida |
| Oráculo | Confere só `$messages[0]`; se surgisse uma segunda mensagem indevida, o teste não perceberia. `assertEquals($messages[0], '…')` está com os argumentos invertidos (o esperado vem primeiro no PHPUnit), o que só piora a mensagem de falha. | Compara a lista completa de mensagens e a força: oráculo forte. |
| Lacunas | – | Nenhum caso com **espaço** na senha (regra `is_spaces_allowed = false`); limites exatos 7/8 e 64/65 não aparecem como pares. |

T7 é o conjunto mais bem projetado da jornada: aplica particionamento de forma explícita e tem oráculo completo.

> Em andamento: as demais avaliações por arquivo e a síntese entram nos próximos commits.

## Fontes

- OrangeHRM, https://github.com/orangehrm/orangehrm, commit `56e23b3b`; arquivos listados na seção 1 e
  `src/test/phpunit/Util/EndpointIntegrationTestCase.php`.
- PHPUnit 9 Manual (`assertEquals`, `@dataProvider`, mocks e `expects()->with()`): https://docs.phpunit.de/en/9.6/
- Uso de IA: leitura dos testes e redação inicial feitas com Claude Code (Claude Opus 5.5), revisadas pelo autor.
