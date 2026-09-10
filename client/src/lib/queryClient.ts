import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { apiUrl } from "./api-url";
import { authHeaders, handleUnauthorized } from "./auth-token";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(apiUrl(url), {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...authHeaders(),
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // Um 401 significa sessão morta: limpar o token faz o app voltar ao login.
  handleUnauthorized(res);

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(apiUrl(queryKey.join("/") as string), {
      headers: authHeaders(),
      credentials: "include",
    });

    if (res.status === 401) {
      handleUnauthorized(res);
      if (unauthorizedBehavior === "returnNull") return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      // Com `staleTime: Infinity` + sem refetch no foco, o app nunca atualizava
      // depois do primeiro carregamento — um jejum iniciado no celular não
      // aparecia ao voltar para a aba. 30s de frescor é o suficiente para
      // evitar refetch em cascata sem congelar os dados.
      refetchOnWindowFocus: true,
      staleTime: 30_000,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
