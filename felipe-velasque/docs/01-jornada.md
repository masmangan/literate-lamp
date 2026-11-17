# Jornada de usuário: gerenciar dependentes de um funcionário (PIM › Dependents)

**Issue:** [link após criação]  
**Base técnica:** OrangeHRM commit `56e23b3b09e7af29317a0943523b825843fff527`, UI Vue e `EmployeeDependentAPI.php`.  
**Status:** jornada projetada pela leitura do código e validada ponta a ponta em 17/11/2026 pelos testes de sistema ST-01..ST-07 (ver `03-relatorio-execucao.md`). CA-07 (autorização) não foi testado.

## História de usuário

**Como** administrador com acesso autorizado a um funcionário, **quero** cadastrar, consultar, editar e excluir seus dependentes, **para** manter essas informações atualizadas em seu prontuário.

## Atores e precondições

- Administrador autenticado com permissão PIM; funcionário de teste válido, existente e acessível.
- Para testes de persistência, OrangeHRM e banco de teste local configurados.
- Para testes de interface, dados exclusivos, sem interferir nas informações reais de colaboradores ou dados de colegas.
- Confirmar autorização e textos exibidos na interface antes de executar testes.

## Fluxo principal

1. Entrar na aplicação e acessar **PIM**.
2. Abrir o registro de um funcionário de teste e selecionar **Dependents**.
3. Clicar em **Add** e preencher `Name`, `Relationship=Child`; deixar `Date of Birth` opcional ou informar uma data válida.
4. Salvar e confirmar novo dependente na tabela, com nome, relação e nascimento conforme os dados inseridos.
5. Editar dependente existente; conferir que a tabela passou a mostrar o novo valor.
6. Excluir o dependente mediante confirmação; verificar que deixa de aparecer.

## Alternativas e exceções

| Código | Situação | Resultado esperado preliminar |
|---|---|---|
| A1 | `Relationship=Other` | Campo **Please Specify** deve aparecer e ser obrigatório na interface. |
| A2 | Não informar nascimento | Formulário deve aceitar, conforme regra de validação observada. |
| A3 | Cancelar cadastro/edição | O formulário fecha sem criar ou atualizar registro. |
| E1 | Nome vazio | Interface deve impedir a submissão. |
| E2 | Relação não selecionada | Interface deve impedir a submissão. |
| E3 | `Other` sem `Please Specify` | Interface deve impedir a submissão. |
| E4 | Nome/descrição com 101 caracteres | Interface e API devem rejeitar conforme limite de 100. |
| E5 | Data com formato inválido | Formulário/API devem rejeitar entrada inválida. |
| E6 | ID inexistente ou funcionário não autorizado | Operação não deve acessar ou alterar dados alheios; código HTTP específico depende de teste. |
| E7 | Identificador de dependente 100 no DAO | `InvalidArgumentException` na persistência, conforme código lido. |

## Critérios de aceitação iniciais

- CA-01: criar `child` com nome válido associa o registro ao funcionário selecionado.
- CA-02: selecionar `other` exige especificação de relação na interface.
- CA-03: nome e `Please Specify` respeitam comprimento máximo de 100 caracteres.
- CA-04: editar modifica o registro existente e não cria um segundo indevidamente.
- CA-05: excluir remove somente os IDs selecionados do funcionário, após confirmação.
- CA-06: datas inválidas e valores não previstos de tipo de relação são rejeitados conforme cada camada.
- CA-07: funcionário sem autorização não deve manipular dependentes de outro funcionário.

## Riscos e restrições

- A API possui validação de `relationship` distinta da UI; tratar como hipótese de inconsistência.
- O site de demonstração é compartilhado e pode ser reinicializado; preferir instalação local para casos destrutivos/negativos de segurança.
- A origem da verdade é a versão do código registrada; diferenças com o demo devem ser documentadas, não ocultadas.
