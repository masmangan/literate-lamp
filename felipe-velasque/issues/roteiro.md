# Rastreabilidade de atividades — Issues no repositório da turma

**Destino:** https://github.com/masmangan/literate-lamp/issues  
**PR individual:** https://github.com/masmangan/literate-lamp/pull/31 (aberto em 17/11/2026 a partir do fork `felipevelasque/literate-lamp`, branch `feat/pim-dependents-analise`; sem assignee; sem Issue vinculada).

## Situação verificada em 17/11/2026

Consulta pública à API do GitHub (`repo:masmangan/literate-lamp involves:felipevelasque`) retornou **apenas o PR #31**. **Nenhuma Issue desta contribuição foi encontrada.** Os colegas registram uma Issue por atividade, atribuída a si mesmos (ex.: #25–#29, #32–#38).

O enunciado exige:
- registro de cada atividade em Issue **antes** de executá-la, atribuída ao executor;
- **Relatório do Plano de Testes (Issue)** e **Relatório da Execução dos Testes (Issue)** como itens de entrega.

## O que fazer (pelo próprio estudante)

As Issues abaixo devem ser criadas **agora, com a data real**, informando no texto que o registro foi feito depois do início da atividade. Não alterar datas nem simular que existiam antes. Se o professor tiver orientação diferente para registros atrasados, segui-la.

1. Criar as Issues pelo GitHub (ou `gh issue create` depois de `gh auth login`).
2. Atribuir cada uma a si mesmo (o fork não dá permissão de atribuição; se o botão *Assignees* não aparecer, pedir ao professor, como no cadastro do repositório).
3. Editar a descrição do PR #31 com `Refs #<n>` para cada Issue e atualizar a seção "Próximas etapas", que ainda diz que os testes não foram executados.
4. Preencher a tabela abaixo com os números.

| Atividade | Entregas | Issue |
|---|---|---|
| Análise crítica dos testes existentes e de terceiros | `analise/01-codigo-original-e-terceiros.md`, `analise/02-comparacao-colegas.md` | **[pendente]** |
| Jornada de usuário e Relatório do Plano de Testes | `docs/01-jornada.md`, `docs/02-plano-de-testes.md` | **[pendente]** |
| Implementação dos testes (unitário, integração, sistema) | `unitario/`, `integracao/`, `sistema/`, `scripts/` | **[pendente]** |
| Relatório da Execução dos Testes e evidências | `docs/03-relatorio-execucao.md`, `docs/04-relatorio-unificado.md`, `resultados/` | **[pendente]** |

## Textos sugeridos

**[PIM-Dependents] Análise crítica dos testes existentes e de terceiros**  
Analisar os testes originais do OrangeHRM para `EmpDependent` (entidade, serviço, DAO) e materiais de terceiros, segundo os critérios da disciplina. Entrega: `felipe-velasque/analise/`. Registro feito em 17/11/2026, após o início da atividade. Refs PR #31.

**[PIM-Dependents] Relatório do Plano de Testes**  
Jornada de usuário (gerenciar dependentes de um funcionário), critérios de aceitação, casos de teste por nível e técnica (equivalência, valores-limite, tabela de decisão, transição de estado), matriz de rastreabilidade. Entrega: `felipe-velasque/docs/01-jornada.md` e `02-plano-de-testes.md`. Registro feito em 17/11/2026, após o início da atividade. Refs PR #31.

**[PIM-Dependents] Implementar testes unitários, de integração e de sistema**  
PHPUnit com mocks (9 testes), PHPUnit + MariaDB (8 testes), Playwright REST (3) e Playwright UI (7). Entrega: `felipe-velasque/unitario/`, `integracao/`, `sistema/`. Registro feito em 17/11/2026, após o início da atividade. Refs PR #31.

**[PIM-Dependents] Relatório da Execução dos Testes**  
Execução em 17/11/2026: 27 testes autorais aprovados; testes originais 7 OK + 9 risky (DAO); histórico de 2 falhas de automação corrigidas; nenhum defeito funcional confirmado. Entrega: `felipe-velasque/docs/03-relatorio-execucao.md`, `04-relatorio-unificado.md`, `resultados/`. Refs PR #31.

## Validação final antes de pedir revisão

- [ ] Issues criadas, atribuídas e vinculadas ao PR #31
- [x] PR contém só a pasta individual, sem clone, `vendor/` ou `node_modules/`
- [x] Testes autorais executados com logs salvos (*risky* não contado como aprovado)
- [x] Relatórios com data, ambiente, resultados e evidências reais
- [x] Uso de IA (ChatGPT e Claude Code) e fontes declarados
- [ ] Datas e exigências do cronograma no Moodle conferidas
