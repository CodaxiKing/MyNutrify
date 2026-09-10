/**
 * Estado de autenticação do client.
 */

import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiUrl } from "@/lib/api-url";
import {
  getAuthToken,
  onAuthTokenChange,
  setAuthToken,
} from "@/lib/auth-token";
import type { PublicUser } from "@shared/schema";

export interface AuthResponse {
  token: string;
  user: PublicUser;
}

/** Erro de autenticação com a mensagem que o servidor devolveu. */
export class AuthError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/** Lê a resposta do servidor e transforma falhas em AuthError. */
async function parseAuthResponse(response: Response): Promise<AuthResponse> {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const fieldErrors = data?.errors as Record<string, string[]> | undefined;
    const firstFieldError = fieldErrors
      ? Object.values(fieldErrors).flat()[0]
      : undefined;

    throw new AuthError(
      firstFieldError ?? data?.message ?? "Não foi possível completar a operação.",
      data?.error,
    );
  }

  return data as AuthResponse;
}

/** Token atual, reativo a login e logout. */
export function useAuthToken(): string | null {
  const [token, setToken] = useState(() => getAuthToken());

  useEffect(() => onAuthTokenChange(setToken), []);

  return token;
}

/** Usuário logado, ou null. */
export function useCurrentUser() {
  const token = useAuthToken();

  return useQuery<PublicUser | null>({
    queryKey: ["/api/auth/me", token],
    queryFn: async () => {
      if (!token) return null;

      const response = await apiFetch("/api/auth/me");
      if (response.status === 401) return null;
      if (!response.ok) throw new Error("Falha ao carregar o usuário");

      return response.json();
    },
    // O token faz parte da chave, então trocar de conta recarrega sozinho.
    staleTime: 60_000,
  });
}

/** Se o servidor aceita novos cadastros. */
export function useRegistrationOpen() {
  return useQuery<{ registrationOpen: boolean }>({
    queryKey: ["/api/auth/config"],
    queryFn: async () => {
      const response = await fetch(apiUrl("/api/auth/config"));
      if (!response.ok) throw new Error("Falha ao consultar o servidor");
      return response.json();
    },
    staleTime: 5 * 60_000,
  });
}

export function useAuthActions() {
  const queryClient = useQueryClient();

  /** Guarda o token e descarta o cache do usuário anterior. */
  const applySession = useCallback(
    (result: AuthResponse) => {
      setAuthToken(result.token);
      queryClient.clear();
      return result.user;
    },
    [queryClient],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      return applySession(await parseAuthResponse(response));
    },
    [applySession],
  );

  const register = useCallback(
    async (input: {
      email: string;
      password: string;
      firstName?: string;
    }) => {
      const response = await fetch(apiUrl("/api/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      return applySession(await parseAuthResponse(response));
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    // Avisa o servidor para invalidar a sessão, mas não deixa uma falha de
    // rede impedir o logout local.
    await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);

    setAuthToken(null);
    queryClient.clear();
  }, [queryClient]);

  return { login, register, logout };
}
