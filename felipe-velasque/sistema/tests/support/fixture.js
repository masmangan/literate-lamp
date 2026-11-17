const { expect } = require('@playwright/test');

const BASE_URL = (process.env.OHRM_BASE_URL || 'http://localhost:8200/web/index.php').replace(/\/$/, '');
const ADMIN_USER = process.env.OHRM_USER || 'Admin';
const ADMIN_PASSWORD = process.env.OHRM_PASSWORD || 'Admin@OHRM123';

// Guardrail: testes criam e EXCLUEM funcionários. Nunca apontar para a demo pública.
const host = new URL(BASE_URL).hostname;
if (!['localhost', '127.0.0.1', 'host.docker.internal'].includes(host)) {
  throw new Error('Testes destrutivos permitidos somente contra OrangeHRM local isolado.');
}

const api = (path) => `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

async function login(page) {
  await page.goto(api('/auth/login'));
  await page.locator('input[name="username"]').fill(ADMIN_USER);
  await page.locator('input[name="password"]').fill(ADMIN_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/dashboard\/index/, { timeout: 20000 });
}

async function createTestEmployee(page) {
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  const response = await page.request.post(api('/api/v2/pim/employees'), {
    data: { firstName: 'T2', middleName: '', lastName: `Dependents${suffix}`,
      employeeId: `T2D${Math.random().toString(36).slice(2, 9)}` },
  });
  if (!response.ok()) {
    throw new Error(`Não foi possível criar funcionário fictício: HTTP ${response.status()}, ${
      (await response.text()).slice(0, 500)}`);
  }
  const result = await response.json();
  const empNumber = result?.data?.empNumber;
  if (!Number.isInteger(empNumber)) {
    throw new Error('Resposta de criação sem data.empNumber inteiro');
  }
  return empNumber;
}

async function deleteTestEmployee(page, empNumber) {
  if (!empNumber) return;
  const result = await page.request.delete(api('/api/v2/pim/employees'), {
    data: { ids: [empNumber] },
  });
  if (!result.ok()) {
    throw new Error(`Limpeza do funcionário de teste ${empNumber} falhou: HTTP ${result.status()}`);
  }
}

async function listDependents(page, empNumber) {
  const response = await page.request.get(api(`/api/v2/pim/employees/${empNumber}/dependents?limit=50`));
  if (!response.ok()) {
    throw new Error(`Consulta de dependentes falhou: HTTP ${response.status()}`);
  }
  return (await response.json()).data;
}

async function createDependentAPI(page, empNumber, name, relationshipType = 'child', relationship = '') {
  const result = await page.request.post(api(`/api/v2/pim/employees/${empNumber}/dependents`), {
    data: {name, relationshipType, relationship, dateOfBirth: null},
  });
  if (!result.ok()) {
    throw new Error(`Preparação de dependente falhou: HTTP ${result.status()}, ${(await result.text()).slice(0, 300)}`);
  }
  return (await result.json()).data;
}

module.exports = { BASE_URL, api, login, createTestEmployee, deleteTestEmployee,
  listDependents, createDependentAPI };
