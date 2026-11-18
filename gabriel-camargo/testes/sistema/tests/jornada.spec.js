// S01 — jornada completa (docs/02-plano-de-testes.md, tabela 2.2): conceder, ajustar e revogar acesso.
const { test, expect } = require('@playwright/test');
const { ADMIN, entrar, sair, campo, escolher, escolherFuncionario, toast, buscarUsuario, api } = require('./apoio');

const id = Date.now().toString(36).slice(-5);
const SOBRENOME = `Teste${id}`;
const USUARIO = `joana.${id}`;
const SENHA = 'Senha@Forte2026x';

test.describe.configure({ mode: 'serial' });

test('S01 administradora concede, ajusta e revoga o acesso de uma funcionária', async ({ page, browser }) => {
  // Pré-condição: funcionária cadastrada no PIM e sem conta
  await entrar(page, ADMIN.usuario, ADMIN.senha);
  await expect(page).toHaveURL(/dashboard/);
  const sut = api(page);
  const empNumber = await sut.criarFuncionario('Joana', SOBRENOME);

  try {
    await test.step('passos 2–4: criar a conta ESS pelo formulário', async () => {
      await page.goto('admin/viewSystemUsers');
      await page.getByRole('button', { name: 'Add' }).click();
      await expect(page.getByRole('heading', { name: 'Add User' })).toBeVisible();
      await escolher(page, 'User Role', 'ESS');
      await escolherFuncionario(page, `Joana ${SOBRENOME}`);
      await escolher(page, 'Status', 'Enabled');
      await campo(page, 'Username').locator('input').fill(USUARIO);
      await campo(page, 'Password').locator('input').fill(SENHA);
      await campo(page, 'Confirm Password').locator('input').fill(SENHA);
      await expect(page.locator('.oxd-input-field-error-message')).toHaveCount(0);
      await page.getByRole('button', { name: 'Save' }).click();
      await toast(page, 'Successfully Saved');
      await expect(page).toHaveURL(/admin\/viewSystemUsers/);
    });

    await test.step('passo 5: a busca encontra a conta com papel e status corretos', async () => {
      const linhas = await buscarUsuario(page, USUARIO);
      await expect(linhas).toHaveCount(1);
      await expect(linhas.first()).toContainText(USUARIO);
      await expect(linhas.first()).toContainText('ESS');
      await expect(linhas.first()).toContainText(`Joana ${SOBRENOME}`);
      await expect(linhas.first()).toContainText('Enabled');
    });

    const joana = await browser.newContext();
    const paginaJoana = await joana.newPage();

    await test.step('passo 6: Joana entra e vê apenas o menu de ESS', async () => {
      await entrar(paginaJoana, USUARIO, SENHA);
      await expect(paginaJoana).toHaveURL(/dashboard/);
      const menu = paginaJoana.locator('aside nav');
      await expect(menu).toContainText('My Info');
      await expect(menu.getByText('Admin', { exact: true })).toHaveCount(0);
    });

    await test.step('passo 7: Carla desativa a conta', async () => {
      const linhas = await buscarUsuario(page, USUARIO);
      await linhas.first().locator('button:has(i.bi-pencil-fill)').click();
      await expect(page.getByRole('heading', { name: 'Edit User' })).toBeVisible();
      await expect(campo(page, 'Username').locator('input')).toHaveValue(USUARIO);
      await escolher(page, 'Status', 'Disabled');
      await page.getByRole('button', { name: 'Save' }).click();
      await toast(page, 'Successfully Updated');
      await expect((await buscarUsuario(page, USUARIO)).first()).toContainText('Disabled');
    });

    await test.step('passo 8: a sessão aberta de Joana deixa de valer e o login é recusado', async () => {
      await paginaJoana.goto('pim/viewMyDetails');
      await expect(paginaJoana).toHaveURL(/auth\/login/);
      await entrar(paginaJoana, USUARIO, SENHA);
      await expect(paginaJoana.locator('.oxd-alert-content-text')).toHaveText('Account disabled');
      await joana.close();
    });

    await test.step('passo 9: Carla exclui a conta', async () => {
      const linhas = await buscarUsuario(page, USUARIO);
      await linhas.first().locator('button:has(i.bi-trash)').click();
      await page.getByRole('button', { name: 'Yes, Delete' }).click();
      await toast(page, 'Successfully Deleted');
      await expect(await buscarUsuario(page, USUARIO)).toHaveCount(0);
      await expect(page.getByText('No Records Found').first()).toBeVisible();
    });
  } finally {
    await sut.excluirUsuarios((await sut.usuariosChamados(USUARIO)).map((u) => u.id));
    await sut.excluirFuncionarios([empNumber]);
  }
  await sair(page);
});
