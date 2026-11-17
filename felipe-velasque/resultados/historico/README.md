# Histórico de execuções com falha — Playwright (17/11/2026)

Este diretório preserva as execuções que falharam antes das correções nos testes de sistema.
A execução final aprovada está em `../playwright-execucao.txt` e `../playwright-junit.xml`.

## Execução 1 — falha inicial (≈15:23, horário local)

Arquivo: `playwright-junit-2026-11-17-falha-inicial.xml` (JUnit original gerado pelo Playwright, sem edição).

| Caso | Resultado | Causa registrada |
|---|---|---|
| ST-01 | Falha (timeout 60 s) | `locator.click` aguardando o botão **Add** de "Assigned Dependents" |
| ST-02 | Falha (timeout 60 s) | mesma causa |
| ST-03 | Falha (timeout 60 s) | mesma causa |
| ST-04 | Falha (timeout 60 s) | `ENOENT` ao gravar artefato de trace após o timeout |
| ST-05, ST-06, ST-07 | Passou | — |
| IT-API-01..03 | Passou | — |

**Diagnóstico:** defeito **no próprio teste**, não no OrangeHRM. O nome acessível do botão é `" Add"`
(o glifo do ícone vem antes do texto), por isso `getByRole('button', {name: 'Add', exact: true})` nunca
encontrava o elemento. O snapshot da página mostrava o botão visível e habilitado.

**Correção:** seletor trocado para `{name: /\bAdd$/}` em `sistema/tests/01-jornada-dependentes.spec.js`.

O log em texto dessa execução (`playwright-execucao.txt` da época) tinha apenas o cabeçalho e as duas
primeiras linhas `✘` (ST-01 e ST-02), porque a execução foi interrompida. Esse arquivo foi sobrescrito
pela execução seguinte e não existe mais; o JUnit acima é a evidência completa.

## Execução 2 — após correção do seletor (≈15:26)

Resultado: **9 passaram, 1 falhou (ST-05)**. A saída abaixo foi transcrita da sessão do Claude Code em que
o teste rodou; o arquivo de log dessa execução não foi salvo separadamente.

```
Error: expect(received).toBe(expected) // Object.is equality
Expected: "T2 Depois"
Received: "T2 Antes"
Call Log:
- Timeout 12000ms exceeded while waiting on the predicate
  > 96 |     await expect.poll(async () => (await listDependents(page, employeeNumber))[0]?.name).toBe('T2 Depois');

  1 failed
    [chromium] › tests/01-jornada-dependentes.spec.js:88:3 › ... › ST-05: editar atualiza registro sem duplicar
  9 passed (32.7s)
```

**Diagnóstico:** condição de corrida **no teste**. O formulário "Edit Dependent" carrega o registro de forma
assíncrona; o teste digitava o novo nome antes do carregamento, que então sobrescrevia o valor digitado,
e o Save enviava o nome antigo. Na execução 1 o ST-05 passou, o que confirma que a falha era intermitente.

**Correção:** o teste espera o campo Name exibir `T2 Antes` antes de preencher `T2 Depois`.

**Defeito no OrangeHRM?** Não foi caracterizado como defeito do sistema: um usuário humano só digita depois
de ver o formulário preenchido. Fica registrada a observação de usabilidade de que o formulário não
bloqueia a edição enquanto carrega.

## Execuções 3 a 6 — estabilidade

Após as duas correções, a suíte completa (10 testes) rodou mais 4 vezes seguidas na mesma sessão:
10/10 em todas. A última, via `scripts/rodar-playwright.sh`, gerou as evidências finais.
