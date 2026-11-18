## 1. Exploração do módulo - Vacancies

| Campo | Obrigatório | Regra observada | Mensagem/comportamento |
|---|---|---|---|
| Vacancy Name | Sim | Máx. 50 caracteres | "Should not exceed 50 characters" |
| Vacancy Name | Sim | Exatamente 50 caracteres | Aceito normalmente |
| Vacancy Name | Sim | Vazio não é aceito | "Required" |
| Vacancy Name | Sim | Nome só com espaços não é aceito | "Required" |
| Vacancy Name | Sim | Duplicado é rejeitado, mesmo com espaço após o nome ou variação de case | "Already exists" |
| Job Title | Sim | Seleção em lista | "Required" se não selecionado um título |
| Hiring Manager | Sim | Só aceita funcionário selecionado no autocomplete | "Invalid" com texto livre |
| Hiring Manager | Sim | Espaço sozinho não retorna sugestões | "No Records Found" mesmo com nomes com espaço |
| Number of Positions | Não | Inteiro fora do intervalo 1 a 99 | "Should be a number between 1-99" |
| Number of Positions | Não | Inteiro de 1 a 99 (1, 99, 50) | Aceito |
| Active  | Não | Toggle | Aceito |
| Publish in RSS | Não | Toggle | Aceito |
| Attachment (só na edição) | Sim, para adicionar um anexo | Máx. 1MB | "Attachment Size Exceeded" |


**Versão analisada:** `56e23b3b09e7af29317a0943523b825843fff527`

## 2. Análise dos testes do código original

### 2.1 Mapa dos testes encontrados
| Arquivo | Nível | Foco |
|---|---|---|
| `test/Api/VacancyAPITest.php` + `VacancyTestCases.yaml` | Integração (API + banco) | Create, Update, Delete, GetAll, GetOne |
| `test/Dao/VacancyDaoTest.php` | Integração (DAO + banco) | Persistência e consultas de vagas |
| `test/Entity/VacancyTest.php` | Integração (mapeamento ORM) | Persistência da entidade Vacancy |

Não foram encontrados testes unitários puros nem testes de sistema (UI) para o cadastro de vaga.

### 2.2 Avaliação pela grade

| Critério | VacancyAPITest (+YAML) | VacancyDaoTest | VacancyTest (Entity) |
|---|---|---|---|
| Nível | Integração via API; usa fixtures e endpoint real | Integração com banco; repopula fixture a cada teste | Integração de mapeamento ORM; persiste e consulta |
| Técnica | Data provider alimentado por YAML; partição implícita por campo (ausente, inexistente, inativo); sem valor-limite | Exemplo único por teste; sem data provider, partição ou valor-limite | Um único exemplo |
| Cobertura | Feliz + 6 erros de referência/obrigatoriedade em Create. Sem tamanho do nome, faixa de posições, duplicidade | Feliz de save, get, update, delete e 6 filtros/contagens. Sem caso de erro | Só caminho feliz |
| Isolamento | Trunca tabela no Create; data fixa; mocks de usuário e data. Depende de banco | `setUp` repopula a fixture, então testes independentes. Acoplado a valores mágicos da fixture (ids, contagens) | `setUp` trunca a tabela. O `find(1)` assume id inicial 1 |
| Oráculo | Forte no caso feliz (objeto completo). Nos erros, `invalidOnly` parece checar só o campo inválido ; só "Deleted Job Title" confere classe e mensagem  | Misto: nomes e contagens exatas, mas `testSaveVacancy` confere só nome e data (ignora cargo, gerente, posições, status); `testGetVacancyListGroupByHiringManager` só confere a contagem | Fraco: confere só nome e descrição, ignora cargo, gerente, posições, status e datas |
| Legibilidade | Métodos claros e repetitivos; AAA escondido em `assertValidTestCase`; nome do caso genérico | Nomes descritivos; um typo ("HiringManger"); sem comentários AAA | Nome genérico; os dados usam `updatedTime` (2022-02-25) anterior a `definedTime` (2022-05-25), o que é incoerente |
| Lacunas | Ver 2.3 | Sem teste de nome duplicado, nome longo, posições inválidas, id inexistente em `getVacancyById` | Não valida campos obrigatórios nem limites |

### 2.3 Lacunas de cobertura da jornada "abrir vaga"
Comportamentos vistos no demo (seção 1) sem teste no código original:
- Nome: valores-limite da interface (50/51) e do endpoint (100/101); nome vazio ou só com espaços;
  nome duplicado (espaço no fim, maiúsculas)
- `numOfPositions`: 0, 1, 99, 100, negativo, texto, omitido, e valores muito grandes
  (limite de 13 dígitos do endpoint)
- `status: false` e `isPublished: false` no Create
- Hiring Manager desligado (terminado) da empresa
- Fluxo ponta a ponta pela interface

### 2.4 Achado: regras da interface não espelhadas no endpoint
Os limites observados no demo (nome ≤ 50, posições 1 a 99) diferem das regras visíveis no
`VacancyAPI.php` (nome ≤ 100, posições com limite de 13 dígitos). Se o endpoint realmente aceitar
valores que a interface rejeita, a validação fica dependente do front-end e a API pode receber
dados inválidos por chamada direta. **Hipótese a verificar** nos testes de integração (Issue 3).
Observação menor: a anotação de documentação do endpoint usa a constante de "tamanho máximo"
como `maximum` do número de posições (linhas 349 e 523).

### 2.5 Execução
Tentativa de execução local: `./src/vendor/bin/phpunit --filter "VacancyDaoTest|VacancyTest|VacancyAPITest"`
Resultado: `No such file or directory`. As dependências PHP (`src/vendor`) não estavam
instaladas, e a execução exigiria PHP, Composer e banco MySQL configurados.
**Limitação:** os testes originais não foram executados; a análise é estática (leitura do código).
Verificação das regras de validação no código (`VacancyAPI.php`, `getCommonBodyValidationRules`):
- `name`: string com tamanho máximo 100 (`PARAMETER_RULE_NAME_MAX_LENGTH`)
- `numOfPositions`: opcional, inteiro com tamanho máximo 13 (`PARAMETER_RULE_NO_OF_POSITIONS_MAX_LENGTH`);
  nenhuma regra de faixa 1 a 99 encontrada
- `jobTitleId` e `employeeId`: positivos e com verificação de existência
- Nenhuma regra de unicidade do nome encontrada no endpoint
A interface do demo aplica limites diferentes (nome ≤ 50; posições 1 a 99; nome duplicado
rejeitado). A origem dessas regras (front-end ou outro ponto do back-end) não foi confirmada.

### 2.6 Conclusão
A suíte original verifica que o cadastro funciona e que referências ausentes ou inexistentes são rejeitadas. Ela não exercita as regras de formato e de limite que a interface aplica, e os oráculos dos testes de DAO e de Entity são fracos. Esses pontos orientam o plano de testes (Issue 2).
A suíte original também não exercita os limites que o endpoint de fato aplica (100 caracteres, 13 dígitos).

## 3. Análise do material de terceiros

**Fonte:** conjunto de casos de teste manuais "Test Scenario for Recruitment Functionality"
(OrangeHRM_TestCases), https://marinaincodeland.github.io/OrangeHRM_TestCases/html/recruitment-functionality.html

**Casos relacionados a vaga:** TC-044 a TC-053.

**Natureza:** documentação de casos manuais (passo a passo e resultado esperado); não há código
de teste automatizado nesta fonte.

### 3.1 Mapa dos casos de vaga
| Caso | Cenário | Técnica aparente |
|---|---|---|
| TC-044 | Criar vaga com todos os campos | Caminho feliz |
| TC-045 | Criar vaga só com obrigatórios | Caminho feliz mínimo |
| TC-046 / 047 / 048 | Sem nome / sem cargo / sem gerente | Partição (campo obrigatório ausente), um campo por caso |
| TC-052 | Posições 1 e 99 | Valor-limite (válidos) |
| TC-053 | Posições 0, -5 e 100 | Valor-limite (inválidos) |
| TC-049 a 051 | Editar, excluir, excluir em lote | Fora do escopo da minha jornada |

### 3.2 Avaliação pela grade
| Critério | Avaliação |
|---|---|
| Nível | Sistema (interface), manual |
| Técnica | Usa partição de equivalência e valor-limite em `Number of Positions` (0, 1, 99, 100, negativo). Melhor que os testes originais nesse ponto |
| Cobertura | Cobre obrigatórios ausentes e limites de posições. Não cobre: nome com 50/51 caracteres, nome duplicado, Hiring Manager inexistente ou texto livre, efeito dos toggles |
| Isolamento | Os casos dependem de dados do demo (ex.: cargos e gerentes "John Smith", "Jane Doe") que podem não existir *(inf.)* |
| Oráculo | Descreve resultado esperado em linguagem natural, o que é útil, mas **divergiu do comportamento que observei**: TC-053 espera uma mensagem de faixa com texto diferente da exibida no demo para o valor 100 ("Should be a number between 1-99"). TC-046 e TC-047 esperam mensagem de campo obrigatório, compatível com o que observei para nome e cargo; TC-048 (gerente) não foi verificado no demo. |
| Legibilidade | Estrutura clara (pré-condições, passos, pós-condições). Falhas: TC-053 junta três valores inválidos e um válido no mesmo caso (dificulta localizar a falha); TC-049 referencia TC-037 como "adicionar vaga", mas TC-037 é "adicionar candidato" |
| Lacunas | Gerente como texto livre: os casos mandam "inserir" o gerente, mas o demo só aceita item selecionado no autocomplete (texto livre retorna "Invalid") |

### 3.3 Conclusão sobre terceiros
O material é mais completo que o original em **valores-limite de posições** e em **obrigatoriedade**,
mas é manual, depende de dados do demo e tem inconsistências (mensagem esperada diferente da real,
referência cruzada errada, caso que agrupa vários valores). Também não cobre nome longo nem duplicado.
Outros repositórios consultados (Katalon, Selenium/Pytest) tratam Admin, login e cadastro de
funcionário, não vagas.

### 3.4 Síntese: original × terceiros
| Aspecto | Código original | Terceiros |
|---|---|---|
| Nível | Integração (API/DAO/Entity) | Sistema, manual |
| Obrigatórios ausentes | Sim (name, employeeId, jobTitleId) | Sim (nome, cargo, gerente) |
| Valor-limite de posições | Não | Sim |
| Nome 50/51 e duplicado | Não | Não |
| Oráculo | Forte no caso feliz, fraco no resto | Descritivo, com divergência de mensagem |
| Automação | Sim (PHPUnit) | Não |

**Lacunas comuns às duas fontes (alvo do meu plano de testes):** nome com 50/51 caracteres,
nome duplicado, Hiring Manager inválido pela interface, efeito de `Active` e `Publish in RSS`,
e teste ponta a ponta automatizado.

### 3.5 Fontes
- https://marinaincodeland.github.io/OrangeHRM_TestCases/html/recruitment-functionality.html
- https://github.com/mfarisgh/katalon_web_faris
- https://github.com/neilSoriano/Orange_HRM

### 3.6 Uso de IA
Claude (Anthropic): apoio na leitura dos arquivos de teste e na estruturação do documento. Observações conferidas junto ao código original e o demo.
