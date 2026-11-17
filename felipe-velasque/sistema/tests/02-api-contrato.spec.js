const {test, expect} = require('@playwright/test');
const {api, login, createTestEmployee, deleteTestEmployee, listDependents} = require('./support/fixture');

// Testes de integração HTTP -> API -> persistência, reaproveitando o login do navegador.
test.describe('T2 / Dependents — integração REST', () => {
  let employeeNumber;
  test.beforeEach(async ({page}) => {
    await login(page);
    employeeNumber = await createTestEmployee(page);
  });
  test.afterEach(async ({page}) => {
    await deleteTestEmployee(page, employeeNumber);
  });

  const postDependent = (page, id, body) => page.request.post(
    api(`/api/v2/pim/employees/${id}/dependents`), {data: body}
  );

  test('IT-API-01: cria, consulta e edita dependente pelo REST', async ({page}) => {
    const created = await postDependent(page, employeeNumber, {
      name: 'T2 API Initial', relationshipType: 'child', relationship: '', dateOfBirth: null,
    });
    expect(created.ok()).toBeTruthy();
    const dependentId = (await created.json()).data.id;
    expect(Number(dependentId)).toBeGreaterThan(0);
    const fetched = await page.request.get(api(`/api/v2/pim/employees/${employeeNumber}/dependents/${dependentId}`));
    expect(fetched.ok()).toBeTruthy();
    expect((await fetched.json()).data.name).toBe('T2 API Initial');

    const changed = await page.request.put(api(`/api/v2/pim/employees/${employeeNumber}/dependents/${dependentId}`), {
      data: {name: 'T2 API Changed', relationshipType: 'other', relationship: 'Sibling', dateOfBirth: null},
    });
    expect(changed.ok()).toBeTruthy();
    const records = await listDependents(page, employeeNumber);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({name: 'T2 API Changed', relationshipType: 'other'});
  });

  test('IT-API-02: boundary 100 caracteres aceito e 101 rejeitado', async ({page}) => {
    const accepted = await postDependent(page, employeeNumber, {
      name: 'N'.repeat(100), relationshipType: 'child', relationship: '', dateOfBirth: null,
    });
    expect(accepted.ok()).toBeTruthy();
    const invalid = await postDependent(page, employeeNumber, {
      name: 'N'.repeat(101), relationshipType: 'child', relationship: '', dateOfBirth: null,
    });
    expect(invalid.status()).toBeGreaterThanOrEqual(400);
    expect(invalid.status()).toBeLessThan(500);
    expect(await listDependents(page, employeeNumber)).toHaveLength(1);
  });

  test('IT-API-03: tipo inválido não persiste dependente', async ({page}) => {
    const invalid = await postDependent(page, employeeNumber, {
      name: 'T2 Invalid', relationshipType: 'unsupported', relationship: '', dateOfBirth: null,
    });
    expect(invalid.status()).toBeGreaterThanOrEqual(400);
    expect(invalid.status()).toBeLessThan(500);
    expect(await listDependents(page, employeeNumber)).toHaveLength(0);
  });
});
