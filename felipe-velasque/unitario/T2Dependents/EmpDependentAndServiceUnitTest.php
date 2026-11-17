<?php

/**
 * Testes novos e independentes para o T2 (PIM / Dependents).
 * Copiar este arquivo para:
 * src/plugins/orangehrmPimPlugin/test/T2Dependents/EmpDependentAndServiceUnitTest.php
 * no CLONE ORIGINAL do OrangeHRM, não na pasta do fork da turma.
 * Requer dependências PHP/Composer do OrangeHRM, PHPUnit 9.
 */

namespace OrangeHRM\Tests\Pim\T2Dependents;

use DateTime;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;
use OrangeHRM\Core\Exception\ServiceException;
use OrangeHRM\Entity\EmpDependent;
use OrangeHRM\Pim\Dao\EmployeeDependentDao;
use OrangeHRM\Pim\Dto\EmployeeDependentSearchFilterParams;
use OrangeHRM\Pim\Service\EmployeeDependentService;
use RuntimeException;

/**
 * @group Pim
 * @group T2Dependents
 * @group Unit
 */
class EmpDependentAndServiceUnitTest extends TestCase
{
    /** @dataProvider validRelationshipTypes */
    public function testAcceptsKnownRelationshipTypes(string $type): void
    {
        $dependent = new EmpDependent();
        $dependent->setRelationshipType($type);
        $this->assertSame($type, $dependent->getRelationshipType());
    }

    public static function validRelationshipTypes(): array
    {
        return [['child'], ['other']];
    }

    /** @dataProvider invalidRelationshipTypes */
    public function testRejectsUnknownRelationshipTypes(?string $type): void
    {
        $dependent = new EmpDependent();
        $this->expectException(InvalidArgumentException::class);
        $dependent->setRelationshipType($type);
    }

    public static function invalidRelationshipTypes(): array
    {
        return [['spouse'], [''], [null]];
    }

    public function testDateOfBirthMayBeNullOrDate(): void
    {
        $dependent = new EmpDependent();
        $this->assertNull($dependent->getDateOfBirth());
        $date = new DateTime('2014-05-20');
        $dependent->setDateOfBirth($date);
        $this->assertSame($date, $dependent->getDateOfBirth());
    }

    public function testServiceDelegatesSaveToDaoOnce(): void
    {
        $dependent = new EmpDependent();
        $dao = $this->createMock(EmployeeDependentDao::class);
        $dao->expects($this->once())
            ->method('saveEmployeeDependent')
            ->with($this->identicalTo($dependent))
            ->willReturn($dependent);

        $service = new EmployeeDependentService();
        $service->setEmployeeDependentDao($dao);
        $this->assertSame($dependent, $service->saveEmployeeDependent($dependent));
    }

    public function testServiceDelegatesDeletionWithEmployeeAndIds(): void
    {
        $dao = $this->createMock(EmployeeDependentDao::class);
        $dao->expects($this->once())
            ->method('deleteEmployeeDependents')
            ->with(4, [1, 2])
            ->willReturn(2);

        $service = new EmployeeDependentService();
        $service->setEmployeeDependentDao($dao);
        $this->assertSame(2, $service->deleteEmployeeDependents(4, [1, 2]));
    }

    public function testServiceWrapsDaoSearchException(): void
    {
        $params = new EmployeeDependentSearchFilterParams();
        $params->setEmpNumber(4);
        $dao = $this->createMock(EmployeeDependentDao::class);
        $dao->expects($this->once())
            ->method('searchEmployeeDependent')
            ->with($this->identicalTo($params))
            ->willThrowException(new RuntimeException('simulated database failure'));

        $service = new EmployeeDependentService();
        $service->setEmployeeDependentDao($dao);
        $this->expectException(ServiceException::class);
        $service->searchEmployeeDependent($params);
    }
}
