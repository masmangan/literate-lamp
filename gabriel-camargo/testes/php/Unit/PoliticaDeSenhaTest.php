<?php

namespace OrangeHRM\Tests\Admin\JornadaUsuarios\Unit;

use OrangeHRM\Authentication\Dto\UserCredential;
use OrangeHRM\Authentication\Utility\PasswordStrengthValidation as Forca;
use OrangeHRM\Framework\Services;
use OrangeHRM\I18N\Service\I18NHelper;
use OrangeHRM\Tests\Admin\JornadaUsuarios\Support\PoliticaDeSenhaFixa;
use OrangeHRM\Tests\Util\KernelTestCase;

/**
 * Casos U01–U16 do plano (docs/02-plano-de-testes.md, seção 2.4.1).
 * Unidade sob teste: PasswordStrengthService::checkPasswordPolicies / isValidPassword.
 * A força (score do zxcvbn) é um parâmetro do método, então é controlada diretamente pelo teste.
 *
 * @group JornadaUsuarios
 * @group Unit
 */
class PoliticaDeSenhaTest extends KernelTestCase
{
    private const MIN = 'auth.password_min_length';
    private const MAX = 'auth.password_max_length';
    private const MINUSC = 'auth.password_n_lowercase_letters';
    private const MAIUSC = 'auth.password_n_uppercase_letters';
    private const NUM = 'auth.password_n_numbers';
    private const ESP = 'auth.password_n_special_characters';
    private const ESPACO = 'auth.password_spaces_not_allowed';
    private const FRACA = 'auth.password_could_be_guessable';

    protected function setUp(): void
    {
        // Dublê do I18NHelper: devolve a própria chave, para o oráculo não depender do idioma.
        $i18n = $this->getMockBuilder(I18NHelper::class)->onlyMethods(['trans'])->getMock();
        $i18n->method('trans')->willReturnArgument(0);
        $this->createKernelWithMockServices([Services::I18N_HELPER => $i18n]);
    }

    private function mensagens(string $senha, int $forca = Forca::STRONGEST, array $politica = []): array
    {
        return (new PoliticaDeSenhaFixa($politica))
            ->checkPasswordPolicies(new UserCredential('joana.teste', $senha), $forca);
    }

    /** Senha que satisfaz todas as regras, completada com 'k' até o tamanho pedido. */
    private static function senhaComTamanho(int $n): string
    {
        return str_pad('Aa1@', $n, 'k');
    }

    // ---------- Valor-limite do tamanho: [0..7] inválida | [8..64] válida | [65..) inválida

    public function dataProviderTamanho(): array
    {
        return [
            'U01 7 caracteres (abaixo do mínimo)' => [7, [self::MIN]],
            'U02 8 caracteres (no mínimo)' => [8, []],
            'U03 64 caracteres (no máximo)' => [64, []],
            'U04 65 caracteres (acima do máximo)' => [65, [self::MAX]],
        ];
    }

    /**
     * @dataProvider dataProviderTamanho
     */
    public function testLimitesDeTamanho(int $tamanho, array $esperado): void
    {
        $senha = self::senhaComTamanho($tamanho);
        $this->assertSame($tamanho, strlen($senha));
        $this->assertSame($esperado, $this->mensagens($senha));
    }

    // ---------- Partições por regra de composição: cada caso viola exatamente uma regra

    public function dataProviderComposicao(): array
    {
        return [
            'U05 sem minúscula' => ['AAAA1@KK', [], [self::MINUSC]],
            'U06 sem maiúscula' => ['aaaa1@kk', [], [self::MAIUSC]],
            'U07 sem número' => ['Aaaa@kkk', [], [self::NUM]],
            'U08 sem caractere especial' => ['Aaaa1kkk', [], [self::ESP]],
            'U09 com espaço, espaços proibidos' => ['Aa1@ kkk', [], [self::ESPACO]],
            'U10 com espaço, espaços permitidos' => ['Aa1@ kkk', ['espacos' => 'true'], []],
        ];
    }

    /**
     * @dataProvider dataProviderComposicao
     */
    public function testRegrasDeComposicao(string $senha, array $politica, array $esperado): void
    {
        $this->assertSame($esperado, $this->mensagens($senha, Forca::STRONGEST, $politica));
    }

    public function testU11SenhaVaziaViolaTodasAsRegrasMasNaoAForca(): void
    {
        $this->assertSame(
            [self::MIN, self::MINUSC, self::MAIUSC, self::NUM, self::ESP],
            $this->mensagens('', Forca::VERY_WEAK)
        );
    }

    // ---------- Tabela de decisão: regra de força só aparece quando nenhuma outra regra falhou

    public function testU12ForcaAbaixoDaExigidaComRegrasOk(): void
    {
        $this->assertSame([self::FRACA], $this->mensagens('Aa1@kkkk', Forca::BETTER));
    }

    public function testU13ForcaBaixaESemNumeroMostraSoARegra(): void
    {
        $this->assertSame([self::NUM], $this->mensagens('Aaaa@kkk', Forca::VERY_WEAK));
    }

    public function testU14MinimosNegativosSaoTratadosComoZero(): void
    {
        $politica = ['min' => -1, 'minusculas' => -3, 'maiusculas' => -1, 'numeros' => -1, 'especiais' => -1];
        $this->assertSame([], $this->mensagens('a', Forca::STRONGEST, $politica));
    }

    /**
     * U15 — tabela de decisão completa: nível exigido × score obtido.
     * Regra esperada: aceita ⇔ score >= índice do nível (veryWeak=0 … strongest=4).
     */
    public function dataProviderForcaExigida(): array
    {
        $niveis = ['veryWeak', 'weak', 'better', 'strong', 'strongest'];
        $casos = [];
        foreach ($niveis as $indice => $nivel) {
            for ($score = Forca::VERY_WEAK; $score <= Forca::STRONGEST; $score++) {
                $casos["U15 exige $nivel, score $score"] = [$nivel, $score, $score >= $indice];
            }
        }
        return $casos;
    }

    /**
     * @dataProvider dataProviderForcaExigida
     */
    public function testU15TabelaDeForca(string $nivel, int $score, bool $aceita): void
    {
        $msgs = $this->mensagens('Aa1@kkkk', $score, ['forca' => $nivel]);
        $this->assertSame($aceita ? [] : [self::FRACA], $msgs);
    }

    /**
     * U16 — consistência entre os dois métodos públicos: isValidPassword ⇔ nenhuma mensagem.
     */
    public function dataProviderConsistencia(): array
    {
        $casos = [];
        foreach (array_merge($this->dataProviderTamanho()) as $nome => [$n]) {
            $casos[$nome] = [self::senhaComTamanho($n), Forca::STRONGEST, []];
        }
        foreach ($this->dataProviderComposicao() as $nome => [$senha, $politica]) {
            $casos[$nome] = [$senha, Forca::STRONGEST, $politica];
        }
        $casos['força baixa'] = ['Aa1@kkkk', Forca::BETTER, []];
        $casos['vazia'] = ['', Forca::VERY_WEAK, []];
        return $casos;
    }

    /**
     * @dataProvider dataProviderConsistencia
     */
    public function testU16IsValidPasswordConsistenteComMensagens(string $senha, int $forca, array $politica): void
    {
        $servico = new PoliticaDeSenhaFixa($politica);
        $credencial = new UserCredential('joana.teste', $senha);
        $this->assertSame(
            count($servico->checkPasswordPolicies($credencial, $forca)) === 0,
            $servico->isValidPassword($credencial, $forca)
        );
    }
}
