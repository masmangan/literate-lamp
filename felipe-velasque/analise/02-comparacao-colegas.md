# Padrões da turma e decisões para a contribuição PIM Dependents

**Fonte:** arquivos de `literate-lamp.zip` fornecido pelo estudante em 17/11/2026; repositório `masmangan/literate-lamp`. Não são resultados da execução de nossa suíte.

## Comparação técnica

| Pasta dos colegas | Jornada observada | Elementos úteis como padrão | Limitações para reutilização direta |
|---|---|---|---|
| `mateus-neubarth/` | PIM / Add Employee | Ambiente Docker com `phpunit`, MariaDB, configuração de instalação e evidências | O ambiente está configurado para o cadastro de funcionário; não copiar testes nem resultados da jornada |
| `lucas-mocelin/` | Login/autenticação | Análise crítica, plano, relatório, Playwright, evidências JUnit/cobertura | Regras e seletores são próprios da autenticação |
| `eduardo-hoffmann/` | Attendance / Punch In-Out | Issues e divisão em análise/plano/execução; rastreabilidade de casos e defeitos | Cenários/autorizações de ponto não equivalem aos de dependentes |
| `renan-bertoletti/` | Claim | Testes separados por nível e manutenção de casos que expõem defeito conhecido | Estados/regras de despesa não aplicáveis ao PIM Dependents |
| `fernando-kunst/` | Leave / licença | Diferenciação de unitário/integração/sistema, execução Selenium e relatório | Dependência de estado da demo; optamos por instância local descartável |
| `leonardo-lopes/` | Maintenance / download | Descrição de pré-condições, casos positivos e negativos | Não há equivalência direta entre download e CRUD de dependentes |

## Decisões técnicas autorais tomadas

1. **Manter pasta individual** `felipe-velasque/`, seguindo o repositório, mas sem copiar material de entrega como se fosse próprio.
2. **Reaproveitar apenas a infraestrutura Docker compartilhada** para PHPUnit e a instalação local, preservando os arquivos originais do colega.
3. **Codificar testes independentes** sobre `EmpDependent` e `EmployeeDependentDao` com nova matriz de decisão e limites.
4. **Não usar a demo pública para testes destrutivos**: testes de sistema e API criam e excluem exclusivamente funcionários fictícios na aplicação `localhost:8200`.
5. **Gerar evidências por teste**, sem declarar aprovação antes da execução. Atividades devem ser associadas a Issues individuais atribuídas no GitHub.

## Observação sobre qualidade da comparação

A estrutura e o conteúdo citados foram inspecionados no ZIP, mas não executamos os projetos dos seis colegas para revalidar suas contagens de testes e defeitos; qualquer número anunciado por eles deve ser atribuído aos próprios relatórios, não a nossa execução.
