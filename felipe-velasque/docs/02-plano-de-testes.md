# Plano de testes e projeto dos casos — PIM / Dependents

**Issue:** ver `../issues/roteiro.md`  
**Status:** plano executado em 17/11/2026. 27 testes autorais implementados e aprovados na execução final (ver `03-relatorio-execucao.md`). A matriz de rastreabilidade ao final liga cada caso planejado ao teste implementado.

## Objetivo e escopo

Validar operações CRUD de dependentes e testar regras de validação, persistência, controle de acesso e fluxo de interface. Fora do escopo inicial: performance, estresse de milhares de dependentes e auditoria de todos os módulos PIM. Testes devem ser independentes sempre que possível, com dados distintos e limpeza em `tearDown`.

## Estratégia

| Nível | Sistema sob teste | Ferramenta proposta | Oráculo |
|---|---|---|---|
| Unitário | `EmpDependent` e delegação/tratamento de erro de `EmployeeDependentService` | PHP + PHPUnit 9, mocks de DAO | Tipo aceito/rejeitado, exceções, argumentos e resultados |
| Integração | `EmployeeDependentDao` + banco, API REST + autorização | PHP + PHPUnit + DB isolado | HTTP/status/modelo e estado persistido |
| Sistema | Jornada PIM/Dependents no navegador | Playwright + JavaScript | UI, dados após recarga, exclusão e restrições do formulário |

**Critérios de seleção de dados:** equivalência (`child`, `other`, inválido), valores-limite (99/100/101 caracteres; sequência 1/99/100), tabela de decisão (`other` × especificação preenchida), transições CRUD e casos negativos de autorização. Valores-limite de identificador devem ser realizados no DAO/API conforme o contrato de cada camada, não diretamente na UI.

## Casos projetados

| ID | Nível | Entrada/pré-condição | Resultado esperado | Técnica | Requisito |
|---|---|---|---|---|---|
| UT-01 | Unitário | `child` e `other` em `EmpDependent` | Aceitos | Equivalência | CA-06 |
| UT-02 | Unitário | `relationshipType` inválido (ex.: `spouse`) | `InvalidArgumentException` | Equivalência negativa | CA-06 |
| UT-03 | Unitário | Nascimento nulo / data válida | Propriedade preservada | Equivalência | CA-01/02 |
| UT-04 | Unitário | Serviço salva dependente com DAO mock | Delegação exatamente uma vez | Interação/mock | CA-01 |
| UT-05 | Unitário | Serviço exclui IDs `[1,2]` de funcionário 1 | Argumentos corretos e total retornado | Interação/mock | CA-05 |
| UT-06 | Unitário | DAO mock lança `Exception` na busca | Serviço lança `ServiceException` contendo causa | Exceção | CA-07 |
| IT-01 | Integração | Novo dependente de funcionário teste | DAO grava e consulta a mesma informação | Estado persistido | CA-01 |
| IT-02 | Integração | `seqNo` 99 e 100 em dados controlados | 99 aceito conforme contexto; 100 rejeitado | Valores-limite | CA-05 |
| IT-03 | Integração | Excluir IDs de A e tentar afetar B | Registros de B continuam intactos | Isolamento/segurança | CA-05/07 |
| IT-04 | Integração | API `name` com 99/100/101 caracteres | 99/100 aceitos; 101 rejeitado com validação apropriada | Valores-limite | CA-03 |
| IT-05 | Integração | API com tipo não reconhecido | Rejeição de validação; nada gravado | Equivalência negativa | CA-06 |
| IT-06 | Integração | API `other` e `relationship` vazio | **Exploratório**: comparar comportamento com UI; verificar requisito antes de alegar defeito | Tabela de decisão | CA-02 |
| IT-07 | Integração | Consulta/edição de dependente inexistente | Não cria/edita registro; resposta de erro adequada | Exceção | CA-04/07 |
| IT-08 | Integração | Operar sobre funcionário não acessível | Nenhum dado de outra pessoa exposto ou alterado | Segurança | CA-07 |
| ST-01 | Sistema | Cadastrar filho com dados válidos | Dependente aparece na lista após recarga | Fluxo principal | CA-01 |
| ST-02 | Sistema | Selecionar `Other`, deixar especificação vazia | Formulário exige `Please Specify` | Tabela de decisão | CA-02 |
| ST-03 | Sistema | Nome vazio | Salvar impedido | Equivalência negativa | CA-03 |
| ST-04 | Sistema | Nome 100 e 101 caracteres | 100 aceito; 101 impedido | Valores-limite | CA-03 |
| ST-05 | Sistema | Editar nome de dependente | Atualizado após recarga, sem duplicata | Transição | CA-04 |
| ST-06 | Sistema | Cancelar formulário | Sem alteração nos registros | Transição negativa | CA-04 |
| ST-07 | Sistema | Excluir com confirmação | Registro removido | Transição | CA-05 |
| ST-08 | Sistema | Excluir e cancelar diálogo | Registro permanece | Transição negativa | CA-05 |
| ST-09 | Sistema | Informar data inválida | UI impede submissão | Equivalência | CA-06 |

## Registro da execução

Para **cada** teste: código da versão, data/hora, responsável, comando, ambiente, dado de entrada, esperado, observado, PASS/FAIL/BLOCKED, duração (quando disponível), logs/screenshot, e link da Issue. Uma falha de automação ou de ambiente **não é necessariamente um defeito do produto**; confirmar por reprodução antes de abrir defeito.

## Critério de entrada/saída

**Entrada:** versão fixada, banco de testes isolado, dependências instaladas, usuário/funcionário de teste, casos revisados, permissão para executar testes.  
**Saída:** testes dos três níveis executados ou bloqueios justificados, evidências versionadas, defeitos reproduzidos com passos e severidade, relatório consolidado, GitHub Issues/commits/PR vinculados.

## Segurança e ética de testes

Não rodar testes de autorização destrutivos na demonstração compartilhada. Não enviar credenciais, cookies ou dados pessoais nos logs e screenshots. Usar registros fictícios e exclusão de dados ao encerrar os casos.


## Matriz de rastreabilidade: planejado → implementado → resultado (17/11/2026)

Os IDs implementados não coincidem exatamente com os planejados (a numeração foi refeita na implementação). Esta tabela faz a correspondência e **não declara implementação inexistente**. Resultados conferidos em `../resultados/`.

| Caso planejado | Teste implementado (arquivo › método/caso) | Resultado | Defeito |
|---|---|---|---|
| UT-01 | `EmpDependentAndServiceUnitTest` › `testAcceptsKnownRelationshipTypes` (2 dados) | OK | — |
| UT-02 | mesmo › `testRejectsUnknownRelationshipTypes` (3 dados) | OK | — |
| UT-03 | mesmo › `testDateOfBirthMayBeNullOrDate` | OK | — |
| UT-04 | mesmo › `testServiceDelegatesSaveToDaoOnce` | OK | — |
| UT-05 | mesmo › `testServiceDelegatesDeletionWithEmployeeAndIds` | OK | — |
| UT-06 | mesmo › `testServiceWrapsDaoSearchException` | OK | — |
| IT-01 | IT-DB-01 `testAutoSequenceIsIndependentForEachEmployee`; IT-DB-06 `testUpdatingExistingDependentDoesNotDuplicateRow` | OK | — |
| IT-02 | IT-DB-07 `testSequenceNinetyNineIsAcceptedButNextAutomaticSequenceIsRejected` | OK | — |
| IT-03 | IT-DB-02 `testDeleteCannotRemoveAnotherEmployeesSameSequence` | OK | — |
| IT-04 | IT-API-02 (100 aceito, 101 rejeitado) | Passou | — (99 caracteres não testado) |
| IT-05 | IT-API-03 (tipo inválido não persiste) | Passou | — |
| IT-06 | **Não implementado** (exploratório `Other` sem especificação via API) | — | — |
| IT-07 | IT-DB-08 `testDeletingUnknownIdReturnsZeroAndDoesNotAffectOtherEmployees` (só exclusão no DAO; consulta/edição via API não testadas) | OK | — |
| IT-08 | **Não implementado** (autorização de outro usuário) | — | — |
| ST-01 | ST-01 cadastra Child e persiste após recarregar | Passou* | — |
| ST-02 | ST-02 `Other` torna *Please Specify* obrigatório | Passou* | — |
| ST-03 | ST-03 nome obrigatório | Passou* | — |
| ST-04 | ST-07 (101 rejeitado na UI) + IT-API-02 (100 aceito na API) | Passou | — (100 na UI não testado) |
| ST-05 | ST-05 editar sem duplicar | Passou* | — |
| ST-06 | ST-04 cancelar cadastro não persiste | Passou* | — |
| ST-07 | ST-06 (parte "confirmar exclusão remove") | Passou | — |
| ST-08 | ST-06 (parte "cancelar exclusão preserva") | Passou | — |
| ST-09 | **Não implementado** (data inválida na UI) | — | — |

**Testes implementados além do plano:** IT-DB-03 `testDeletingOneSelectedIdPreservesOtherRows`, IT-DB-04 `testExistingIdsAreFilteredByEmployee`, IT-DB-05 `testSearchAndCountRespectFiltersAndEmployee` e IT-API-01 (criar/ler/editar pela API) — todos aprovados.

\* Falharam em execuções intermediárias por defeitos **do teste** (seletor do botão *Add*; condição de corrida na edição), corrigidos e reexecutados. Ver `03-relatorio-execucao.md` §3 e `../resultados/historico/`.

**Lacunas assumidas:** IT-06, IT-08 e ST-09 não implementados; limites de 99 caracteres e de 100 caracteres na UI não testados; cobertura de código não medida; concorrência fora de escopo.
