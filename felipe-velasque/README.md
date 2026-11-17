# Trabalho T2 — Verificação e Validação do OrangeHRM

## PIM — Dependents / Gerenciamento de dependentes

Contribuição individual na pasta `felipe-velasque/` do repositório da turma [`masmangan/literate-lamp`](https://github.com/masmangan/literate-lamp), enviada pelo [PR #31](https://github.com/masmangan/literate-lamp/pull/31) a partir do fork `felipevelasque/literate-lamp`.

### Estado das entregas em 17/11/2026

| Requisito do professor | Evidência | Situação |
|---|---|---|
| Análise crítica do código original e de terceiros | `analise/01-codigo-original-e-terceiros.md`, `analise/02-comparacao-colegas.md` | Feita, com reexecução dos testes originais |
| Jornada de usuário | `docs/01-jornada.md` | Feita |
| Plano e projeto dos casos de teste | `docs/02-plano-de-testes.md` | Feito, com matriz de rastreabilidade planejado → implementado → resultado |
| Testes unitários (PHPUnit + mocks) | `unitario/T2Dependents/EmpDependentAndServiceUnitTest.php` | **9 testes / 13 asserções / OK** |
| Testes de integração (PHPUnit + MariaDB) | `integracao/T2Dependents/EmployeeDependentPersistenceIntegrationTest.php` | **8 testes / 30 asserções / OK** |
| Testes de integração (API REST, Playwright) | `sistema/tests/02-api-contrato.spec.js` | **3 de 3 passaram** |
| Testes de sistema (UI, Playwright) | `sistema/tests/01-jornada-dependentes.spec.js` | **7 de 7 passaram** |
| Testes originais do módulo | `docs/03-relatorio-execucao.md` | Entidade 1 OK, serviço 6 OK, DAO **9 risky** (aviso de depreciação) |
| Relatório da execução | `docs/03-relatorio-execucao.md`, `resultados/` | Feito, com histórico de falhas em `resultados/historico/` |
| Relatório unificado | `docs/04-relatorio-unificado.md` | Feito |
| Issues atribuídas e commits | `issues/roteiro.md` | **Pendente:** nenhuma Issue registrada ainda; textos sugeridos no roteiro |

**Defeitos:** nenhum defeito funcional do OrangeHRM confirmado. As duas falhas vistas durante o desenvolvimento eram do código de teste e foram corrigidas. Cobertura de código não foi medida.

### Reproduzir no Mac (raiz `literate-lamp`)

Pré-condições: Docker Desktop funcionando, contêiner `phpunit` e banco de testes preparados conforme `mateus-neubarth/docs/ambiente.md`; clone original no diretório irmão `../orangehrm`.

```bash
# 1) Unitário e integração Doctrine/MariaDB
bash felipe-velasque/scripts/rodar-phpunit.sh

# 2) Com aplicação OrangeHRM local ativa em http://localhost:8200, executar UI + API
bash felipe-velasque/scripts/rodar-playwright.sh

# 3) Verificar antes de enviar novos commits
git status --short
git diff --check
```

Os scripts ficam nesta contribuição e **não modificam o código-fonte de produção** do OrangeHRM; copiam somente os testes para a pasta de testes do clone. O PHPUnit usa fixtures que modificam tabelas do **banco de testes**. O Playwright cria/exclui apenas funcionários fictícios da instância local, impedindo conexão à demo pública por uma trava explícita.

### Organização

- `analise/`: análise crítica do código original, comparação com materiais externos e colegas.
- `docs/`: jornada, casos, execução, relatório unificado.
- `unitario/`: testes de unidade com mocks.
- `integracao/`: testes com DAO/ORM/banco de testes.
- `sistema/`: automação Playwright da interface e da API de uma instalação local.
- `resultados/`: logs e JUnit da execução final; `resultados/historico/` guarda as execuções com falha.
- `scripts/`: cópia para clone e comandos reproduzíveis.
- `issues/`: roteiro de rastreabilidade, **não é criação automática de Issues**.

### Fonte técnica

Repositório original: https://github.com/orangehrm/orangehrm; commit `56e23b3b09e7af29317a0943523b825843fff527`. Os arquivos foram criados para essa revisão. A aplicação em contêiner utiliza a imagem `orangehrm/orangehrm:5.9`; não foi verificado que o SHA interno da imagem seja idêntico ao commit da análise.

### Uso de IA e autoria

- **ChatGPT (OpenAI):** planejamento, análise estática do código, rascunho dos casos de teste, primeira versão dos testes e scripts e redação inicial dos documentos.
- **Claude Code (Anthropic, modelo Claude Opus 5.5):** depuração das falhas do Playwright e correção dos testes, reexecução de todas as suítes com registro dos logs, preservação do histórico de falhas, atualização dos relatórios e organização dos commits (coautoria indicada nas mensagens de commit).

Os resultados vêm de execução real no Mac do estudante; nenhum número foi estimado. A revisão final e a responsabilidade pela entrega são do autor. Os trabalhos dos colegas foram consultados para estrutura e ambiente (`mateus-neubarth/ambiente/`), sem atribuir os resultados deles a esta contribuição.
