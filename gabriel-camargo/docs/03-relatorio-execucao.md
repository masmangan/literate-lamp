# 3. Relatório da Execução dos Testes — Admin › User Management

> Issue #66 · Autor: Gabriel Camargo · Execução: 17/11/2026, macOS (Apple Silicon), Docker 28.3,
> OrangeHRM 5.9 (imagem `orangehrm/orangehrm:5.9` e código-fonte no commit `56e23b3`), PHP 8.3, PHPUnit 9.6.16,
> Node 22.18, Playwright 1.56.1 (Chromium).

Comando único: [`executar-testes.sh`](../executar-testes.sh). Saídas brutas em [`resultados/`](../resultados).

## 3.1 Resumo

| Nível | Suíte | Casos | Passaram | Falharam | Evidência |
|---|---|---:|---:|---:|---|
| Unitário | `testes/php/Unit` (PHPUnit) | 69 | 69 | 0 | `unitario.txt`, `unitario-junit.xml` |
| Integração (código + banco) | `testes/php/Integration` (PHPUnit) | 17 | 16 | **1** | `integracao-php.txt`, `integracao-php-junit.xml` |
| Integração (API REST) | `testes/api` (node:test) | 11 | 9 | **2** | `integracao-api.txt`, `api-junit.xml` |
| Sistema | `testes/sistema` (Playwright) | 7 | 6 | **1** | `sistema.txt`, `sistema-junit.xml`, `d2-toast-generico.png` |
| **Total** | | **104** | **100** | **4** | |

Os 69 casos unitários correspondem a 26 IDs do plano (U01–U34), porque U15 é uma tabela de decisão de
25 combinações e U16 repete as entradas das demais partições.

**Todas as 4 falhas são causadas por defeitos do sistema sob teste** (D1 e D2, abaixo); nenhuma é erro
do teste. Os testes originais do OrangeHRM relacionados à jornada também foram executados no mesmo
ambiente: 58/58 passaram (`resultados/originais.txt`).

### Sensibilidade dos testes (mutação manual)

Para verificar que os testes realmente detectam falhas (e não passam "por acaso"), quatro mutantes
foram inseridos à mão no código do SUT, um de cada vez (`resultados/mutacao-manual.txt`):

| Mutante | Alteração | Detectado por | Resultado |
|---|---|---|---|
| M1 | `USERNAME_MIN_LENGTH` 5 → 4 | I01 | morto (1 falha) |
| M2 | `checkMinPasswordLength`: `<` → `<=` | U01–U16 | morto (34 falhas) |
| M3 | mensagem de força não é mais suprimida quando há outras | U11, U13 | morto (2 falhas) |
| M4 | `getUndeletableUserIds` não bloqueia o usuário logado | U24, I11, I11b | morto (3 falhas) |

## 3.2 Resultado por caso

| ID | Resultado | | ID | Resultado | | ID | Resultado |
|---|---|---|---|---|---|---|---|
| U01–U16 (51 execuções) | ✅ | | I01–I12b (16) | ✅ | | A01–A09 | ✅ |
| U20–U26 (9) | ✅ | | **I13** | ❌ D1 | | **A10** | ❌ D1 |
| U30–U34 (9) | ✅ | | | | | **A11** | ❌ D1 |
| S01–S06 | ✅ | | **S07** | ❌ D2 | | | |

Comportamentos confirmados (critérios de aceitação que passaram):

* **CA1** limites 4/5/40/41 do nome (I01–I04, S03); nome repetido recusado pela API e pela validação assíncrona (I05b, A03, S04).
* **CA2** todas as partições da política de senha (U01–U16), senha "forte o bastante pelas regras mas adivinhável" recusada (I06), 65 caracteres recusado (I07), edição sem troca preserva o hash (I08).
* **CA3** Supervisor não atribuível (U33, I07b, A04); ESS recebe 403 em `/admin/users` (A05).
* **CA4** conta desativada: login recusado com "Account disabled" (A06, S01) **e a sessão já aberta é encerrada** (A07, S01).
* **CA5** exclusão lógica (`deleted = 1`, I10), nome volta a ficar livre (I05), não é possível excluir a si mesmo nem em lote (I11, I11b, A09), cancelar o diálogo preserva a conta (S06).

## 3.3 Defeitos encontrados

### D1 — API aceita e grava nome de usuário com espaços nas pontas (severidade: média)

* **Casos:** I13, A10, A11. **Critério violado:** CA1, CA6.
* **Onde:** `UserAPI::setUserParams` / `getCommonBodyValidationRules` (`orangehrmAdminPlugin/Api/UserAPI.php`).
  A regra `LENGTH [5, 40]` e a `ENTITY_UNIQUE_PROPERTY` são aplicadas ao valor bruto; nada remove os espaços.
* **Passos:** `POST /api/v2/admin/users` com `{"username": "  joana.t  ", "password": "Senha@Forte2026x", "status": true, "userRoleId": 2, "empNumber": <n>}`.
* **Esperado:** 422 (`username`) ou o nome gravado como `joana.t`.
* **Obtido:** 200 e `userName: "  joana.t  "` gravado. Em seguida, `POST` com `"joana.t"` **também** é aceito:
  passam a existir **dois usuários exibidos com o mesmo nome** na lista (A11: `"  esp.dk0qd8  "` e `"esp.dk0qd8"`).
* **Consequências observadas:**
  1. a conta com espaços só entra digitando os espaços (com `joana.t` o login é recusado e volta à tela de login; com `"  joana.t  "` vai ao dashboard);
  2. a busca da tela *User Management* compara por igualdade (`UserDao::searchSystemUsers`, `u.userName = :userName`),
     então buscar `joana.t` mostra apenas uma das duas contas — a outra fica "invisível" para a administradora;
  3. por causa da *collation* do MariaDB, espaços **à direita** são ignorados na comparação (`"Admin "` é recusado como
     repetido), mas espaços **à esquerda** não — comportamento inconsistente.
* **Alcance:** a interface faz `username.trim()` antes de enviar (`SaveSystemUser.vue`), então o defeito é alcançável pela
  API REST (integrações, scripts, importações), não pelo formulário.
* **Sugestão de correção:** normalizar (`trim`) o nome em `UserAPI::setUserParams` e nas regras de validação, ou adicionar
  uma regra que recuse espaços nas pontas.

### D2 — Formulário valida o tamanho do nome antes do `trim`, mas envia depois (severidade: baixa)

* **Caso:** S07. **Critério violado:** CA6.
* **Onde:** `src/client/src/orangehrmAdminPlugin/pages/systemUser/SaveSystemUser.vue` — as regras
  `shouldNotLessThanCharLength(5)` e `shouldNotExceedCharLength(40)` recebem o valor digitado, enquanto `onSave()`
  envia `this.user.username.trim()`. (O mesmo padrão existe em `EditSystemUser.vue`.)
* **Passos:** *Admin › User Management › Add*; preencher tudo corretamente e digitar `"  abcd  "` no nome; **Save**.
* **Esperado:** mensagem "Should be at least 5 characters" no campo, como acontece com `abcd` (S03).
* **Obtido:** o campo não acusa erro (8 caracteres antes do `trim`); o formulário envia `"username":"abcd"`, a API responde
  422 e a tela mostra apenas o toast genérico **"Error — Invalid Parameter"**, sem indicar qual campo está errado, com
  o formulário preso no indicador de carregamento ([captura](../resultados/d2-toast-generico.png)).
* **Sugestão de correção:** aplicar as regras de tamanho sobre `value.trim()`.

### Observações (não classificadas como defeito)

* **O1.** Com o formulário vazio, o campo *Confirm Password* mostra "Passwords do not match" em vez de "Required"
  (`PasswordInput.vue`). É inofensivo, mas a mensagem é imprecisa.
* **O2.** Com a política padrão (`strong`), senhas de 8 caracteres que cumprem todas as regras quase sempre são recusadas
  por força insuficiente (score zxcvbn 2 — ex.: `Qz7#kLp2`, `Tq8#Vm2!`, `Hx4$Wq9&`). Na prática o mínimo efetivo é maior
  que 8, embora a tela anuncie "minimum 8 characters". Comportamento coerente com a configuração, mas pouco transparente.

## 3.4 Conclusão

A jornada **conceder → ajustar → revogar acesso** funciona de ponta a ponta: as regras de senha, papéis, desativação
(inclusive de sessões abertas) e exclusão se comportam como especificado. Os dois defeitos encontrados estão no
**tratamento de espaços no nome de usuário**, uma lacuna que a análise crítica já apontava nos testes originais
(nenhum caso considera espaços) e que só apareceu porque os casos foram projetados com valor-limite e suposição de erro.
