### Execução — nível de sistema (Playwright, servidor demo)
Ambiente: OrangeHRM OS 5.9 (demo), Playwright, Chromium/Firefox/WebKit

Resultado: 11 casos × 3 navegadores = 33 execuções, 33 passaram, 0 falharam.

| ID | Cenário | Resultado |
|---|---|---|
| ST-01 | Vaga válida criada (redireciona para Edit Vacancy) | Passou |
| ST-02a/b | Nome com 50 aceito / 51 rejeitado | Passou |
| ST-03a | Nome vazio rejeitado | Passou |
| ST-04 | Posições 1 e 99 aceitas; 0, 100, -1, "abc" rejeitadas | Passou |
| ST-05 | Gerente sem selecionar da lista rejeitado | Passou |

Observações: o salvamento redireciona para a tela de edição (não para a listagem);
o autocomplete de gerente é assíncrono e exigiu espera explícita; os testes criam
dados no demo (nomes únicos QA-Caio-<timestamp>) sem limpeza.
Defeitos encontrados no nível de sistema: nenhum.

Uso de IA: apoio do Claude no esqueleto dos testes; seletores e esperas ajustados e validados por mim.