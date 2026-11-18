# 1. Análise crítica dos testes existentes — Admin › User Management

> Issue #61 · Autor: Gabriel Camargo · Código analisado: `orangehrm/orangehrm`, commit `56e23b3` (OrangeHRM 5.9)

Escopo: tudo o que já testa o **gerenciamento de usuários do sistema** (tela *Admin › User Management*,
endpoint `/api/v2/admin/users`, classes `UserAPI`, `UserService`, `UserDao`, regra `Password` e
`PasswordStrengthService`), no repositório original e em material de terceiros.

Critérios usados (os mesmos da disciplina):

| Critério | Pergunta |
|---|---|
| Nível | unitário, integração ou sistema? O nível declarado é o nível real? |
| Técnica de projeto | os casos vêm de partição de equivalência, valor-limite, tabela de decisão, ou são "exemplos"? |
| Oráculo | o teste verifica um resultado esperado preciso? |
| Independência / repetibilidade | o teste depende de ordem, de dados externos ou de tempo? |
| Cobertura da jornada | criação, busca, edição, desativação e exclusão estão cobertas? E os caminhos de erro? |

---

## 1.1 Testes do código original

### Inventário

| Arquivo | Tipo | Nº de testes | O que cobre |
|---|---|---|---|
| `orangehrmAdminPlugin/test/Service/UserServiceTest.php` | unitário (dublês de `UserDao` e `PasswordHash`) | 12 | `saveSystemUser`, `isCurrentPassword`, `getCredentials` (hash novo, hash MD5 antigo, senha errada), `getUndeletableUserIds` |
| `orangehrmAdminPlugin/test/Dao/UserDaoTest.php` | integração com banco (fixture `SystemUser.yml`) | 12 | gravação, busca por id, usuários excluídos, papéis atribuíveis, status por nome |
| `orangehrmAdminPlugin/test/Api/UserAPITest.php` + `fixtures/testcases/UserAPITestCases.yaml` | integração API → Service → Dao → banco | 4 métodos, **24 casos** em YAML (27 execuções) | GetAll (9), GetOne (3), Create (8), Update (4) |
| `orangehrmAuthenticationPlugin/test/Service/PasswordStrengthServiceTest.php` | integração (lê a política do banco) | 7 | `checkPasswordPolicies` e `isValidPassword` com **apenas duas senhas** (`Admin123`, `Admin@OHRM123`) |
| `src/client/**/__tests__/*.spec.ts` (Jest) | unitário de front-end | 6 arquivos | só utilitários (`rules.spec.ts`, datas, url…); **nenhum** sobre as telas de usuário |
| `src/test/functional/cypress/**` | sistema (E2E) | — | login, job titles, employment status, leave… **nenhum** teste de *User Management* |

Execução no ambiente local (ver [README](../README.md)): `UserAPITest` 27/27, `UserServiceTest` 12/12 e
`UserDaoTest` 12/12 passam (saída em [`resultados/originais.txt`](../resultados/originais.txt)).

### Pontos fortes

* **Testes de API dirigidos por dados.** O `UserAPITestCases.yaml` descreve cada caso como
  *entrada (body/query) → saída esperada (data/meta)* ou `invalidOnly: [campo]`. É uma forma
  declarativa e legível de tabela de casos; o oráculo é exato (compara o JSON inteiro).
* **Casos negativos relevantes** em Create/Update: `empNumber` inexistente, nome de usuário repetido,
  papel não atribuível (`Supervisor`), nome repetido de usuário *excluído* (que deve ser aceito) e
  OIDC habilitado (senha deixa de ser obrigatória).
* **Isolamento**: cada caso recarrega as fixtures (`populateFixtures`) e usa relógio simulado
  (`registerMockDateTimeHelper`), então os testes são repetíveis e independentes de ordem.
* `UserServiceTest` usa dublês e cobre o caminho de migração de hash MD5 → bcrypt, um ponto de risco real.

### Fragilidades

1. **`delete` da `UserAPI` não tem nenhum caso.** A regra que impede excluir o próprio usuário
   (`getUndeletableUserIds` + `Rules::NOT_IN`) só é testada no service; a validação completa do endpoint
   (`ids` vazios, id inexistente → 404, id do usuário logado → 422) não é exercitada.
2. **Sem análise de valor-limite.** O nome de usuário tem limites `[5, 40]` (`UserService::USERNAME_MIN_LENGTH`
   e `MAX_LENGTH`) e a senha tem máximo 64 na API; nenhum caso testa 4/5/40/41 caracteres nem 64/65.
   Todos os casos de Create usam nomes "normais" (`Jacqueline`, `Linda`).
3. **Política de senha mal particionada.** `PasswordStrengthServiceTest` usa duas senhas e verifica só a
   primeira mensagem (`$messages[0]`); as sete regras (mínimo, máximo, minúsculas, maiúsculas, números,
   especiais, espaços) nunca são isoladas, e nenhum limite (7/8 caracteres) é testado. No contexto do usuário, os casos de Create usam
   senhas fortes (`Jacqueline@OHRM123`); não há caso "senha sem número", "senha com espaço",
   "senha com 7 caracteres" para o endpoint de usuários. Uma mudança que desligasse a regra `Password`
   no `UserAPI` não quebraria nenhum teste de API.
4. **Espaços em branco não são considerados.** Nenhum caso cobre nome de usuário só com espaços ou com
   espaços nas pontas. Essa lacuna esconde dois defeitos ([D1 e D2 no relatório de execução](03-relatorio-execucao.md#33-defeitos-encontrados)).
5. **Front-end e jornada sem teste.** O formulário Vue (`SaveSystemUser.vue`, `EditSystemUser.vue`)
   tem validações próprias (obrigatórios, tamanho, confirmação de senha, verificação assíncrona de nome
   repetido em `/api/v2/admin/validation/user-name`) que **não têm teste algum** — nem Jest, nem Cypress.
   Também não há teste do efeito de *desativar* um usuário no login.
6. **Nome enganoso.** `UserAPITest` estende `EndpointIntegrationTestCase` e grava no banco: é teste de
   integração, mas fica junto com os unitários na mesma suíte `Admin` e não há separação por grupo.

---

## 1.2 Material de terceiros

O OrangeHRM é muito usado em cursos de automação, e há dezenas de repositórios públicos que
usam o servidor de demonstração. Foram analisados três representativos que tratam do *User Management*:

### (a) `tanzinatoma/orangeHRMSelenium` — Selenium + TestNG (Java)
Fonte: <https://github.com/tanzinatoma/orangeHRMSelenium> (`src/test/java/tests/admin/AddUserTests.java`,
`UserEditDeleteTests.java`).

* `create_admin()` preenche e salva o formulário, mas **não tem nenhuma asserção** depois de `save_user()`:
  o teste passa mesmo que o usuário não seja criado. Não há oráculo.
* A senha vem de `faker.internet().password()`, que pode não satisfazer a política de senha do OrangeHRM
  (exige maiúscula, número e caractere especial) → **teste não determinístico**.
* Testes encadeados por `priority` (login → criar → buscar → editar): falha em um contamina os demais.
* `Thread.sleep(3000)` em vez de esperas por condição; caminho absoluto da máquina do autor no relatório;
  `delete_user` está com `enabled = false`.

### (b) `code-pace/playwright-orangeHrm` — Playwright (TypeScript), UI e API
Fonte: <https://github.com/code-pace/playwright-orangeHrm> (`e2e/tests/admin.spec.ts`, `api/tests/userApi.spec.ts`).

* Bom uso de `storageState` (login uma vez) e de `page.waitForResponse` para sincronizar com a API.
* "Verify user can create an employee" usa `faker.person.firstName()` como nome de usuário: nomes com
  menos de 5 letras (`Ana`, `Lee`) são rejeitados pela regra de tamanho → **teste intermitente**.
  Também não remove o usuário criado (polui o servidor compartilhado).
* Nos filtros por papel, `admin.checkValueExists('Admin')` é chamado **sem `await`**: a asserção pode nunca ser avaliada.
* No teste de API, `expect(user.status).toBe(1)` e `expect(user.userRoleId)` não batem com o contrato real
  (a API devolve `status: true` e `userRole.id`), e as asserções estão dentro de `if (body.data.length > 0)`:
  se o filtro não devolver nada, o teste passa vacuamente.

### (c) `ManarBedeir/OrangeHRM-SeleniumJava` e roteiros manuais (marinaincodeland)
Fontes: <https://github.com/ManarBedeir/OrangeHRM-SeleniumJava>,
<https://marinaincodeland.github.io/OrangeHRM_TestCases/html/admin-functionality.html>.

* Os roteiros manuais listam bons cenários negativos (nome repetido, senhas diferentes), mas são descritos
  como passos, sem dados concretos nem resultados esperados mensuráveis.
* A automação Java cobre o fluxo "Add user" com Page Objects, porém só pela UI e só no servidor de demonstração,
  que é compartilhado e reiniciado periodicamente — os dados (ex.: o funcionário escolhido) mudam e os testes quebram.

### Síntese

| Aspecto | Original | Terceiros |
|---|---|---|
| Nível predominante | integração (API + banco) | sistema (UI) |
| Técnica | exemplos + alguns negativos | exemplos, quase nunca negativos |
| Oráculo | exato (JSON) | fraco ou ausente |
| Repetibilidade | alta (fixtures, relógio simulado) | baixa (demo compartilhado, dados aleatórios, `sleep`) |
| Lacunas | delete, valores-limite, espaços, UI | política de senha, limpeza, efeito no login |

**O que este trabalho faz diferente:** projeta os casos com técnicas explícitas (valor-limite, partição,
tabela de decisão), cobre a operação de exclusão e o efeito de desativar no login, roda tudo contra um
ambiente local descartável (Docker) e limpa os dados que cria. Ver o [Plano de Testes](02-plano-de-testes.md).
