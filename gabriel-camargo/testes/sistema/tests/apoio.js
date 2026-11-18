// Page helpers para a interface OXD do OrangeHRM 5.
const { expect } = require('@playwright/test');

const ADMIN = { usuario: process.env.OHRM_USER ?? 'Admin', senha: process.env.OHRM_PASSWORD ?? 'Admin@OHRM123' };

async function entrar(page, usuario, senha) {
  await page.goto('auth/login');
  await page.getByPlaceholder('Username').fill(usuario);
  await page.getByPlaceholder('Password').fill(senha);
  await page.getByRole('button', { name: 'Login' }).click();
  // espera o redirecionamento terminar (dashboard ou volta ao login com mensagem)
  await page.waitForURL(/dashboard|auth\/login/);
  await page.waitForLoadState('networkidle');
}

async function sair(page) {
  await page.locator('.oxd-userdropdown-tab').click();
  await page.getByRole('menuitem', { name: 'Logout' }).click();
  await expect(page).toHaveURL(/auth\/login/);
}

/** Grupo de formulário (label + campo + mensagem de erro) pelo texto exato do label. */
function campo(page, rotulo) {
  return page.locator('.oxd-input-group').filter({ has: page.getByText(rotulo, { exact: true }) });
}

async function escolher(page, rotulo, opcao) {
  await campo(page, rotulo).locator('.oxd-select-text').click();
  await page.locator('.oxd-select-dropdown').getByRole('option', { name: opcao, exact: true }).click();
}

async function escolherFuncionario(page, nome) {
  const grupo = campo(page, 'Employee Name');
  await grupo.locator('input').fill(nome);
  const opcao = page.locator('.oxd-autocomplete-option').filter({ hasText: nome });
  await expect(opcao.first()).toBeVisible();
  await opcao.first().click();
}

function erroDe(page, rotulo) {
  return campo(page, rotulo).locator('.oxd-input-field-error-message');
}

async function toast(page, texto) {
  await expect(page.locator('.oxd-toast').filter({ hasText: texto })).toBeVisible();
}

/** Busca na lista de usuários e devolve as linhas da tabela. */
async function buscarUsuario(page, usuario) {
  await page.goto('admin/viewSystemUsers');
  await page.waitForLoadState('networkidle'); // carga inicial da lista (sem filtro)
  await campo(page, 'Username').locator('input').fill(usuario);
  const resposta = page.waitForResponse(
    (r) => r.url().includes('/api/v2/admin/users?') && r.url().includes('username=') && r.status() === 200,
  );
  await page.getByRole('button', { name: 'Search' }).click();
  await resposta;
  await page.waitForLoadState('networkidle');
  return page.locator('.oxd-table-card');
}

/** API do próprio SUT, reaproveitando o cookie de sessão do contexto (preparação e limpeza). */
function api(page) {
  const b = 'api/v2';
  return {
    criarFuncionario: async (primeiro, ultimo) => {
      const r = await page.request.post(`${b}/pim/employees`, { data: { firstName: primeiro, middleName: '', lastName: ultimo, employeeId: '' } });
      expect(r.ok()).toBeTruthy();
      return (await r.json()).data.empNumber;
    },
    excluirFuncionarios: (ids) => page.request.delete(`${b}/pim/employees`, { data: { ids } }),
    usuariosChamados: async (nome) => {
      const r = await page.request.get(`${b}/admin/users?limit=500`);
      return (await r.json()).data.filter((u) => u.userName.trim() === nome.trim());
    },
    excluirUsuarios: (ids) => ids.length && page.request.delete(`${b}/admin/users`, { data: { ids } }),
  };
}

module.exports = { ADMIN, entrar, sair, campo, escolher, escolherFuncionario, erroDe, toast, buscarUsuario, api };
