// Cliente HTTP mínimo para o OrangeHRM: autentica como o navegador (token CSRF + /auth/validate)
// e guarda o cookie de sessão para chamar a API REST v2.
export const BASE = (process.env.OHRM_URL ?? 'http://localhost:8300/web/index.php').replace(/\/$/, '');
export const ADMIN_USER = process.env.OHRM_USER ?? 'Admin';
export const ADMIN_PASSWORD = process.env.OHRM_PASSWORD ?? 'Admin@OHRM123';

export class Sessao {
  cookies = new Map();

  #guardarCookies(res) {
    for (const c of res.headers.getSetCookie()) {
      const [par] = c.split(';');
      const i = par.indexOf('=');
      this.cookies.set(par.slice(0, i), par.slice(i + 1));
    }
  }

  async http(caminho, { method = 'GET', body, form } = {}) {
    const headers = { Cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ') };
    let payload;
    if (form) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      payload = new URLSearchParams(form).toString();
    } else if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }
    const res = await fetch(BASE + caminho, { method, headers, body: payload, redirect: 'manual' });
    this.#guardarCookies(res);
    const texto = await res.text();
    let json = null;
    try { json = JSON.parse(texto); } catch { /* página HTML */ }
    return { status: res.status, json, texto, location: res.headers.get('location') ?? '' };
  }

  api(caminho, opcoes) {
    return this.http('/api/v2' + caminho, opcoes);
  }

  /** Faz login; devolve para onde o sistema redirecionou e a mensagem de erro exibida, se houver. */
  async login(usuario, senha) {
    const pagina = await this.http('/auth/login');
    const token = /:token="&quot;([^&]+)&quot;"/.exec(pagina.texto)?.[1];
    if (!token) throw new Error('token CSRF não encontrado na página de login');
    const r = await this.http('/auth/validate', { method: 'POST', form: { _token: token, username: usuario, password: senha } });
    const ok = r.location.includes('/dashboard');
    let erro = null;
    if (!ok) {
      const volta = await this.http('/auth/login');
      erro = /Account disabled|Invalid credentials/.exec(volta.texto)?.[0] ?? null;
    }
    return { ok, erro };
  }
}

export async function sessaoAdmin() {
  const s = new Sessao();
  const { ok } = await s.login(ADMIN_USER, ADMIN_PASSWORD);
  if (!ok) throw new Error(`não foi possível entrar como ${ADMIN_USER} em ${BASE}`);
  return s;
}

/** Sufixo curto e único por execução, para não colidir com dados existentes. */
export const sufixo = () => Date.now().toString(36).slice(-5) + Math.floor(Math.random() * 1e3);
