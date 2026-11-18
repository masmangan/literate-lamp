# 2. Relatório do Plano de Testes — Admin › User Management

> Issue #62 · Autor: Gabriel Camargo · SUT: OrangeHRM 5.9 (commit `56e23b3`)

## 2.1 Objetivo dos testes

Verificar se o OrangeHRM permite que um administrador **conceda, ajuste e revogue o acesso** de um
funcionário ao sistema de forma correta e segura, isto é:

1. só cria contas que respeitam as regras de nome de usuário (5–40 caracteres, único entre os não excluídos)
   e a política de senha configurada;
2. só atribui papéis atribuíveis (`Admin`, `ESS`; nunca `Supervisor`);
3. o efeito de **desativar** ou **excluir** uma conta é imediato — inclusive sobre sessões já abertas;
4. o administrador não consegue excluir a própria conta;
5. interface e API aplicam as mesmas regras (a UI não aceita o que a API rejeita, e vice-versa).

## 2.2 Jornada de usuário

**Persona.** *Carla*, analista de RH com papel **Admin** no OrangeHRM. Responsável por dar acesso aos
novos funcionários no primeiro dia e por remover o acesso no desligamento.

**História de usuário.**
> Como **administradora de RH**, quero **criar, ajustar e revogar contas de acesso dos funcionários**
> para que **cada pessoa tenha exatamente o acesso de que precisa, só enquanto fizer parte da empresa**.

**Pré-condição.** A funcionária *Joana Teste* já está cadastrada no PIM e ainda não tem conta.

| Passo | Ação da Carla | Resposta esperada do sistema | Tela / endpoint |
|---|---|---|---|
| 1 | Entra com usuário Admin | Dashboard | `/auth/validate` |
| 2 | Abre *Admin › User Management* e clica **Add** | Formulário "Add User" | `/admin/saveSystemUser` |
| 3 | Escolhe papel **ESS**, funcionária **Joana Teste**, status **Enabled**, nome `joana.teste`, senha forte e confirmação | Validação em tempo real (tamanho, nome já existente, força da senha, confirmação igual) | `GET /api/v2/admin/validation/user-name` |
| 4 | Clica **Save** | Toast "Successfully Saved", volta à lista | `POST /api/v2/admin/users` |
| 5 | Busca por `joana.teste` | 1 registro, papel ESS, status Enabled | `GET /api/v2/admin/users?username=` |
| 6 | Joana entra com a nova conta | Dashboard com menu de ESS (sem *Admin*) | `/auth/validate` |
| 7 | Carla edita a conta: status **Disabled** | Toast "Successfully Updated" | `PUT /api/v2/admin/users/{id}` |
| 8 | Joana tenta entrar / continuar usando a sessão | "Account disabled" / sessão expirada | `/auth/validate`, qualquer API → 401 |
| 9 | Carla exclui a conta | Toast "Successfully Deleted", registro some da lista | `DELETE /api/v2/admin/users` |
| 10 | Carla tenta excluir a própria conta | Operação recusada | `DELETE` → 422 |

**Fluxos alternativos e de exceção:** nome com menos de 5 ou mais de 40 caracteres; nome já usado;
senha fraca, longa demais, com espaço ou diferente da confirmação; funcionária inexistente; papel
não atribuível; excluir usuário inexistente.

**Critérios de aceitação** (rastreados nos casos abaixo pela coluna *CA*):

* **CA1** nome de usuário aceito ⇔ 5 ≤ tamanho ≤ 40 e não existe outro usuário não excluído com o mesmo nome.
* **CA2** senha aceita ⇔ atende a todas as regras da política (mín. 8, máx. 64, ≥1 minúscula, ≥1 maiúscula,
  ≥1 número, ≥1 especial, sem espaços) **e** a força mínima configurada (`strong`).
* **CA3** só papéis com `is_assignable = 1` podem ser atribuídos.
* **CA4** usuário desativado não entra, e uma sessão aberta dele deixa de valer.
* **CA5** exclusão é lógica (`deleted = 1`), o nome volta a ficar disponível e o próprio usuário logado não pode ser excluído.
* **CA6** UI e API tratam espaços e tamanhos do nome de usuário da mesma forma.

## 2.3 Estratégia e ambiente

| Nível | O que é testado | Ferramenta | Onde roda |
|---|---|---|---|
| Unitário | `PasswordStrengthService`, `UserService`, regras `Password` e `UserRoleIdAssignableRule`, isolados com dublês | PHPUnit 9 (o mesmo do projeto) | contêiner `phpunit`, sem banco |
| Integração (código) | `UserAPI` → `UserService` → `UserDao` → MariaDB, com fixtures próprias | PHPUnit + `EndpointIntegrationTestCase` do OrangeHRM | contêiner `phpunit` + banco `test_orangehrm_dev` |
| Integração (serviço HTTP) | contrato da API REST v2, sessão, autorização | Node.js 22 `node:test` + `fetch` | OrangeHRM 5.9 em contêiner (`app`, porta 8300) |
| Sistema | a jornada completa pela interface | Playwright 1.x (Chromium) | OrangeHRM 5.9 em contêiner |

Ambiente local descartável (`ambiente/docker-compose.yml`) em vez do servidor de demonstração: o demo é
compartilhado, reinicia os dados e roda em *modo demo* (`Config::PRODUCT_MODE`), que altera o
comportamento de `UserService::saveSystemUser` e `getUndeletableUserIds`. Os testes de API e de sistema
aceitam `OHRM_URL`/`OHRM_PASSWORD` para rodar no demo, se desejado.

**Critério de término:** todos os casos executados; cada falha classificada como defeito do SUT
(registrado no relatório de execução) ou erro do teste (corrigido).

## 2.4 Casos de teste

Técnicas: **VL** = análise de valor-limite, **PE** = partição de equivalência, **TD** = tabela de decisão,
**TE** = transição de estados, **CU** = caso de uso/jornada, **ER** = suposição de erro (*error guessing*).

### 2.4.1 Unitários (`testes/php/Unit`)

**Política de senha — `PasswordStrengthService`.** Política usada nos testes (a padrão da instalação):
mín. 8, máx. 64, ≥1 de cada classe, espaços proibidos, força exigida `strong` (score ≥ 3).

Partições do tamanho: `[0..7]` inválida · `[8..64]` válida · `[65..∞)` inválida.

| ID | Entrada | Técnica | Resultado esperado | CA |
|---|---|---|---|---|
| U01 | 7 caracteres, demais regras ok | VL | mensagem `password_min_length` | CA2 |
| U02 | 8 caracteres | VL | sem mensagem de tamanho | CA2 |
| U03 | 64 caracteres | VL | sem mensagem de tamanho | CA2 |
| U04 | 65 caracteres | VL | mensagem `password_max_length` | CA2 |
| U05 | sem minúscula | PE | só `password_n_lowercase_letters` | CA2 |
| U06 | sem maiúscula | PE | só `password_n_uppercase_letters` | CA2 |
| U07 | sem número | PE | só `password_n_numbers` | CA2 |
| U08 | sem especial | PE | só `password_n_special_characters` | CA2 |
| U09 | com espaço, espaços proibidos | PE | só `password_spaces_not_allowed` | CA2 |
| U10 | com espaço, espaços permitidos | PE | nenhuma mensagem | CA2 |
| U11 | senha vazia | VL/ER | todas as 5 mensagens de regra, sem "guessable" | CA2 |
| U12 | regras ok, força abaixo da exigida | TD | só `password_could_be_guessable` | CA2 |
| U13 | regra violada **e** força baixa | TD | só a mensagem da regra (a de força é suprimida) | CA2 |
| U14 | mínimos configurados negativos | ER | tratados como 0 → senha `a` sem mensagens de mínimo | CA2 |
| U15 | força exigida × score (5 × 5) | TD | aceita ⇔ score ≥ nível exigido | CA2 |
| U16 | `isValidPassword` × `checkPasswordPolicies` (todas as entradas acima) | — | `isValidPassword` ⇔ lista de mensagens vazia | CA2 |

**Serviço de usuários — `UserService`** (dublês de `UserDao`, `PasswordHash` e `UserRoleManager`).
Tabela de decisão de `saveSystemUser` (fora do modo demo):

| ID | senha não-hasheada | Ação esperada |
|---|---|---|
| U20 | `null` (não mudar) | hash atual preservado; `PasswordHash::hash` **não** chamado |
| U21 | `""` | `userPassword` vira `null` |
| U22 | `"Senha@Forte2026x"` | `hash()` chamado 1×; `userPassword` = hash; senha em claro apagada do decorador |

| ID | Caso | Técnica | Esperado | CA |
|---|---|---|---|---|
| U23 | `getAssignableUserRoleIds` com papéis Admin(1) e ESS(2) | — | `[1, 2]` | CA3 |
| U24 | `getUndeletableUserIds` com usuário logado id 7 | — | `[7]` | CA5 |
| U25 | `getUndeletableUserIds` sem usuário logado | ER | `[]` | CA5 |
| U26 | `getCredentials` com hash MD5 antigo | ER | usuário devolvido e senha regravada com bcrypt | — |

**Regras de validação.**

| ID | Regra / entrada | Técnica | Esperado | CA |
|---|---|---|---|---|
| U30 | `Password(false)` com `"x"` | TD | válido (regra desligada quando não há troca de senha) | CA2 |
| U31 | `Password(null)` com `"x"` | ER | inválido (padrão é validar) | CA2 |
| U32 | `UserRoleIdAssignableRule` com `2` (atribuível) | PE | válido | CA3 |
| U33 | `UserRoleIdAssignableRule` com `3` (Supervisor) | PE | inválido | CA3 |
| U34 | `UserRoleIdAssignableRule` com `"2"` (string) | ER | inválido (tipo) | CA3 |

### 2.4.2 Integração — PHPUnit com banco (`testes/php/Integration`)

Fixture própria `fixtures/JornadaUsuarios.yaml`: Admin logado (id 1), ESS ativo, ESS excluído
`antiga.conta`, papéis Admin/ESS/Supervisor, política de senha padrão.

| ID | Operação / entrada | Técnica | Esperado | CA |
|---|---|---|---|---|
| I01 | create, nome com 4 caracteres | VL | inválido: `username` | CA1 |
| I02 | create, nome com 5 caracteres | VL | criado | CA1 |
| I03 | create, nome com 40 caracteres | VL | criado | CA1 |
| I04 | create, nome com 41 caracteres | VL | inválido: `username` | CA1 |
| I05 | create, nome de usuário excluído (`antiga.conta`) | PE | criado (nome volta a ficar livre) | CA5 |
| I06 | create, senha que só falha a força (`Qz7#kLp2`, score 2) | TD | inválido: `password` | CA2 |
| I07 | create, senha com 65 caracteres | VL | inválido: `password` | CA2 |
| I08 | update com `changePassword=false` e senha vazia | TD | atualizado, hash antigo preservado | CA2 |
| I09 | update status → `false` | TE | `status=false` gravado | CA4 |
| I10 | delete de outro usuário | CU | id devolvido; `deleted=1` no banco | CA5 |
| I11 | delete do próprio usuário (id 1) | TD | inválido: `ids` | CA5 |
| I12 | delete de id inexistente / já excluído | PE | `RecordNotFoundException` | CA5 |
| I13 | create com espaços nas pontas `"  joana.t  "` | ER | inválido ou nome normalizado (sem espaços) | CA6 |

### 2.4.3 Integração — API REST (`testes/api`)

| ID | Cenário | Técnica | Esperado | CA |
|---|---|---|---|---|
| A01 | `POST /admin/users` válido | CU | 200, contrato `{id,userName,status,employee,userRole}` | CA1 |
| A02 | `GET /admin/users` filtrando por `username`, `userRoleId`, `status` | PE | só o usuário criado | — |
| A03 | nome repetido → `POST` e `GET /admin/validation/user-name` | PE | 422 `username` / `valid:false` | CA1 |
| A04 | papel Supervisor (3) | PE | 422 `userRoleId` | CA3 |
| A05 | ESS chama `GET /admin/users` | PE | 403 | CA3 |
| A06 | desativar → login | TE | login recusado com "Account disabled" | CA4 |
| A07 | desativar com sessão aberta | TE | sessão do ESS recebe 401 na próxima chamada | CA4 |
| A08 | excluir → `GET /admin/users/{id}` | TE | 200 no delete, depois 404 | CA5 |
| A09 | excluir a si mesmo | TD | 422 `ids` | CA5 |
| A10 | nome com espaços nas pontas | ER | 422, ou gravado sem os espaços | CA6 |
| A11 | depois de A10, criar o mesmo nome sem espaços | ER | 422 (não pode haver dois nomes visualmente iguais) | CA1, CA6 |

### 2.4.4 Sistema — Playwright (`testes/sistema`)

| ID | Cenário | Técnica | Esperado | CA |
|---|---|---|---|---|
| S01 | Jornada completa (passos 1–9) | CU | todos os resultados da tabela 2.2 | CA1–CA5 |
| S02 | Salvar formulário vazio | PE | "Required" em papel, funcionária, status, nome, senha | CA1 |
| S03 | nome com 4 caracteres | VL | "Should be at least 5 characters" | CA1 |
| S04 | nome já existente (`Admin`) | PE | "Already exists" | CA1 |
| S05 | senha ≠ confirmação | PE | "Passwords do not match" | CA2 |
| S06 | cancelar a exclusão no diálogo | TE | usuário continua na lista | CA5 |
| S07 | nome `"  abcd  "` (4 letras + espaços) | ER/VL | UI recusa no campo (mesma regra da API) | CA6 |

Rastreabilidade resumida: CA1 → I01–I05, A01–A03, A11, S02–S04 · CA2 → U01–U22, U30–U31, I06–I08, S05 ·
CA3 → U23, U32–U34, A04–A05 · CA4 → I09, A06–A07, S01 · CA5 → U24–U25, I05, I10–I12, A08–A09, S01, S06 ·
CA6 → I13, A10–A11, S07.
