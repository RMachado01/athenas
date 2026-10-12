/**
 * OAuth do Google Agenda (fluxo SEPARADO do login — ADR-005). Funções puras + fetch injetável,
 * para testar sem rede.
 *
 * Como funciona, em 4 passos:
 *  1. Geramos um `state` (anti-falsificação) e um par PKCE (verifier secreto + challenge público).
 *  2. Mandamos a pessoa ao Google com o challenge e os escopos MÍNIMOS (só leitura nesta etapa).
 *  3. O Google devolve um `code`; conferimos o `state` e trocamos o code pelo token, provando
 *     com o verifier que fomos nós que começamos o pedido.
 *  4. Guardamos o refresh token (longa duração) no Vault; o access token (1 h) nunca é guardado.
 */

export const ESCOPOS_ETAPA_1 = [
  "https://www.googleapis.com/auth/calendar.events.readonly",
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
] as const;

const URL_AUTORIZACAO = "https://accounts.google.com/o/oauth2/v2/auth";
const URL_TOKEN = "https://oauth2.googleapis.com/token";
const URL_REVOGAR = "https://oauth2.googleapis.com/revoke";

type Fetch = typeof fetch;

/** Texto aleatório seguro em base64url (sem "=", "+", "/"). */
export function aleatorioBase64Url(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return paraBase64Url(buf);
}

function paraBase64Url(buf: Uint8Array): string {
  let bin = "";
  for (const b of buf) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** PKCE (RFC 7636): challenge = base64url(SHA-256(verifier)). */
export async function gerarPkce(): Promise<{ verifier: string; challenge: string }> {
  const verifier = aleatorioBase64Url(48);
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return { verifier, challenge: paraBase64Url(new Uint8Array(hash)) };
}

export function montarUrlDeAutorizacao(p: {
  clientId: string;
  redirectUri: string;
  state: string;
  challenge: string;
  escopos?: readonly string[];
  email?: string | null;
}): string {
  const url = new URL(URL_AUTORIZACAO);
  url.searchParams.set("client_id", p.clientId);
  url.searchParams.set("redirect_uri", p.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", (p.escopos ?? ESCOPOS_ETAPA_1).join(" "));
  // offline + consent: é o que faz o Google devolver um refresh token.
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", p.state);
  url.searchParams.set("code_challenge", p.challenge);
  url.searchParams.set("code_challenge_method", "S256");
  if (p.email) url.searchParams.set("login_hint", p.email);
  return url.toString();
}

export class ErroOAuth extends Error {
  constructor(
    /** "invalid_grant" = token revogado/expirado: pedir para reconectar. */
    readonly codigo: string,
    mensagem: string,
  ) {
    super(mensagem);
    this.name = "ErroOAuth";
  }
}

async function postarFormulario(f: Fetch, url: string, campos: Record<string, string>) {
  const resposta = await f(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(campos).toString(),
  });
  const corpo = (await resposta.json().catch(() => ({}))) as Record<string, unknown>;
  if (!resposta.ok) {
    const codigo = typeof corpo.error === "string" ? corpo.error : `http_${resposta.status}`;
    throw new ErroOAuth(codigo, `Google OAuth respondeu ${resposta.status} (${codigo})`);
  }
  return corpo;
}

export interface TokensIniciais {
  refreshToken: string;
  accessToken: string;
  escopos: string[];
}

/** Passo 3: troca o `code` pelo par de tokens. Exige refresh token e os escopos pedidos. */
export async function trocarCodigo(
  f: Fetch,
  p: {
    code: string;
    verifier: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  },
): Promise<TokensIniciais> {
  const corpo = await postarFormulario(f, URL_TOKEN, {
    code: p.code,
    code_verifier: p.verifier,
    client_id: p.clientId,
    client_secret: p.clientSecret,
    redirect_uri: p.redirectUri,
    grant_type: "authorization_code",
  });
  const refreshToken = typeof corpo.refresh_token === "string" ? corpo.refresh_token : "";
  const accessToken = typeof corpo.access_token === "string" ? corpo.access_token : "";
  const escopos = typeof corpo.scope === "string" ? corpo.scope.split(" ").filter(Boolean) : [];
  if (!refreshToken || !accessToken) {
    throw new ErroOAuth("sem_refresh_token", "O Google não devolveu o refresh token.");
  }
  const faltando = ESCOPOS_ETAPA_1.filter((e) => !escopos.includes(e));
  if (faltando.length > 0) {
    // A pessoa pode desmarcar caixas na tela do Google: sem leitura, não há o que sincronizar.
    throw new ErroOAuth("escopos_negados", `Permissões não concedidas: ${faltando.join(", ")}`);
  }
  return { refreshToken, accessToken, escopos };
}

/** Pede um access token novo (1 h) a partir do refresh token. */
export async function renovarAcesso(
  f: Fetch,
  p: { refreshToken: string; clientId: string; clientSecret: string },
): Promise<string> {
  const corpo = await postarFormulario(f, URL_TOKEN, {
    refresh_token: p.refreshToken,
    client_id: p.clientId,
    client_secret: p.clientSecret,
    grant_type: "refresh_token",
  });
  if (typeof corpo.access_token !== "string") {
    throw new ErroOAuth("sem_access_token", "O Google não devolveu o access token.");
  }
  return corpo.access_token;
}

/** Revoga no Google (ao desconectar). Falha aqui não impede apagar os dados do nosso lado. */
export async function revogar(f: Fetch, token: string): Promise<void> {
  await f(`${URL_REVOGAR}?token=${encodeURIComponent(token)}`, { method: "POST" }).catch(
    () => undefined,
  );
}
