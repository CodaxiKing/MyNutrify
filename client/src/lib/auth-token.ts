/**
 * Token de sessão no client.
 *
 * Guardado no `localStorage` e enviado em `Authorization: Bearer` a cada
 * requisição. Token em vez de cookie porque o APK conversa com a API em outra
 * origem — cookies cross-site exigiriam HTTPS com `SameSite=None` e se
 * comportam de forma imprevisível dentro da WebView.
 */

const STORAGE_KEY = "mynutrify:auth-token";

/** Notifica o app quando o token muda (login, logout, 401). */
type Listener = (token: string | null) => void;
const listeners = new Set<Listener>();

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage indisponível (modo privado). A sessão vale só para esta aba.
    return memoryToken;
  }
}

/** Espelho em memória para quando o localStorage não está acessível. */
let memoryToken: string | null = null;

export function setAuthToken(token: string | null): void {
  memoryToken = token;

  try {
    if (token) {
      localStorage.setItem(STORAGE_KEY, token);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Segue apenas com o valor em memória.
  }

  for (const listener of listeners) listener(token);
}

export function onAuthTokenChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Cabeçalho de autorização, ou objeto vazio quando não há sessão. */
export function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Trata uma resposta 401.
 *
 * Limpa o token para o app cair na tela de login. Devolve `true` quando a
 * resposta era de fato um 401, para quem chamou não seguir processando.
 */
export function handleUnauthorized(response: Response): boolean {
  if (response.status !== 401) return false;

  if (getAuthToken()) setAuthToken(null);
  return true;
}
