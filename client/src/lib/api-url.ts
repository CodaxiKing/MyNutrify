/**
 * Resolve a URL base da API.
 *
 * Na web o client e o servidor são servidos na mesma origem, então caminhos
 * relativos (`/api/...`) bastam. Dentro do APK a WebView roda em
 * `http://localhost` com os arquivos empacotados: um caminho relativo bateria
 * na própria WebView e nunca chegaria ao servidor.
 *
 * A ordem de resolução é:
 *
 *   1. O que o usuário configurou na tela "Servidor" (localStorage).
 *   2. `VITE_API_BASE_URL`, embutida no build.
 *   3. A origem atual (comportamento da versão web).
 *
 * O passo 1 existe para o APK não ficar preso ao endereço do build: o IP da
 * máquina muda, o servidor migra para a nuvem, e nada disso deve exigir um
 * APK novo.
 */

const STORAGE_KEY = "mynutrify:api-base-url";

const BUILD_TIME_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();

/** Remove barras finais para a concatenação não gerar `//api`. */
function clean(url: string | undefined | null): string {
  return url ? url.trim().replace(/\/+$/, "") : "";
}

/** Endereço salvo pelo usuário, se houver. */
export function getStoredApiBaseUrl(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage indisponível (modo privado, cota cheia).
    return null;
  }
}

/**
 * Grava o endereço do servidor.
 *
 * Passe `null` para voltar ao padrão do build. Recarrega a página para que
 * todas as queries em cache sejam refeitas contra o novo servidor.
 */
export function setStoredApiBaseUrl(url: string | null): void {
  try {
    if (url && url.trim()) {
      localStorage.setItem(STORAGE_KEY, clean(url));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Sem persistência, a configuração vale só para esta sessão.
  }
}

/** Base efetiva em uso. String vazia significa "mesma origem". */
export function getApiBaseUrl(): string {
  return clean(getStoredApiBaseUrl()) || clean(BUILD_TIME_BASE) || "";
}

/** Endereço embutido no build, exibido como sugestão na tela de configuração. */
export const BUILD_API_BASE_URL = clean(BUILD_TIME_BASE);

/**
 * True quando o app roda empacotado (APK), onde caminhos relativos não
 * alcançam servidor nenhum e o endereço precisa estar definido.
 */
export const isNativeApp =
  typeof window !== "undefined" &&
  (window.location.protocol === "capacitor:" ||
    // A WebView do Capacitor no Android serve os arquivos locais em
    // http(s)://localhost sem porta; o dev server da web usa uma porta.
    (window.location.hostname === "localhost" && window.location.port === ""));

/**
 * Monta a URL de um endpoint.
 *
 * @param path Caminho começando com `/` (ex.: `/api/meals`).
 */
export function apiUrl(path: string): string {
  // URLs absolutas passam direto — úteis para serviços externos.
  if (/^https?:\/\//i.test(path)) return path;

  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalized}`;
}

/**
 * Testa se um endereço responde como um servidor do MyNutrify.
 *
 * Usa `/api/food/sources`, que é público e barato — não depende de banco nem
 * de usuário autenticado.
 */
export async function testApiConnection(
  baseUrl: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const target = `${clean(baseUrl)}/api/food/sources`;

  try {
    const response = await fetch(target, { signal: AbortSignal.timeout(8000) });

    if (!response.ok) {
      return { ok: false, error: `O servidor respondeu ${response.status}.` };
    }

    const data = await response.json();

    // Confere que é mesmo o MyNutrify, e não outro serviço na mesma porta.
    if (!data || typeof data.taco !== "object") {
      return { ok: false, error: "Respondeu, mas não parece ser o MyNutrify." };
    }

    return { ok: true };
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      return { ok: false, error: "O servidor não respondeu a tempo." };
    }
    return {
      ok: false,
      error: "Não foi possível conectar. Confira o endereço e se o servidor está no ar.",
    };
  }
}

/**
 * `fetch` já com a URL resolvida e o token de sessão.
 *
 * Vários componentes chamam a API direto, sem passar pelo react-query. Este
 * wrapper garante que todos mandem `Authorization` e apontem para o servidor
 * configurado — esquecer um deles daria 401 só naquela tela.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  // Importado aqui dentro para não criar ciclo entre os dois módulos.
  const { authHeaders, handleUnauthorized } = await import("./auth-token");

  const response = await fetch(apiUrl(path), {
    ...init,
    headers: { ...authHeaders(), ...(init.headers ?? {}) },
    credentials: init.credentials ?? "include",
  });

  handleUnauthorized(response);
  return response;
}
