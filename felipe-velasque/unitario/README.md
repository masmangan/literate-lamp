# Testes unitários autorais — PIM Dependents

Arquivo: `T2Dependents/EmpDependentAndServiceUnitTest.php`. Seis métodos (com dois *data providers*) geram **9 execuções e 13 asserções**, resultado **OK** no PHPUnit 9.6.16 (execução de 17/11/2026, log em `../resultados/phpunit-unitario.txt`).

Verificações: equivalência `child`/`other`/inválido, atributo data de nascimento opcional, delegação de salvar/excluir e exceção de busca no serviço com mocks do DAO. **Não é necessário banco de dados para estes testes.** A anotação `@group T2Dependents` foi movida para a documentação da classe nesta atualização, corrigindo o erro que gerou `No tests executed!` com o filtro de grupo.

Para repetir junto aos testes novos de integração, na raiz de `literate-lamp`:

```bash
bash felipe-velasque/scripts/rodar-phpunit.sh
```

O script copia o arquivo para o clone do OrangeHRM, executa PHPUnit e grava `resultados/phpunit-unitario.txt`. Consulte `../docs/03-relatorio-execucao.md`.
