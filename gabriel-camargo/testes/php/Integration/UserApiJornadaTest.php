<?php

namespace OrangeHRM\Tests\Admin\JornadaUsuarios\Integration;

use OrangeHRM\Admin\Api\UserAPI;
use OrangeHRM\Core\Utility\PasswordHash;
use OrangeHRM\Entity\User;
use OrangeHRM\ORM\Doctrine;
use OrangeHRM\Framework\Services;
use OrangeHRM\Tests\Util\EndpointIntegrationTestCase;
use OrangeHRM\Tests\Util\Integration\TestCaseParams;

/**
 * Casos I01–I13 do plano (seção 2.4.2): UserAPI -> UserService -> UserDao -> MariaDB,
 * com a infraestrutura de testes do próprio OrangeHRM e fixtures desta jornada.
 *
 * @group JornadaUsuarios
 * @group Integration
 */
class UserApiJornadaTest extends EndpointIntegrationTestCase
{
    private const CASOS = 'JornadaUsuariosTestCases.yaml';
    private const SENHA_DA_FIXTURE = 'Senha@Forte2026x';

    private function preparar(TestCaseParams $caso): UserAPI
    {
        $this->populateFixtures('JornadaUsuarios.yaml', __DIR__ . '/../fixtures');
        $this->createKernelWithMockServices([Services::AUTH_USER => $this->getMockAuthUser($caso)]);
        $this->registerServices($caso);
        $this->registerMockDateTimeHelper($caso);
        return $this->getApiEndpointMock(UserAPI::class, $caso);
    }

    private function usuarioNoBanco(int $id): User
    {
        Doctrine::getEntityManager()->clear();
        return Doctrine::getEntityManager()->getRepository(User::class)->find($id);
    }

    private function casos(string $operacao): array
    {
        return $this->getTestCases(self::CASOS, $operacao, __DIR__ . '/../fixtures/testcases');
    }

    // ---------------- Create: I01–I07b

    /**
     * @dataProvider dataProviderCreate
     */
    public function testCreate(TestCaseParams $caso): void
    {
        $this->assertValidTestCase($this->preparar($caso), 'create', $caso);
    }

    public function dataProviderCreate(): array
    {
        return $this->casos('Create');
    }

    // ---------------- Update: I08–I09 (+ estado no banco)

    /**
     * @dataProvider dataProviderUpdate
     */
    public function testUpdate(TestCaseParams $caso): void
    {
        $this->assertValidTestCase($this->preparar($caso), 'update', $caso);

        $gravado = $this->usuarioNoBanco(2);
        // I08: changePassword=false não pode alterar a senha armazenada
        $this->assertTrue(
            (new PasswordHash())->verify(self::SENHA_DA_FIXTURE, $gravado->getUserPassword()),
            'a senha antiga deveria continuar válida'
        );
        $this->assertSame($caso->getBody()['status'], $gravado->getStatus());
        $this->assertSame(1, $gravado->getModifiedUserId(), 'auditoria: quem alterou');
    }

    public function dataProviderUpdate(): array
    {
        return $this->casos('Update');
    }

    // ---------------- Delete: I10–I12b (+ exclusão lógica)

    /**
     * @dataProvider dataProviderDelete
     */
    public function testDelete(TestCaseParams $caso): void
    {
        $this->assertValidTestCase($this->preparar($caso), 'delete', $caso);
        if ($caso->isInvalid() || !is_null($caso->getExceptionClass())) {
            // I11/I11b: nada pode ter sido excluído
            $this->assertFalse($this->usuarioNoBanco(1)->isDeleted());
            $this->assertFalse($this->usuarioNoBanco(2)->isDeleted());
            return;
        }

        // I10: exclusão é lógica (deleted = 1); o registro continua no banco
        $excluido = $this->usuarioNoBanco(2);
        $this->assertNotNull($excluido);
        $this->assertTrue($excluido->isDeleted());
        // e a administradora continua intacta
        $this->assertFalse($this->usuarioNoBanco(1)->isDeleted());
    }

    public function dataProviderDelete(): array
    {
        return $this->casos('Delete');
    }

    // ---------------- I13: espaços nas pontas do nome (expõe o defeito D1)

    /**
     * Resultado esperado (CA6): a API recusa o nome — ou o normaliza — para não permitir
     * dois nomes visualmente iguais. Ver docs/03-relatorio-execucao.md, defeito D1.
     *
     * @group defeito
     * @dataProvider dataProviderEspacos
     */
    public function testI13NomeComEspacosNasPontas(TestCaseParams $caso): void
    {
        $this->assertValidTestCase($this->preparar($caso), 'create', $caso);
    }

    public function dataProviderEspacos(): array
    {
        return $this->casos('EspacosNoNome');
    }
}
