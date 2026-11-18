import { test, expect, Page } from '@playwright/test';

/**
 * Testes de sistema: jornada "abrir uma nova vaga" (Recruitment -> Vacancies -> Add)
 * Alvo: servidor demo do OrangeHRM (compartilhado e reiniciado periodicamente).
 * IMPORTANTE: os seletores abaixo sao um ponto de partida; confirme com `npx playwright codegen`.
 */

const BASE = 'https://opensource-demo.orangehrmlive.com';

// Nome unico por execucao (limite da interface: 50 caracteres)
const uniq = () => `QA-Caio-${Date.now()}`;

// Campo do formulario localizado pelo texto do rotulo
const field = (page: Page, label: string) =>
  page.locator('.oxd-input-group', { hasText: label });

async function login(page: Page) {
  await page.goto(`${BASE}/web/index.php/auth/login`);
  await page.getByPlaceholder('Username').fill('Admin');
  await page.getByPlaceholder('Password').fill('admin123');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/dashboard/);
}

async function openAddVacancy(page: Page) {
  await page.goto(`${BASE}/web/index.php/recruitment/addJobVacancy`);
  await expect(page.getByRole('heading', { name: 'Add Vacancy' })).toBeVisible();
}

async function expectSaved(page: Page) {
  await expect(page).toHaveURL(/recruitment\/addJobVacancy\/\d+/);
  await expect(page.getByRole('heading', { name: 'Edit Vacancy' })).toBeVisible();
}

async function selectJobTitle(page: Page) {
  await field(page, 'Job Title').locator('.oxd-select-text').click();
  // Escolhe a primeira opcao real (a 0 e "-- Select --")
  await page.getByRole('option').nth(1).click();
}

async function selectHiringManager(page: Page, hint = 'a') {
  await field(page, 'Hiring Manager').getByPlaceholder('Type for hints...').fill(hint);
  // Espera a lista real carregar (ignora a linha "Searching...")
  const option = page
    .locator('.oxd-autocomplete-option')
    .filter({ hasNotText: 'Searching' })
    .first();
  await expect(option).toBeVisible();
  await option.click();
}

/** Preenche o formulario com valores validos; sobrescreva o que quiser testar. */
async function fillVacancy(
  page: Page,
  opts: { name: string; positions?: string; selectManager?: boolean }
) {
  await field(page, 'Vacancy Name').locator('input').fill(opts.name);
  await selectJobTitle(page);
  if (opts.selectManager !== false) await selectHiringManager(page);
  if (opts.positions !== undefined) {
    await field(page, 'Number of Positions').locator('input').fill(opts.positions);
  }
}

test.describe('Jornada: abrir nova vaga', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await openAddVacancy(page);
  });

  // ST-01 | Caminho feliz
  test('ST-01: cria vaga com dados validos e ela aparece na listagem', async ({ page }) => {
    const name = uniq();
    await fillVacancy(page, { name, positions: '2' });
    await page.getByRole('button', { name: 'Save' }).click();
    await expectSaved(page);
    await page.goto(`${BASE}/web/index.php/recruitment/viewJobVacancy`);
    await expect(page.getByText(name)).toBeVisible();
  });

  // ST-02 | Valor-limite do nome (interface: max 50)
  test('ST-02a: nome com 50 caracteres e aceito', async ({ page }) => {
    const name = uniq().padEnd(50, 'x');
    expect(name.length).toBe(50);
    await fillVacancy(page, { name });
    await page.getByRole('button', { name: 'Save' }).click();
    await expectSaved(page);
  });

  test('ST-02b: nome com 51 caracteres e rejeitado', async ({ page }) => {
    const name = uniq().padEnd(51, 'x');
    expect(name.length).toBe(51);
    await fillVacancy(page, { name });
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Should not exceed 50 characters')).toBeVisible();
  });

  // ST-03 | Particao: nome vazio
  test('ST-03a: nome vazio e rejeitado', async ({ page }) => {
    await fillVacancy(page, { name: '' });
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(field(page, 'Vacancy Name').getByText('Required')).toBeVisible();
  });

  // ST-04 | Valor-limite de Number of Positions (interface: 1 a 99)
  for (const v of ['1', '99']) {
    test(`ST-04 valido: posicoes = ${v} e aceito`, async ({ page }) => {
      await fillVacancy(page, { name: uniq(), positions: v });
      await page.getByRole('button', { name: 'Save' }).click();
      await expectSaved(page);
    });
  }

  for (const v of ['0', '100', '-1', 'abc']) {
    test(`ST-04 invalido: posicoes = ${v} e rejeitado`, async ({ page }) => {
      await fillVacancy(page, { name: uniq(), positions: v });
      await page.getByRole('button', { name: 'Save' }).click();
      await expect(
        field(page, 'Number of Positions').locator('.oxd-input-field-error-message')
      ).toBeVisible();
    });
  }

  // ST-05 | Particao: gerente digitado sem selecionar da lista
  test('ST-05: gerente digitado sem selecionar e invalido', async ({ page }) => {
    await field(page, 'Vacancy Name').locator('input').fill(uniq());
    await selectJobTitle(page);
    await field(page, 'Hiring Manager').getByPlaceholder('Type for hints...').fill('Maria');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(field(page, 'Hiring Manager').getByText('Invalid')).toBeVisible();
  });
});
