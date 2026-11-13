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

### T8: `rules.spec.ts` (Jest)

| Critério | Avaliação |
|---|---|
| Nível | Unitário (funções puras). |
| Técnica | Boa: para `required`, por exemplo, testa string vazia, só espaços, quebra de linha, número, array e objeto. |
| Cobertura | 171 testes, mas **nenhum** para as quatro regras usadas no formulário: `shouldNotExceedCharLength`, `shouldNotLessThanCharLength`, `maxFileSize` e `validFileTypes`. |
| Lacunas | O componente `SaveEmployee.vue` (encadeamento das duas requisições, reset do formulário, navegação) não tem teste. O limite de 1 MB da foto também é validado na API (regra `Base64Attachment`), mas nenhum teste original exercita esse limite; o nosso IT-07 cobre 1 MB - 1, 1 MB e 1 MB + 1. |

## 4. Síntese

| Critério | Situação geral |
|---|---|
| Nível | Muito teste de **integração de endpoint** (chamado de "unitário" por rodar no PHPUnit) e poucos unitários puros. **Nenhum** teste de sistema da jornada. |
| Técnica | Particionamento presente, mas sem análise de valor-limite. As exceções são as de T5 e T7. |
| Cobertura | Fluxo principal e erros básicos cobertos. Faltam ID duplicado, foto inválida, limites de tamanho e a combinação funcionário + login. |
| Isolamento | Bom na maioria dos testes (fixtures recarregadas por caso, data fixada, mocks), mas **há dependência de ordem/estado** entre `CustomFieldDaoTest` e `CustomFieldAPITest`: a suíte do PIM falha na 2ª execução sem recriar o banco. |
| Oráculo | O ponto mais fraco. Comparar só a resposta da API esconde efeitos colaterais, e há testes tautológicos (T3) ou sem verificação de argumento (T4). |
| Legibilidade | Boa nos testes orientados a dados (YAML com nomes descritivos); o custo é a duplicação de configuração em todos os casos. |

### Evidência da execução

Os testes foram executados no ambiente local (`docs/ambiente.md`, seção 9). A suíte do PIM passou inteira
(674 testes), e as classes da jornada têm cobertura alta: **99,66% das linhas de `EmployeeAPI`** e **100% de
`IDGeneratorService`**. Mesmo assim, o risco R2 continua sem verificação. Isso confirma, com números, a
conclusão sobre o oráculo: cobertura mede o que é executado, não o que é conferido.

### Isolamento: a suíte do PIM não é repetível

Ao rodar a suíte do PIM pela segunda vez, `CustomFieldAPITest::testDelete` falhou sem nenhuma mudança no
código. A investigação mostrou uma **dependência de ordem e de estado** entre testes originais:

1. `CustomFieldAPITest::testDelete` mocka o DAO só parcialmente: `getExistingCustomFieldIds()` é real e consulta
   o banco. O teste só passa se **não existir** campo customizado com id 1.
2. `CustomFieldDaoTest` insere campos customizados ("Age", "Medium", "Level"...) e não os remove.
3. Na primeira execução sobre um banco recém-criado, `Api/` roda antes de `Dao/` e tudo passa. Da segunda vez
   em diante, os registros deixados pelo DAO já estão lá e o teste da API falha.

Reprodução (12/11/2026): recriar o banco de testes → `CustomFieldAPITest` passa (14 testes) → rodar
`CustomFieldDaoTest` (passa e deixa 6 linhas em `hs_hr_custom_fields`) → `CustomFieldAPITest` de novo:
**2 falhas**. É uma violação do princípio de independência dos testes: o resultado depende da ordem e do que
execuções anteriores deixaram no banco. O CI do projeto não percebe porque sempre parte de um banco novo.

### Lacunas que nossos testes vão cobrir

| Lacuna | Caso planejado (`docs/casos-de-teste.md`) |
|---|---|
| Contador de ID não verificado no create com foto (R2) | UT-05, IT-12, ST-12 |
| `getNextID(..., false)` e transições de dígito | UT-07 |
| Limites de nome (30/31) e de ID (10/11) | UT-01, UT-03, IT-03, ST-11 |
| ID duplicado | UT-03, IT-04, ST-06 |
| Foto com tipo inválido / acima de 1 MB | UT-04, IT-06, IT-07, ST-07 |
| Senha com espaço; oráculo com lista completa | UT-08, IT-10 |
| Funcionário + login juntos; atomicidade (R1) | IT-08, IT-11, ST-03 |
| Jornada de ponta a ponta pela interface | ST-01..ST-13 |

## Fontes

- OrangeHRM, https://github.com/orangehrm/orangehrm, commit `56e23b3b`; arquivos listados na seção 1 e
  `src/test/phpunit/Util/EndpointIntegrationTestCase.php`.
- PHPUnit 9 Manual (`assertEquals`, `@dataProvider`, mocks e `expects()->with()`): https://docs.phpunit.de/en/9.6/
- Uso de IA: leitura dos testes e redação inicial feitas com Claude Code (Claude Opus 5.5), revisadas pelo autor.
