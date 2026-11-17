# Análise crítica dos testes existentes — PIM / Dependents

**Tipo:** análise estática do código original e triagem crítica de material de terceiros.  
**Data da análise:** 17/11/2026.  
**Versão:** `orangehrm/orangehrm` commit `56e23b3b09e7af29317a0943523b825843fff527` (confirmado no ZIP fornecido).  
**Issue:** [preencher número e link após criação].

## 1. Objetivo e critérios

Identificar estratégias, níveis e lacunas dos testes já existentes para a funcionalidade **PIM › Dependents**, antes de planejar testes adicionais. Grade de avaliação: **nível, técnica, cobertura funcional, isolamento, oráculo/asserções, legibilidade, manutenção e riscos**. Não inferimos percentual de cobertura sem executar o sistema com medidor de cobertura.

## 2. Arquitetura relevante

- Entidade Doctrine: `src/plugins/orangehrmPimPlugin/entity/EmpDependent.php`.
- Serviço: `src/plugins/orangehrmPimPlugin/Service/EmployeeDependentService.php`.
- DAO: `src/plugins/orangehrmPimPlugin/Dao/EmployeeDependentDao.php`.
- API REST: `src/plugins/orangehrmPimPlugin/Api/EmployeeDependentAPI.php`.
- Rotas: `src/plugins/orangehrmPimPlugin/config/routes.yaml`.
- Interface Vue: `src/client/src/orangehrmPimPlugin/pages/employee/EmployeeDependents.vue`; componentes `SaveDependent.vue` e `EditDependent.vue`.
- Suíte `Pim` no `phpunit.xml` da raiz. O PHPUnit é o principal mecanismo de testes PHP do projeto.

## 3. Inventário de testes originais encontrados

Caminhos abaixo relativos a `src/plugins/orangehrmPimPlugin/test/`.

| Classe | Métodos `test*` | Objeto e nível aproximado | Evidências da leitura |
|---|---:|---|---|
| `Entity/EmpDependentTest.php` | 1 | Integração de mapeamento ORM (não unitário puro) | `EntityTestCase`; persiste funcionário e dependente; consulta repositório e confere relacionamento, sequência, tipo e nascimento. |
| `Service/EmployeeDependentServiceTest.php` | 6 | Serviço isolado do DAO por mock, mas `setUp()` carrega dados de fixture | Interações `expects(once)`; cobre obter um/listar/salvar/excluir/pesquisar/contar; verifica retorno e argumentos em caminhos positivos. |
| `Dao/EmployeeDependentDaoTest.php` | 9 | Integração com ORM/banco | `TestDataService::populate` com `EmpDependentDao.yml`; testa inserção automática e explícita, seqNo 100 inválido, busca, limite, contagem e exclusão. |
| **Total** | **16** | **Contagem estática, não execução** | Nenhuma classe `*Dependent*` foi encontrada em `test/Api/` dentro desse plugin. |

**Fixture:** `test/fixtures/EmpDependentDao.yml` descreve dois funcionários e três dependentes, distribuídos em dois colaboradores; fornece uma base reproduzível para busca e isolamento entre colaboradores.

## 4. Análise crítica por nível

### 4.1 Entidade / ORM

**Ponto positivo:** consulta após persistência verifica que o mapeamento do dependente funciona em um cenário positivo. **Limitação:** há apenas um método; não testa tipos inválidos ou casos-limite. Como há persistência e acesso a repositório, a classificação mais fiel é **integração ORM**, não unitário independente de banco.

### 4.2 Serviço

**Pontos positivos:** os seis métodos cobrem operações essenciais e verificam a comunicação com o DAO, incluindo os argumentos e a contagem de chamadas. **Limitações:** as respostas do DAO são previamente construídas pelos próprios testes; as asserções verificam sobretudo delegação, não validação de regras complexas; há poucos casos de erro. O `setUp` chama `TestDataService::populate`, acrescentando dependência de fixture mesmo onde se usa mock; um teste novo unitário puro pode evitar isso.

### 4.3 DAO

**Pontos positivos:** valida persistência, leitura, exclusão real e filtros, incluindo o cenário `seqNo=100` que provoca `InvalidArgumentException`. **Limitações:** concentra-se no caminho feliz; não exercita explicitamente fronteiras `seqNo=0/1/99/100` na mesma família de testes, nem tenta deletar identificadores de outro funcionário ou atualizar um dependente existente. O teste de exclusão, por outro lado, confere que as duas linhas foram removidas, o que é um bom oráculo de estado.

### 4.4 API e interface

Não foi encontrada classe de teste diretamente chamada `EmployeeDependentAPITest` no diretório `test/Api` do plugin. Isso **não prova ausência absoluta** de cobertura indireta na suíte geral. Os testes inventariados não verificam diretamente respostas HTTP, autorização no endpoint, mensagens de validação ou um percurso completo pelo navegador. Um teste de sistema acrescentaria um oráculo na interface e, quando possível, confirmação por API/estado persistido.

## 5. Regras reais que devem orientar o plano

| Regra observável no código | Origem | Consequência para testes |
|---|---|---|
| `relationshipType` aceita `child` ou `other`; a entidade rejeita outros valores | `entity/EmpDependent.php`, `Api/EmployeeDependentAPI.php` | Equivalência válida/inválida; teste de exceção; API com tipo não suportado. |
| Comprimento máximo de `name` e `relationship`: 100 | `Api/EmployeeDependentAPI.php`; `SaveDependent.vue` | Valor-limite **99, 100, 101** caracteres. |
| Formulário Vue exige nome e tipo; campo `Please Specify` aparece e é requerido se tipo `other` | `SaveDependent.vue` e `EditDependent.vue` | Tabela de decisão `child`/`other`, campo adicional vazio/preenchido; testar também cancelamento. |
| API trata `relationship` como opcional, sem condição de obrigatoriedade explícita para `other` | `EmployeeDependentAPI.php::getCommonBodyValidationRules()` | Investigar possível **diferença de validação UI × API**; não declarar defeito sem reproduzir e confirmar regra esperada. |
| Nascimento é opcional na UI; API usa `Rules::API_DATE` | `SaveDependent.vue`, `EmployeeDependentAPI.php` | Datas válidas, inválidas e em branco; idade/data futura só pode ser classificada como defeito se existir requisito explícito. |
| DAO gera `seqNo` a partir do maior número existente e rejeita valores fora de 1..99 | `Dao/EmployeeDependentDao.php::saveEmployeeDependent()` | Testar limites, sequência e falha em 100; confirmar estado do banco. |
| API tem consulta individual e de lista, criação, atualização e exclusão de vários IDs; filtros exigem funcionário acessível | `EmployeeDependentAPI.php`, `config/routes.yaml` | Testar CRUD, filtragem e controle de acesso usando identidades autorizadas. |

### Pontos prioritários de investigação (não são defeitos confirmados)

- **I1:** API aparentemente permite `relationship=""` mesmo com `relationshipType="other"`, enquanto a UI exige a especificação.
- **I2:** diferenciar nome ausente de nome em branco na API; há regra de tipo/comprimento, mas não uma regra explícita `NOT_EMPTY` no trecho inspecionado.
- **I3:** identificadores aceitos nas regras de rota/API e limites internos de `seqNo` devem produzir tratamento de erro consistente; testar 0, 99 e 100.
- **I4:** garantir que o funcionário A não consiga alterar ou excluir dependentes de B por parâmetros manipulados; montar casos em ambiente local isolado.
- **I5:** localizar cobertura indireta de API/e2e na suíte completa antes de afirmar cobertura zero.

## 6. Material de terceiros — triagem inicial, a aprofundar

**T1: [`ezethufokazi/OrangeHRM-Testing`](https://github.com/ezethufokazi/OrangeHRM-Testing)** — o README descreve testes **funcionais manuais** em Chrome e registra **4 casos de `My Info - Dependents`, todos declarados aprovados** na sua execução. Isso é útil como referência de estrutura (ID, pré-condição, passos, dados, oráculo), mas não fornece por si só validação automatizada de API, banco ou regras de seqNo. Os resultados são **declarados pelo autor do material**, não reproduzidos por nós. Próxima ação: inspecionar a planilha de casos original para avaliar entradas e asserções caso a caso.

**T2: [`SpartanzWarrior47/orangehrm-playwright`](https://github.com/SpartanzWarrior47/orangehrm-playwright)** — o README apresenta **Playwright + TypeScript**, Page Object Model, validação via API, relatórios HTML, captura de falhas e percurso de criação/edição/exclusão de empregado. Relevante como referência de arquitetura e de oráculo combinado UI/API, **mas o escopo declarado é ciclo de vida do funcionário, não cadastro de dependentes**; portanto não demonstra cobertura específica da jornada selecionada. Próxima ação: verificar a especificação `tests/employee-lifecycle.spec.ts`, seus asserts e isolamento efetivo antes de avaliá-la como evidência de qualidade.

| Critério | T1 (manual) | T2 (automação) | Lacuna que enfrentaremos |
|---|---|---|---|
| Nível | Sistema, manual | Sistema + validação via API, conforme README | Testes próprios unitário, integração e sistema |
| Técnica de projeto | Casos documentados; examinar planilha para classificar | Fluxo de ciclo de vida, verificar código | Equivalência, limites e tabela de decisão explícitos |
| Oráculo | Resultado esperado por caso informado no README | Asserts UI/API declarados | Verificar estado, validação e efeitos colaterais |
| Isolamento | Demo pública compartilhada | Demo pública; relato de dados únicos e execução sequencial | Preferir ambiente local e limpeza de dados |
| Limite de evidência | README, sem reprodução | README, sem inspeção do teste completo | Não inventar cobertura ou execução independente |

## 7. Conclusão

Os 16 métodos originais oferecem uma base importante de testes de serviço e persistência. A extensão que agregará valor ao trabalho da turma é **verificar os requisitos pelo extremo do usuário, testar limites/erros não cobertos e fundamentar as conclusões com logs de execução e rastreabilidade**, sem apenas reescrever cenários positivos já existentes.

## 8. Referências

1. `orangehrm/orangehrm`, commit `56e23b3b09e7af29317a0943523b825843fff527`, arquivos citados nas seções anteriores. Licença e autoria preservadas no projeto original.
2. https://github.com/ezethufokazi/OrangeHRM-Testing (README consultado em 17/11/2026).
3. https://github.com/SpartanzWarrior47/orangehrm-playwright (README consultado em 17/11/2026).
4. Enunciado T2 da disciplina de Verificação e Validação (Moodle PUCRS; capturas fornecidas pelo estudante em 17/11/2026).

**Uso de IA:** ChatGPT (OpenAI), apoio à leitura de código, redação e estrutura inicial; Claude Code (Anthropic, Claude Opus 5.5), reexecução das suítes originais e atualização desta seção com os logs. A revisão do texto é responsabilidade do autor.

## 9. Complemento após a execução dos testes originais no Mac (17/11/2026)

Após a análise estática, o estudante executou as suítes originais com PHPUnit 9.6.16 no contêiner. As três suítes foram reexecutadas em 17/11/2026 com os logs salvos em `../resultados/`:

| Arquivo original | Resultado observado |
|---|---|
| `test/Entity/EmpDependentTest.php` | 1 teste, 5 asserções, `OK` |
| `test/Service/EmployeeDependentServiceTest.php` | 6 testes, 20 asserções, `OK` |
| `test/Dao/EmployeeDependentDaoTest.php` | 9 testes, 28 asserções, `Risky: 9` |

O DAO original gerou repetidamente o aviso de propriedade dinâmica `EmployeeDependentDaoTest::$fixture` na linha 46. Os 9 métodos não apresentaram falhas de asserção na captura, mas PHPUnit os marcou como *risky*. Essa observação modifica o estado inicial de análise estática para **análise estática + execução**, sem atribuir percentual de cobertura ou defeito funcional à aplicação. Logs: `../resultados/phpunit-entidade-original.txt`, `phpunit-servico-original.txt` e `phpunit-dao-original.txt`. Do ponto de vista crítico, isso mostra que a suíte original não acompanhou a evolução do PHP: testes *risky* passam despercebidos se o resultado for lido apenas como "OK".

A interpretação e as limitações constam em `../docs/03-relatorio-execucao.md`. Os testes autorais (9 unitários, 8 de integração com banco, 3 de API REST e 7 de sistema) foram executados e aprovados; resultados e histórico de falhas no relatório de execução.
