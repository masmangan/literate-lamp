<?php

namespace OrangeHRM\Tests\Admin\JornadaUsuarios\Support;

use OrangeHRM\Authentication\Service\PasswordStrengthService;

/**
 * Dublê (stub) de configuração: o PasswordStrengthService real, mas com a política de senha
 * fornecida no construtor em vez de lida do banco (ConfigService). Só os getters protegidos
 * de configuração são substituídos; toda a lógica de validação é a original.
 */
class PoliticaDeSenhaFixa extends PasswordStrengthService
{
    /** Política padrão de uma instalação nova do OrangeHRM 5.9 (tabela hs_hr_config). */
    public const PADRAO = [
        'min' => 8,
        'max' => 64,
        'minusculas' => 1,
        'maiusculas' => 1,
        'numeros' => 1,
        'especiais' => 1,
        'espacos' => 'false',
        'forca' => 'strong',
    ];

    private array $politica;

    public function __construct(array $sobrescrever = [])
    {
        $this->politica = array_merge(self::PADRAO, $sobrescrever);
    }

    protected function getMinLength(): int
    {
        return $this->politica['min'];
    }

    protected function getMaxLength(): int
    {
        return $this->politica['max'];
    }

    protected function getMinNoOfLowercaseLetters(): int
    {
        return $this->politica['minusculas'];
    }

    protected function getMinNoOfUppercaseLetters(): int
    {
        return $this->politica['maiusculas'];
    }

    protected function getMinNoOfNumbers(): int
    {
        return $this->politica['numeros'];
    }

    protected function getMinNoOfSpecialCharacters(): int
    {
        return $this->politica['especiais'];
    }

    protected function getIsSpacesAllowed(): string
    {
        return $this->politica['espacos'];
    }

    protected function getDefaultPasswordStrength(): string
    {
        return $this->politica['forca'];
    }
}
