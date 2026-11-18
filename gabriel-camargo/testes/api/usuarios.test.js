// Casos A01–A11 do plano (docs/02-plano-de-testes.md, seção 2.4.3).
// Pré-requisito: OrangeHRM no ar (ambiente/docker-compose.yml, porta 8300) ou OHRM_URL/OHRM_PASSWORD.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Sessao, sessaoAdmin, sufixo } from './cliente.js';

const SENHA = 'Senha@Forte2026x';
const id = sufixo();
let admin;
let funcionaria;            // empNumber da funcionária criada para a jornada
const criados = new Set();  // ids de usuários a remover no fim

async function criarUsuario(dados) {
  const r = await admin.api('/admin/users', {
    method: 'POST',
    body: { password: SENHA, status: true, userRoleId: 2, empNumber: funcionaria, ...dados },
  });
  if (r.status === 200) criados.add(r.json.data.id);
  return r;
}

async function atualizar(usuario, mudancas) {
  return admin.api(`/admin/users/${usuario.id}`, {
    method: 'PUT',
    body: {
      username: usuario.userName, password: '', changePassword: false,
      status: usuario.status, userRoleId: usuario.userRole.id, empNumber: usuario.employee.empNumber,
      ...mudancas,
    },
  });
}

before(async () => {
  admin = await sessaoAdmin();
  const r = await admin.api('/pim/employees', {
    method: 'POST',
    body: { firstName: 'Joana', middleName: '', lastName: `Teste${id}`, employeeId: `J${id}`.slice(0, 10) },
  });
  assert.equal(r.status, 200, 'pré-condição: criar funcionária no PIM');
  funcionaria = r.json.data.empNumber;
});

after(async () => {
  if (criados.size) await admin.api('/admin/users', { method: 'DELETE', body: { ids: [...criados] } });
  await admin.api('/pim/employees', { method: 'DELETE', body: { ids: [funcionaria] } });
});

describe('Conceder acesso', () => {
  test('A01 criar usuário ESS devolve o contrato completo', async () => {
    const r = await criarUsuario({ username: `joana.${id}` });
    assert.equal(r.status, 200);
    const u = r.json.data;
    assert.equal(typeof u.id, 'number');
    assert.equal(u.userName, `joana.${id}`);
    assert.equal(u.status, true);
    assert.equal(u.deleted, false);
    assert.deepEqual(u.userRole, { id: 2, name: 'ESS', displayName: 'ESS' });
    assert.equal(u.employee.empNumber, funcionaria);
    assert.ok(!('password' in u) && !('userPassword' in u), 'a senha nunca deve sair na resposta');
  });

  test('A02 busca por nome, papel e status encontra só o usuário criado', async () => {
    const q = new URLSearchParams({ username: `joana.${id}`, userRoleId: '2', status: 'true', limit: '50' });
    const r = await admin.api(`/admin/users?${q}`);
    assert.equal(r.status, 200);
    assert.equal(r.json.meta.total, 1);
    assert.equal(r.json.data[0].userName, `joana.${id}`);

    const desativados = await admin.api(`/admin/users?${new URLSearchParams({ username: `joana.${id}`, status: 'false' })}`);
    assert.equal(desativados.json.meta.total, 0);
  });

  test('A03 nome repetido é recusado e a validação assíncrona concorda', async () => {
    const r = await criarUsuario({ username: `joana.${id}` });
    assert.equal(r.status, 422);
    assert.deepEqual(r.json.error.data.invalidParamKeys, ['username']);

    const v = await admin.api(`/admin/validation/user-name?userName=joana.${id}`);
    assert.equal(v.json.data.valid, false);
    const livre = await admin.api(`/admin/validation/user-name?userName=livre.${id}`);
    assert.equal(livre.json.data.valid, true);
  });

  test('A04 papel Supervisor (não atribuível) é recusado', async () => {
    const r = await criarUsuario({ username: `sup.${id}`, userRoleId: 3 });
    assert.equal(r.status, 422);
    assert.deepEqual(r.json.error.data.invalidParamKeys, ['userRoleId']);
  });

  test('A05 usuário ESS não acessa a gestão de usuários', async () => {
    const ess = new Sessao();
    assert.equal((await ess.login(`joana.${id}`, SENHA)).ok, true, 'a nova conta deve conseguir entrar');
    const r = await ess.api('/admin/users');
    assert.equal(r.status, 403);
  });
});

describe('Ajustar e revogar acesso', () => {
  let conta;

  before(async () => {
    conta = (await criarUsuario({ username: `revoga.${id}` })).json.data;
  });

  test('A06 conta desativada não consegue entrar', async () => {
    assert.equal((await atualizar(conta, { status: false })).status, 200);
    const r = await new Sessao().login(conta.userName, SENHA);
    assert.equal(r.ok, false);
    assert.equal(r.erro, 'Account disabled');
    assert.equal((await atualizar(conta, { status: true })).status, 200); // reativa para o próximo caso
  });

  test('A07 desativar encerra uma sessão já aberta', async () => {
    const sessao = new Sessao();
    assert.equal((await sessao.login(conta.userName, SENHA)).ok, true);
    assert.equal((await sessao.api(`/pim/employees/${funcionaria}/personal-details`)).status, 200);

    await atualizar(conta, { status: false });
    const depois = await sessao.api(`/pim/employees/${funcionaria}/personal-details`);
    assert.equal(depois.status, 401);
  });

  test('A08 excluir remove a conta (GET passa a 404)', async () => {
    const r = await admin.api('/admin/users', { method: 'DELETE', body: { ids: [conta.id] } });
    assert.equal(r.status, 200);
    assert.deepEqual(r.json.data, [conta.id]);
    criados.delete(conta.id);
    assert.equal((await admin.api(`/admin/users/${conta.id}`)).status, 404);
  });

  test('A09 administrador não pode excluir a si mesmo', async () => {
    const eu = await admin.api(`/admin/users?${new URLSearchParams({ username: process.env.OHRM_USER ?? 'Admin' })}`);
    const meuId = eu.json.data[0].id;
    const r = await admin.api('/admin/users', { method: 'DELETE', body: { ids: [meuId] } });
    assert.equal(r.status, 422);
    assert.deepEqual(r.json.error.data.invalidParamKeys, ['ids']);
  });
});

describe('Espaços no nome de usuário (CA6)', () => {
  test('A10 nome com espaços nas pontas é recusado ou normalizado', async () => {
    const r = await criarUsuario({ username: `  esp.${id}  ` });
    assert.ok(
      r.status === 422 || r.json?.data?.userName === `esp.${id}`,
      `esperado 422 ou nome sem espaços; obtido ${r.status} com userName=${JSON.stringify(r.json?.data?.userName)}`,
    );
  });

  test('A11 não podem existir dois nomes visualmente iguais', async () => {
    const r = await criarUsuario({ username: `esp.${id}` });
    // lista sem filtro de nome: a busca por nome é exata e esconderia a conta com espaços
    const iguais = (await admin.api('/admin/users?limit=500'))
      .json.data.filter((u) => u.userName.trim() === `esp.${id}`);
    assert.ok(iguais.length <= 1, `existem ${iguais.length} usuários exibidos como "esp.${id}": ${iguais.map((u) => JSON.stringify(u.userName)).join(', ')}`);
    assert.ok(r.status === 200 || r.status === 422);
  });
});
