// S02–S07 — validações do formulário "Add User" e da exclusão.
const { test, expect } = require('@playwright/test');
const { ADMIN, entrar, campo, escolher, escolherFuncionario, erroDe, buscarUsuario, api } = require('./apoio');

const id = Date.now().toString(36).slice(-5);
const SOBRENOME = `Form${id}`;
let empNumber;

test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
  await entrar(page, ADMIN.usuario, ADMIN.senha);
  await expect(page).toHaveURL(/dashboard/);
});

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  await entrar(page, ADMIN.usuario, ADMIN.senha);
  empNumber = await api(page).criarFuncionario('Rita', SOBRENOME);
  await page.close();
});

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  await entrar(page, ADMIN.usuario, ADMIN.senha);
  const sut = api(page);
  for (const nome of [`rita.${id}`, `abcd`, `  abcd  `]) {
    await sut.excluirUsuarios((await sut.usuariosChamados(nome)).filter((u) => u.employee.empNumber === empNumber).map((u) => u.id));
  }
  await sut.excluirFuncionarios([empNumber]);
  await page.close();
});

async function abrirFormulario(page) {
  await page.goto('admin/saveSystemUser');
  await expect(page.getByRole('heading', { name: 'Add User' })).toBeVisible();
}

test('S02 salvar o formulário vazio marca todos os obrigatórios', async ({ page }) => {
  await abrirFormulario(page);
  await page.getByRole('button', { name: 'Save' }).click();
  for (const rotulo of ['User Role', 'Employee Name', 'Status', 'Username', 'Password']) {
    await expect(erroDe(page, rotulo), rotulo).toHaveText('Required');
  }
});

test('S03 nome com 4 caracteres é recusado (limite inferior)', async ({ page }) => {
  await abrirFormulario(page);
  await campo(page, 'Username').locator('input').fill('abcd');
  await expect(erroDe(page, 'Username')).toHaveText('Should be at least 5 characters');
  await campo(page, 'Username').locator('input').fill('abcde');
  await expect(erroDe(page, 'Username')).toHaveCount(0);
});

test('S04 nome já existente é apontado antes de salvar', async ({ page }) => {
  await abrirFormulario(page);
  await campo(page, 'Username').locator('input').fill(ADMIN.usuario);
  await expect(erroDe(page, 'Username')).toHaveText('Already exists');
});

test('S05 confirmação diferente da senha é recusada', async ({ page }) => {
  await abrirFormulario(page);
  await campo(page, 'Password').locator('input').fill('Senha@Forte2026x');
  await campo(page, 'Confirm Password').locator('input').fill('Senha@Forte2026y');
  await expect(erroDe(page, 'Confirm Password')).toHaveText('Passwords do not match');
});

test('S06 cancelar o diálogo de exclusão mantém a conta', async ({ page }) => {
  const usuario = `rita.${id}`;
  await abrirFormulario(page);
  await escolher(page, 'User Role', 'ESS');
  await escolherFuncionario(page, `Rita ${SOBRENOME}`);
  await escolher(page, 'Status', 'Enabled');
  await campo(page, 'Username').locator('input').fill(usuario);
  await campo(page, 'Password').locator('input').fill('Senha@Forte2026x');
  await campo(page, 'Confirm Password').locator('input').fill('Senha@Forte2026x');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page).toHaveURL(/admin\/viewSystemUsers/);

  const linhas = await buscarUsuario(page, usuario);
  await linhas.first().locator('button:has(i.bi-trash)').click();
  await expect(page.getByText('Are you Sure?')).toBeVisible();
  await page.getByRole('button', { name: 'No, Cancel' }).click();
  await expect(await buscarUsuario(page, usuario)).toHaveCount(1);
});

test('S07 nome "  abcd  " (4 letras + espaços) deve ser recusado no próprio campo', async ({ page }) => {
  // A UI envia username.trim() para a API, mas mede o tamanho ANTES do trim.
  // Esperado (CA6): mesma mensagem do S03. Ver defeito D2 no relatório de execução.
  await abrirFormulario(page);
  await escolher(page, 'User Role', 'ESS');
  await escolherFuncionario(page, `Rita ${SOBRENOME}`);
  await escolher(page, 'Status', 'Enabled');
  await campo(page, 'Username').locator('input').fill('  abcd  ');
  await campo(page, 'Password').locator('input').fill('Senha@Forte2026x');
  await campo(page, 'Confirm Password').locator('input').fill('Senha@Forte2026x');
  await page.waitForTimeout(800); // validação assíncrona do nome (debounce de 500 ms)
  await expect.soft(erroDe(page, 'Username')).toHaveText('Should be at least 5 characters', { timeout: 3000 });

  // Se o campo não acusar o erro, o formulário é enviado: registramos o que o usuário vê.
  const post = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('/api/v2/admin/users'), { timeout: 5000 }).catch(() => null);
  await page.getByRole('button', { name: 'Save' }).click();
  const resposta = await post;
  if (resposta) {
    test.info().annotations.push({ type: 'D2', description: `POST ${resposta.request().postData()} -> ${resposta.status()}` });
  }
  await expect.soft(page.locator('.oxd-toast').filter({ hasText: 'Invalid Parameter' }), 'erro genérico sem indicar o campo').toHaveCount(0);
});
