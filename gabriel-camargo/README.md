# Trabalho 2 – Teste do OrangeHRM · Jornada "Admin › User Management"

Contribuição individual de **Gabriel Camargo** ao relatório unificado da turma.
Jornada: *a administradora de RH concede, ajusta e revoga o acesso de uma funcionária ao sistema.*

| Seção do relatório | Onde está | Issue |
|---|---|---|
| Introdução, compilação e execução | este README | — |
| Análise crítica dos testes existentes e de terceiros | [`docs/01-analise-critica.md`](docs/01-analise-critica.md) | #61 |
| Objetivos, jornada de usuário e casos de teste (**Plano de Testes**) | [`docs/02-plano-de-testes.md`](docs/02-plano-de-testes.md) | #62 |
| Ambiente e testes unitários (PHPUnit) | [`ambiente/`](ambiente), [`testes/php/Unit`](testes/php/Unit) | #63 |
| Testes de integração (PHPUnit + banco; API REST) | [`testes/php/Integration`](testes/php/Integration), [`testes/api`](testes/api) | #64 |
| Testes de sistema (Playwright) | [`testes/sistema`](testes/sistema) | #65 |
| Resultado dos testes (**Execução dos Testes**) | [`docs/03-relatorio-execucao.md`](docs/03-relatorio-execucao.md), [`resultados/`](resultados) | #66 |

**Resultado em uma linha:** 104 casos, 100 passam; as 4 falhas expõem dois defeitos no tratamento de espaços
do nome de usuário (D1 na API, D2 no formulário).

## 1. Introdução

### 1.1 O sistema

O **OrangeHRM Starter** é um sistema de gestão de recursos humanos de código aberto (GPL v3): cadastro de
funcionários (PIM), férias (Leave), ponto (Time/Attendance), recrutamento, desempenho, despesas (Claim),
rede social interna (Buzz) e administração. Site: <https://www.orangehrm.com>.

* Back-end PHP 8 sobre componentes Symfony e Doctrine ORM, organizado em *plugins*
  (`src/plugins/orangehrm{Nome}Plugin`), cada um com `Api/`, `Service/`, `Dao/`, `entity/` e `test/`.
* Front-end Vue 3 com a biblioteca de componentes OXD (`src/client`).
* Banco MySQL/MariaDB.

A jornada escolhida vive no `orangehrmAdminPlugin` (`UserAPI`, `UserService`, `UserDao`,
`ValidationUserNameAPI`), com apoio do `orangehrmAuthenticationPlugin` (política de senha, login) e das telas
`SaveSystemUser.vue`/`EditSystemUser.vue`/`SystemUser.vue`.

### 1.2 Onde obter

* Código-fonte: <https://github.com/orangehrm/orangehrm> — versão analisada: **5.9**, commit `56e23b3`.
* Servidor de demonstração: <https://opensource-demo.orangehrmlive.com/web/index.php/dashboard/index>.
* Imagem Docker oficial: `orangehrm/orangehrm:5.9`.

### 1.3 Como compilar e preparar o ambiente

Requisitos: Docker com Compose v2, Node.js ≥ 20 e Git. Nada de PHP/MySQL é instalado na máquina.

```bash
# 1) código-fonte do OrangeHRM ao lado do repositório da turma (o compose espera ../../../orangehrm)
git clone https://github.com/orangehrm/orangehrm.git
git -C orangehrm checkout 56e23b3
#    estrutura:  ./orangehrm   ./literate-lamp/gabriel-camargo

# 2) sobe banco, aplicação e contêiner de PHPUnit
cd literate-lamp/gabriel-camargo/ambiente
HOST_UID=$(id -u) HOST_GID=$(id -g) docker compose up -d --build

# 3) instala o sistema sob teste (http://localhost:8300, usuário Admin / Admin@OHRM123)
docker compose exec app php installer/cli_install.php

# 4) "compila" o OrangeHRM para o PHPUnit: composer install, instalação no banco dev e banco de testes
docker compose exec phpunit bash /scripts/preparar-phpunit.sh

# 5) dependências dos testes de sistema
cd ../testes/sistema && npm ci && npx playwright install chromium
```

| Serviço | Imagem | Papel | Porta |
|---|---|---|---|
| `db` | `mariadb:10.11` | bancos do SUT, do código-fonte e de testes do PHPUnit | 3317 |
| `app` | `orangehrm/orangehrm:5.9` | sistema sob teste dos testes de API e de sistema | 8300 |
| `phpunit` | PHP 8.3 CLI + extensões + Composer + PCOV | roda o PHPUnit sobre o clone montado em `/app` | — |

Os testes PHP desta pasta são montados (somente leitura) em
`src/plugins/orangehrmAdminPlugin/test/JornadaUsuarios`, onde o autoload e a infraestrutura de testes do
próprio OrangeHRM (`KernelTestCase`, `EndpointIntegrationTestCase`, fixtures YAML) os encontram.

### 1.4 Como rodar os testes

Tudo de uma vez (grava as evidências em `resultados/`):

```bash
./executar-testes.sh
```

Ou por nível:

```bash
cd ambiente
# unitários
docker compose exec phpunit ./src/vendor/bin/phpunit --testdox --group Unit src/plugins/orangehrmAdminPlugin/test/JornadaUsuarios
# integração com banco (o grupo "defeito" contém o caso que expõe o D1)
docker compose exec phpunit ./src/vendor/bin/phpunit --testdox --group Integration src/plugins/orangehrmAdminPlugin/test/JornadaUsuarios
docker compose exec phpunit ./src/vendor/bin/phpunit --group JornadaUsuarios --exclude-group defeito src/plugins/orangehrmAdminPlugin/test/JornadaUsuarios
# testes originais do OrangeHRM ligados à jornada
docker compose exec phpunit ./src/vendor/bin/phpunit src/plugins/orangehrmAdminPlugin/test/Api/UserAPITest.php

# integração da API REST (sem dependências: só Node)
cd ../testes/api && npm test

# sistema (Playwright); --headed para ver o navegador
cd ../sistema && npx playwright test
npx playwright show-report ../../resultados/playwright-html
```

Os testes de API e de sistema aceitam outro servidor por variáveis de ambiente, por exemplo o demo:
`OHRM_URL=https://opensource-demo.orangehrmlive.com/web/index.php OHRM_PASSWORD=admin123 npm test`.
O demo roda em *modo demo*, que muda regras de usuário, por isso o ambiente local é o de referência.
Todos os testes criam dados com sufixo único e os removem ao final.

## 2. Estrutura

```
gabriel-camargo/
├── README.md                  introdução, compilação e execução
├── executar-testes.sh         roda todos os níveis e grava resultados/
├── ambiente/                  docker-compose, Dockerfile do PHPUnit, configs de instalação
├── docs/                      análise crítica, plano de testes, relatório de execução
├── testes/
│   ├── php/Unit               PHPUnit: política de senha, UserService, regras de validação
│   ├── php/Integration        PHPUnit: UserAPI → UserService → UserDao → MariaDB
│   ├── php/fixtures           fixture e casos YAML no formato do OrangeHRM
│   ├── php/Support            dublê de configuração da política de senha
│   ├── api                    node:test + fetch contra a API REST v2
│   └── sistema                Playwright (Chromium)
└── resultados/                saídas, JUnit XML, mutação manual, capturas
```

## 3. Fontes e uso de IA

* Código e testes originais do OrangeHRM: <https://github.com/orangehrm/orangehrm> (GPL v3).
* Material de terceiros analisado: citado com links em [`docs/01-analise-critica.md`](docs/01-analise-critica.md).
* A organização do ambiente em três contêineres (banco, aplicação oficial e PHP CLI para o PHPUnit) segue as
  etapas do CI oficial do OrangeHRM (`.github/workflows/test.yml`) e é a mesma abordagem adotada por colegas da
  turma no repositório compartilhado (ex.: `mateus-neubarth/ambiente`).
* **Uso de IA:** o planejamento, a programação dos testes e a redação deste material foram feitos com assistência
  do **Claude Code** (Anthropic, modelo Claude Opus 5.5). Todo o conteúdo foi executado no ambiente descrito, e os
  resultados registrados em `resultados/` são as saídas reais das execuções.
