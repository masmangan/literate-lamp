const { test, expect } = require('@playwright/test');
const {
  api, login, createTestEmployee, deleteTestEmployee, listDependents, createDependentAPI,
} = require('./support/fixture');

const form = (page) => page.locator('.orangehrm-edit-employee-content form').first();
const field = (page, label) => form(page).locator('.oxd-input-group')
  .filter({has: page.locator('label').filter({hasText: label})}).first();
const rowNamed = (page, name) => page.locator('.oxd-table-card').filter({hasText: name});
// A tela também contém o cabeçalho de Attachments; restringir o seletor à seção correta.
const dependentsHeader = (page) => page.locator('.orangehrm-action-header')
  .filter({hasText: 'Assigned Dependents'});

async function openDependents(page, empNumber) {
  await page.goto(api(`/pim/viewDependents/empNumber/${empNumber}`));
  await expect(dependentsHeader(page)).toBeVisible();
}
async function clickAdd(page) {
  // O nome acessível do botão inclui o glifo do ícone (" Add"); exact:true nunca casa.
  await dependentsHeader(page).getByRole('button', {name: /\bAdd$/}).click();
  await expect(page.getByText('Add Dependent', {exact: true})).toBeVisible();
}
async function selectRelationship(page, type) {
  await form(page).locator('.oxd-select-text').first().click();
  await page.locator('.oxd-select-dropdown').getByText(type, {exact: true}).click();
}
async function saveForm(page) {
  await form(page).getByRole('button', {name: 'Save'}).click();
}

// Os casos ST são de sistema (UI real + backend + banco).
test.describe('T2 / PIM — Dependents: sistema', () => {
  let employeeNumber;
  test.beforeEach(async ({page}) => {
    await login(page);
    employeeNumber = await createTestEmployee(page);
    await openDependents(page, employeeNumber);
  });
  test.afterEach(async ({page}) => {
    await deleteTestEmployee(page, employeeNumber);
  });

  test('ST-01: cadastra Child e persiste após recarregar', async ({page}) => {
    await clickAdd(page);
    await field(page, 'Name').locator('input').fill('T2 Filho A');
    await selectRelationship(page, 'Child');
    await saveForm(page);
    await expect.poll(async () => (await listDependents(page, employeeNumber)).length).toBe(1);
    await page.reload();
    await expect(rowNamed(page, 'T2 Filho A')).toBeVisible();
    const stored = await listDependents(page, employeeNumber);
    expect(stored[0]).toMatchObject({name: 'T2 Filho A', relationshipType: 'child'});
  });

  test('ST-02: Relationship Other torna Please Specify obrigatório', async ({page}) => {
    await clickAdd(page);
    await field(page, 'Name').locator('input').fill('T2 Outro A');
    await selectRelationship(page, 'Other');
    await expect(field(page, 'Please Specify')).toBeVisible();
    await saveForm(page);
    await expect(field(page, 'Please Specify').locator('.oxd-input-field-error-message')).toBeVisible();
    expect(await listDependents(page, employeeNumber)).toHaveLength(0);
    await field(page, 'Please Specify').locator('input').fill('Sibling');
    await saveForm(page);
    await expect.poll(async () => (await listDependents(page, employeeNumber)).length).toBe(1);
    expect((await listDependents(page, employeeNumber))[0]).toMatchObject({
      relationshipType: 'other', relationship: 'Sibling',
    });
  });

  test('ST-03: nome obrigatório — não cria registro vazio', async ({page}) => {
    await clickAdd(page);
    await selectRelationship(page, 'Child');
    await saveForm(page);
    await expect(field(page, 'Name').locator('.oxd-input-field-error-message')).toBeVisible();
    expect(await listDependents(page, employeeNumber)).toHaveLength(0);
  });

  test('ST-04: cancelar cadastro não persiste dados', async ({page}) => {
    await clickAdd(page);
    await field(page, 'Name').locator('input').fill('T2 Cancelado');
    await selectRelationship(page, 'Child');
    await form(page).getByRole('button', {name: 'Cancel'}).click();
    await expect(page.getByText('Add Dependent', {exact: true})).toHaveCount(0);
    expect(await listDependents(page, employeeNumber)).toHaveLength(0);
  });

  test('ST-05: editar atualiza registro sem duplicar', async ({page}) => {
    await createDependentAPI(page, employeeNumber, 'T2 Antes');
    await page.reload();
    await expect(rowNamed(page, 'T2 Antes')).toBeVisible();
    await rowNamed(page, 'T2 Antes').locator('button').last().click();
    await expect(page.getByText('Edit Dependent', {exact: true})).toBeVisible();
    // O formulário de edição carrega o registro de forma assíncrona; preencher antes
    // disso faz o valor carregado sobrescrever o digitado.
    await expect(field(page, 'Name').locator('input')).toHaveValue('T2 Antes');
    await field(page, 'Name').locator('input').fill('T2 Depois');
    await saveForm(page);
    await expect.poll(async () => (await listDependents(page, employeeNumber))[0]?.name).toBe('T2 Depois');
    await page.reload();
    await expect(rowNamed(page, 'T2 Depois')).toBeVisible();
    expect(await listDependents(page, employeeNumber)).toHaveLength(1);
  });

  test('ST-06: cancelar exclusão preserva; confirmar exclusão remove', async ({page}) => {
    await createDependentAPI(page, employeeNumber, 'T2 Excluir');
    await page.reload();
    const item = rowNamed(page, 'T2 Excluir');
    await expect(item).toBeVisible();
    await item.locator('button').first().click();
    await page.getByRole('button', {name: 'No, Cancel'}).click();
    expect(await listDependents(page, employeeNumber)).toHaveLength(1);
    await item.locator('button').first().click();
    await page.getByRole('button', {name: 'Yes, Delete'}).click();
    await expect.poll(async () => (await listDependents(page, employeeNumber)).length).toBe(0);
    await page.reload();
    await expect(rowNamed(page, 'T2 Excluir')).toHaveCount(0);
  });

  test('ST-07: 101 caracteres no nome são rejeitados', async ({page}) => {
    await clickAdd(page);
    await selectRelationship(page, 'Child');
    await field(page, 'Name').locator('input').fill('N'.repeat(101));
    await saveForm(page);
    await expect(field(page, 'Name').locator('.oxd-input-field-error-message')).toBeVisible();
    expect(await listDependents(page, employeeNumber)).toHaveLength(0);
  });
});
