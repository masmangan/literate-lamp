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

> Em andamento: as seções de avaliação por arquivo e a síntese entram nos próximos commits.

## Fontes

- OrangeHRM, https://github.com/orangehrm/orangehrm, commit `56e23b3b`; arquivos listados na seção 1 e
  `src/test/phpunit/Util/EndpointIntegrationTestCase.php`.
- PHPUnit 9 Manual (`assertEquals`, `@dataProvider`, mocks e `expects()->with()`): https://docs.phpunit.de/en/9.6/
- Uso de IA: leitura dos testes e redação inicial feitas com Claude Code (Claude Opus 5.5), revisadas pelo autor.
