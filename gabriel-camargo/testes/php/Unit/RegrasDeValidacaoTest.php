<?php

namespace OrangeHRM\Tests\Admin\JornadaUsuarios\Unit;

use OrangeHRM\Admin\Api\ValidationRules\UserRoleIdAssignableRule;
use OrangeHRM\Admin\Service\UserService;
use OrangeHRM\Authentication\Service\PasswordStrengthService;
use OrangeHRM\Core\Api\V2\Validator\Rules\Password;
use OrangeHRM\Framework\Services;
use OrangeHRM\Tests\Util\KernelTestCase;

/**
 * Casos U30–U34 do plano: regras de validação usadas pelo UserAPI.
 *
 * @group JornadaUsuarios
 * @group Unit
 */
class RegrasDeValidacaoTest extends KernelTestCase
{
    /** Registra um dublê de PasswordStrengthService que devolve as mensagens dadas. */
    private function politicaQueResponde(array $mensagens, bool $deveSerChamada = true): void
    {
        $politica = $this->getMockBuilder(PasswordStrengthService::class)
            ->onlyMethods(['checkPasswordPolicies'])
            ->getMock();
        $politica->expects($deveSerChamada ? $this->once() : $this->never())
            ->method('checkPasswordPolicies')
            ->willReturn($mensagens);
        $this->createKernelWithMockServices([Services::PASSWORD_STRENGTH_SERVICE => $politica]);
    }

    public function testU30RegraDesligadaQuandoNaoHaTrocaDeSenha(): void
    {
        $this->politicaQueResponde(['qualquer erro'], false);
        $this->assertTrue((new Password(false))->validate('x'));
    }

    public function testU31PadraoEValidarSenha(): void
    {
        $this->politicaQueResponde(['auth.password_min_length']);
        $this->assertFalse((new Password(null))->validate('x'));
    }

    public function testU31bSenhaSemMensagensEValida(): void
    {
        $this->politicaQueResponde([]);
        $this->assertTrue((new Password(true))->validate('Senha@Forte2026x'));
    }

    public function dataProviderPapel(): array
    {
        return [
            'U32 ESS (2) é atribuível' => [2, true],
            'U32b Admin (1) é atribuível' => [1, true],
            'U33 Supervisor (3) não é atribuível' => [3, false],
            'U33b id inexistente (99)' => [99, false],
            'U34 "2" como string' => ['2', false],
            'U34b null' => [null, false],
        ];
    }

    /**
     * @dataProvider dataProviderPapel
     */
    public function testPapelAtribuivel($papel, bool $esperado): void
    {
        $service = $this->createMock(UserService::class);
        $service->method('getAssignableUserRoleIds')->willReturn([1, 2]);
        $this->createKernelWithMockServices([Services::USER_SERVICE => $service]);

        $this->assertSame($esperado, (new UserRoleIdAssignableRule())->validate($papel));
    }
}
