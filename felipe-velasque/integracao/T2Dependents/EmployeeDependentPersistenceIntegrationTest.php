<?php

/**
 * Testes autorais de integração DAO <-> Doctrine <-> MariaDB, para o T2.
 * Executar SOMENTE no banco de TESTES do OrangeHRM; as fixtures reinicializam tabelas.
 */

namespace OrangeHRM\Tests\Pim\T2Dependents;

use InvalidArgumentException;
use OrangeHRM\Config\Config;
use OrangeHRM\Core\Traits\ORM\EntityManagerHelperTrait;
use OrangeHRM\Entity\EmpDependent;
use OrangeHRM\Entity\Employee;
use OrangeHRM\Pim\Dao\EmployeeDependentDao;
use OrangeHRM\Pim\Dto\EmployeeDependentSearchFilterParams;
use OrangeHRM\Tests\Util\TestCase;
use OrangeHRM\Tests\Util\TestDataService;

/**
 * @group Pim
 * @group T2Dependents
 * @group T2DependentsIntegration
 */
class EmployeeDependentPersistenceIntegrationTest extends TestCase
{
    use EntityManagerHelperTrait;

    private EmployeeDependentDao $dao;

    protected function setUp(): void
    {
        parent::setUp();
        $this->dao = new EmployeeDependentDao();
        // Banco isolado test_orangehrm_dev; a mesma fixture do teste ORIGINAL.
        $fixture = Config::get(Config::PLUGINS_DIR)
            . '/orangehrmPimPlugin/test/fixtures/EmpDependentDao.yml';
        TestDataService::populate($fixture);
        $this->getEntityManager()->clear();
    }

    private function newDependent(int $employeeNumber, string $name, ?string $sequence = null): EmpDependent
    {
        $dependent = new EmpDependent();
        $dependent->setEmployee($this->getEntityReference(Employee::class, $employeeNumber));
        $dependent->setName($name);
        $dependent->setRelationshipType(EmpDependent::RELATIONSHIP_TYPE_CHILD);
        if ($sequence !== null) {
            $dependent->setSeqNo($sequence);
        }
        return $dependent;
    }

    public function testAutoSequenceIsIndependentForEachEmployee(): void
    {
        // Fixture: funcionário 1 possui seq 1 e 2; funcionário 2 possui seq 1.
        $a = $this->dao->saveEmployeeDependent($this->newDependent(1, 'T2 Novo A'));
        $b = $this->dao->saveEmployeeDependent($this->newDependent(2, 'T2 Novo B'));

        $this->assertSame(3, (int) $a->getSeqNo());
        $this->assertSame(2, (int) $b->getSeqNo());
        $this->getEntityManager()->clear();
        $this->assertSame('T2 Novo A', $this->dao->getEmployeeDependent(1, 3)->getName());
        $this->assertSame('T2 Novo B', $this->dao->getEmployeeDependent(2, 2)->getName());
    }

    public function testDeleteCannotRemoveAnotherEmployeesSameSequence(): void
    {
        // Tanto o empregado 1 como o 2 têm dependente com seqNo=1.
        $this->assertSame(1, $this->dao->deleteEmployeeDependents(1, [1]));
        $this->getEntityManager()->clear();
        $this->assertNull($this->dao->getEmployeeDependent(1, 1));
        $this->assertNotNull($this->dao->getEmployeeDependent(1, 2));
        $other = $this->dao->getEmployeeDependent(2, 1);
        $this->assertNotNull($other);
        $this->assertSame('Achilles', $other->getName());
    }

    public function testDeletingOneSelectedIdPreservesOtherRows(): void
    {
        $this->assertSame(1, $this->dao->deleteEmployeeDependents(1, [2]));
        $this->getEntityManager()->clear();
        $this->assertNotNull($this->dao->getEmployeeDependent(1, 1));
        $this->assertNull($this->dao->getEmployeeDependent(1, 2));
        $this->assertNotNull($this->dao->getEmployeeDependent(2, 1));
    }

    public function testExistingIdsAreFilteredByEmployee(): void
    {
        $idsForA = $this->dao->getExistingDependentIdsForEmpNumber([1, 2, 90], 1);
        $idsForB = $this->dao->getExistingDependentIdsForEmpNumber([1, 2, 90], 2);
        $a = array_map('intval', $idsForA);
        $b = array_map('intval', $idsForB);
        sort($a);
        sort($b);
        $this->assertSame([1, 2], $a);
        $this->assertSame([1], $b);
    }

    public function testSearchAndCountRespectFiltersAndEmployee(): void
    {
        $params = new EmployeeDependentSearchFilterParams();
        $params->setEmpNumber(1);
        $params->setName('Abrahamson');
        $params->setRelationshipType('child');
        $matches = $this->dao->searchEmployeeDependent($params);
        $this->assertCount(1, $matches);
        $this->assertSame('Abrahamson', $matches[0]->getName());
        $this->assertSame(1, $this->dao->getSearchEmployeeDependentsCount($params));

        $params->setEmpNumber(2);
        $this->assertCount(0, $this->dao->searchEmployeeDependent($params));
        $this->assertSame(0, $this->dao->getSearchEmployeeDependentsCount($params));
    }

    public function testUpdatingExistingDependentDoesNotDuplicateRow(): void
    {
        $dependent = $this->dao->getEmployeeDependent(1, 2);
        $this->assertNotNull($dependent);
        $dependent->setName('T2 Nome Atualizado');
        $this->dao->saveEmployeeDependent($dependent);
        $this->getEntityManager()->clear();

        $reloaded = $this->dao->getEmployeeDependent(1, 2);
        $this->assertNotNull($reloaded);
        $this->assertSame('T2 Nome Atualizado', $reloaded->getName());
        $this->assertSame(2, count($this->dao->getEmployeeDependents(1)));
    }

    public function testSequenceNinetyNineIsAcceptedButNextAutomaticSequenceIsRejected(): void
    {
        $edge = $this->dao->saveEmployeeDependent($this->newDependent(2, 'T2 Limite', '99'));
        $this->assertSame(99, (int) $edge->getSeqNo());
        $this->getEntityManager()->clear();
        $this->assertNotNull($this->dao->getEmployeeDependent(2, 99));

        $this->expectException(InvalidArgumentException::class);
        // 99 é o maior seqNo. A geração seguinte tenta 100 e deve falhar.
        $this->dao->saveEmployeeDependent($this->newDependent(2, 'T2 Fora do limite'));
    }

    public function testDeletingUnknownIdReturnsZeroAndDoesNotAffectOtherEmployees(): void
    {
        $this->assertSame(0, $this->dao->deleteEmployeeDependents(1, [90]));
        $this->getEntityManager()->clear();
        $this->assertCount(2, $this->dao->getEmployeeDependents(1));
        $this->assertCount(1, $this->dao->getEmployeeDependents(2));
    }
}
