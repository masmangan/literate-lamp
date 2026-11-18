<?php

namespace OrangeHRM\Tests\Admin\JornadaUsuarios\Unit;

use OrangeHRM\Admin\Dao\UserDao;
use OrangeHRM\Admin\Service\UserService;
use OrangeHRM\Core\Authorization\Manager\BasicUserRoleManager;
use OrangeHRM\Core\Helper\ClassHelper;
use OrangeHRM\Core\Utility\PasswordHash;
use OrangeHRM\Entity\User;
use OrangeHRM\Entity\UserRole;
use OrangeHRM\Framework\Services;
use OrangeHRM\Tests\Util\KernelTestCase;

/**
 * Casos U20–U26 do plano. UserService isolado: UserDao, PasswordHash e UserRoleManager são dublês.
 * (O ambiente roda em Config::MODE_DEV; no modo demo saveSystemUser tem outro ramo, fora do escopo.)
 *
 * @group JornadaUsuarios
 * @group Unit
 */
class UserServiceJornadaTest extends KernelTestCase
{
    private const HASH_ATUAL = '$2y$12$hashAtualQueNaoPodeMudar..............................';

    private function usuario(): User
    {
        $user = new User();
        $user->setId(10);
        $user->setUserName('joana.teste');
        $user->setUserPassword(self::HASH_ATUAL);
        return $user;
    }

    /** Dao que devolve o próprio usuário recebido em saveSystemUser (sem banco). */
    private function daoEspiao(): UserDao
    {
        $dao = $this->getMockBuilder(UserDao::class)->onlyMethods(['saveSystemUser'])->getMock();
        $dao->expects($this->once())->method('saveSystemUser')->willReturnArgument(0);
        return $dao;
    }

    // ---------- Tabela de decisão de saveSystemUser (condição: senha não-hasheada)

    public function testU20SemNovaSenhaPreservaHashENaoChamaHasher(): void
    {
        $hasher = $this->createMock(PasswordHash::class);
        $hasher->expects($this->never())->method('hash');

        $service = new UserService();
        $service->setUserDao($this->daoEspiao());
        $service->setPasswordHasher($hasher);

        $salvo = $service->saveSystemUser($this->usuario());
        $this->assertSame(self::HASH_ATUAL, $salvo->getUserPassword());
    }

    public function testU21SenhaVaziaRemoveOHash(): void
    {
        $hasher = $this->createMock(PasswordHash::class);
        $hasher->expects($this->never())->method('hash');

        $service = new UserService();
        $service->setUserDao($this->daoEspiao());
        $service->setPasswordHasher($hasher);

        $user = $this->usuario();
        $user->getDecorator()->setNonHashedPassword('');
        $this->assertNull($service->saveSystemUser($user)->getUserPassword());
    }

    public function testU22NovaSenhaEHasheadaEApagadaDoDecorador(): void
    {
        $hasher = $this->createMock(PasswordHash::class);
        $hasher->expects($this->once())->method('hash')
            ->with('Senha@Forte2026x')
            ->willReturn('$2y$12$novoHash');

        $service = new UserService();
        $service->setUserDao($this->daoEspiao());
        $service->setPasswordHasher($hasher);

        $user = $this->usuario();
        $user->getDecorator()->setNonHashedPassword('Senha@Forte2026x');
        $salvo = $service->saveSystemUser($user);

        $this->assertSame('$2y$12$novoHash', $salvo->getUserPassword());
        $this->assertNull($salvo->getDecorator()->getNonHashedPassword(), 'senha em claro não pode ficar na entidade');
    }

    public function testU22bHashRealVerificaASenha(): void
    {
        // Mesmo caso com o PasswordHash real: o oráculo é a verificação bcrypt, não um valor fixo.
        $service = new UserService();
        $service->setUserDao($this->daoEspiao());

        $user = $this->usuario();
        $user->getDecorator()->setNonHashedPassword('Senha@Forte2026x');
        $salvo = $service->saveSystemUser($user);

        $this->assertNotSame('Senha@Forte2026x', $salvo->getUserPassword());
        $this->assertTrue((new PasswordHash())->verify('Senha@Forte2026x', $salvo->getUserPassword()));
    }

    // ---------- Papéis atribuíveis

    private function papel(int $id, string $nome): UserRole
    {
        $role = new UserRole();
        $role->setId($id);
        $role->setName($nome);
        return $role;
    }

    public function testU23IdsDosPapeisAtribuiveis(): void
    {
        $dao = $this->createMock(UserDao::class);
        $dao->method('getAssignableUserRoles')->willReturn([$this->papel(1, 'Admin'), $this->papel(2, 'ESS')]);
        $service = new UserService();
        $service->setUserDao($dao);

        $this->assertSame([1, 2], $service->getAssignableUserRoleIds());
    }

    public function testU23bSemPapeisAtribuiveis(): void
    {
        $dao = $this->createMock(UserDao::class);
        $dao->method('getAssignableUserRoles')->willReturn([]);
        $service = new UserService();
        $service->setUserDao($dao);

        $this->assertSame([], $service->getAssignableUserRoleIds());
    }

    // ---------- Usuários que não podem ser excluídos

    private function serviceComUsuarioLogado(?User $logado): UserService
    {
        $this->createKernelWithMockServices([Services::CLASS_HELPER => new ClassHelper()]);
        $manager = $this->getMockBuilder(BasicUserRoleManager::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['getUser'])
            ->getMock();
        $manager->method('getUser')->willReturn($logado);
        $this->getContainer()->set(Services::USER_ROLE_MANAGER, $manager);
        return new UserService();
    }

    public function testU24UsuarioLogadoNaoPodeSerExcluido(): void
    {
        $logado = new User();
        $logado->setId(7);
        $this->assertSame([7], $this->serviceComUsuarioLogado($logado)->getUndeletableUserIds());
    }

    public function testU25SemUsuarioLogadoNenhumIdBloqueado(): void
    {
        $this->assertSame([], $this->serviceComUsuarioLogado(null)->getUndeletableUserIds());
    }

    // ---------- Senha atual (usada na troca de senha da própria conta)

    public function testU26SenhaAtualNulaNuncaConfere(): void
    {
        $user = $this->usuario();
        $user->setUserPassword(null);   // ex.: conta criada só para login social (OIDC)
        $dao = $this->createMock(UserDao::class);
        $dao->method('getSystemUser')->with(10)->willReturn($user);
        $service = new UserService();
        $service->setUserDao($dao);

        $this->assertFalse($service->isCurrentPassword(10, ''));
    }
}
