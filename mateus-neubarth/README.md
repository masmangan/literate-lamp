# Mateus Neubarth: testes da jornada PIM › Add Employee (OrangeHRM)

Contribuição individual no trabalho de Verificação e Validação: análise crítica dos testes existentes e testes
unitários, de integração e de sistema da jornada **Admin cadastra um funcionário** do OrangeHRM.

> Em andamento. Esta pasta é preenchida aos poucos, uma Issue por vez.

## Jornada

O administrador de RH acessa **PIM › Add Employee**, informa nome (e, opcionalmente, Employee Id, foto e dados de
login) e salva. O funcionário é criado e, se pedido, também um usuário do sistema.

## Organização planejada

| Pasta | Conteúdo | Situação |
|---|---|---|
| `analise/` | análise crítica dos testes do código original e de projetos de terceiros | em andamento (#2) |
| `docs/` | jornada de usuário, projeto dos casos de teste, ambiente e defeitos | planejado |
| `ambiente/` | ambiente local em Docker (OrangeHRM + banco + PHPUnit) | planejado |
| `unitario/` | testes unitários em PHPUnit | planejado |
| `integracao/` | testes da API REST v2 em Java (JUnit 5 + REST Assured) | planejado |
| `sistema/` | testes pela interface em Java (JUnit 5 + Playwright) | planejado |
| `relatorios/` | Relatório do Plano de Testes e Relatório da Execução dos Testes | planejado |

Os testes vão rodar no GitHub Actions. O workflow fica em `.github/workflows/mateus-neubarth-testes.yml`, porque
o GitHub só executa workflows dessa pasta.

## Uso de IA

Claude Code (Anthropic, modelo Claude Opus 5.5) é usado como assistente de programação e de redação. Os commits
feitos com ele levam a linha `Co-Authored-By: Claude`. Todo o conteúdo é revisado pelo autor.
