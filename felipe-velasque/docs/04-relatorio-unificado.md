# Contribuição ao relatório unificado do T2 — OrangeHRM / PIM Dependents

**Estado:** contribuição individual consolidada com os resultados da execução de 17/11/2026. Todos os 27 testes autorais passaram na execução final; nenhum defeito funcional foi confirmado.

## 1. Introdução — objeto e obtenção do sistema

O OrangeHRM é um sistema de informação para recursos humanos. Na edição comunitária analisada, a lógica de back-end está em PHP, os dados são gerenciados por Doctrine e MariaDB/MySQL e a interface utiliza Vue. O módulo Personal Information Management (PIM) guarda dados cadastrais dos funcionários. Esta contribuição avalia a funcionalidade de **gerenciar dependentes** de um funcionário.

- Repositório original: `https://github.com/orangehrm/orangehrm`.
- Revisão analisada: `56e23b3b09e7af29317a0943523b825843fff527`.
- Código central: `src/plugins/orangehrmPimPlugin/{entity,Service,Dao,Api,test}`.
- Interface: `src/client/src/orangehrmPimPlugin/` (página `EmployeeDependents.vue`; formulários `SaveDependent.vue` e `EditDependent.vue`).
- Repositório de contribuições da turma: `https://github.com/masmangan/literate-lamp`; contribuição discutida no [PR #31](https://github.com/masmangan/literate-lamp/pull/31).

O clone do código original foi preparado fora da pasta de entregas (`../orangehrm`), e o ambiente de testes PHPUnit foi inicializado em Docker com MariaDB e fixtures, reaproveitando scripts de infraestrutura já existentes na pasta `mateus-neubarth/`. Para detalhes reproduzíveis, seguir [`../integracao/README.md`](../integracao/README.md) e [`../sistema/README.md`](../sistema/README.md).

## 2. Objetivos e jornada de usuário

**Objetivo geral:** avaliar e aumentar a capacidade de detecção de falhas para operações de cadastro, consulta, edição e remoção de dependentes no módulo PIM.

**História:** como administrador autorizado, desejo cadastrar, consultar, atualizar e excluir dependentes de um funcionário, para manter suas informações corretas.

Fluxo principal: autenticar, selecionar funcionário, acessar *Dependents*, adicionar `Child` e salvar, confirmar persistência, editar nome e excluir com confirmação. Exceções: nome obrigatório, `Other` exige *Please Specify* na UI, limite de 100 caracteres, cancelamento sem persistência e isolamento por funcionário. Jornada detalhada e critérios de aceitação: [`01-jornada.md`](01-jornada.md).

## 3. Projeto e técnicas dos testes

Técnicas empregadas no projeto: **particionamento por equivalência** (`child`, `other`, inválido); **valores-limite** (nome de 100/101 caracteres, sequência 99/100); **tabela de decisão** (`Other` com/sem *Please Specify*); **transições de estado** (criar → ler → editar → excluir; cancelar); **testes de isolamento** (dependentes com mesmo `seqNo` em dois funcionários); e **teste com mocks** (delegação DAO/serviço).

- **Unitário:** 6 métodos PHPUnit (2 com *data providers*, 9 execuções) para regras da entidade e interações do serviço isoladas com mocks. Resultado: **9 testes, 13 asserções, OK**.
- **Integração com banco:** 8 métodos autorais com DAO/Doctrine/MariaDB, incluindo limites de sequência, isolamento entre funcionários, filtro, atualização e exclusão. Resultado: **8 testes, 30 asserções, OK**.
- **Integração REST:** 3 cenários Playwright para criação/consulta/edição, limite de 100/101 caracteres e tipo inválido. Resultado: **3 passaram**.
- **Sistema:** 7 cenários Playwright com login, interface Vue, API e banco, cobrindo cadastro, edição, exclusão, cancelamento e regras do formulário. Resultado: **7 passaram**.

Matriz de casos, rastreabilidade entre planejado e implementado e lacunas: [`02-plano-de-testes.md`](02-plano-de-testes.md).

## 4. Análise de testes existentes e de terceiros

O código original contém 16 métodos pertinentes a `EmpDependent` (1 entidade, 6 serviço, 9 DAO). Os testes cobrem principalmente cenários positivos e consultas básicas. O teste da entidade usa persistência real; o serviço verifica delegação com mocks; o DAO usa fixtures e banco de testes. A análise de terceiros aponta a utilidade de cenários manuais documentados e de automação com Playwright como referências, sem copiar o código nem tomar resultados externos como evidência da nossa execução. Discussão crítica e fontes em [`../analise/01-codigo-original-e-terceiros.md`](../analise/01-codigo-original-e-terceiros.md) e comparação da turma em [`../analise/02-comparacao-colegas.md`](../analise/02-comparacao-colegas.md).

## 5. Resultados executados e interpretação

| Suíte | Resultado observado em 17/11/2026 |
|---|---|
| Unitário autoral | **9 testes / 13 asserções / OK** |
| Integração autoral MariaDB | **8 testes / 30 asserções / OK** |
| Integração autoral REST (Playwright) | **3 de 3 passaram** |
| Sistema autoral (Playwright) | **7 de 7 passaram** |
| Original entidade | **1 teste / 5 asserções / OK** |
| Original serviço | **6 testes / 20 asserções / OK** |
| Original DAO | **9 testes / 28 asserções / 9 risky**, sem falha de asserção |

**Falhas durante o desenvolvimento:** a primeira execução do Playwright teve 4 falhas (ST-01..ST-04) por um seletor do botão *Add* que nunca casava; a segunda teve 1 falha (ST-05) por condição de corrida no formulário de edição. As duas eram defeitos **do teste**, foram corrigidas e a suíte passou em 4 execuções seguidas. O histórico está preservado em `resultados/historico/`.

**Defeitos do sistema:** nenhum defeito funcional confirmado. A situação `risky` do DAO original decorre do aviso de propriedade dinâmica (`$fixture`) no teste original com PHP 8.2+: é dívida técnica da suíte, **não defeito do produto**. Cobertura de código não foi medida. Evidências, ambiente e comandos: [`03-relatorio-execucao.md`](03-relatorio-execucao.md).

## 6. Conclusões e recomendações

A suíte original é útil para validar persistência e comportamento básico de serviços, mas não fornece, apenas pelos 16 métodos analisados, garantia da jornada completa e tratamento dos limites mais críticos do formulário e da API. Nossos 27 testes complementam isso em três níveis, priorizando isolamento entre funcionários, efeitos colaterais, entradas inválidas e preservação do estado após as ações. Todos passaram, e nenhum defeito funcional foi encontrado na jornada. As falhas observadas no caminho eram do próprio código de teste, o que reforça a necessidade de distinguir defeito de automação de defeito de produto. Ficam como trabalho futuro os casos planejados e não implementados (autorização, data inválida na UI, `Other` sem especificação via API) e a medição de cobertura.

## 7. Contribuição, rastreabilidade e ferramentas

- Git/GitHub: pasta individual `felipe-velasque/`; branch `feat/pim-dependents-analise`; [PR #31](https://github.com/masmangan/literate-lamp/pull/31).
- **Issues**: situação e pendências em [`../issues/roteiro.md`](../issues/roteiro.md); o PR não substitui as Issues exigidas no enunciado.
- Ferramentas: Docker 29.9.3, MariaDB 10.11.19, PHP 8.3, PHPUnit 9.6.16, Node 22.23.2, Playwright 1.56.1 (Chromium).
- Uso de IA: **ChatGPT (OpenAI)** em planejamento, análise estática, rascunho dos casos, primeira versão dos testes e scripts e redação inicial; **Claude Code (Anthropic, Claude Opus 5.5)** na depuração e correção dos testes Playwright, reexecução das suítes, registro das evidências, atualização dos relatórios e organização dos commits. A revisão técnica e a responsabilidade pela entrega são do autor.
- Fontes: código do OrangeHRM, commit indicado; enunciado T2 Moodle; recursos de terceiros e trabalhos da turma listados na análise crítica. Os resultados dos colegas não são atribuídos à nossa contribuição.
