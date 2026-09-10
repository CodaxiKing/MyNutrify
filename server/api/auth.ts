/**
 * Rotas de cadastro, login e sessão.
 */

import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth, authed } from "../middleware/permissions";
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  type User,
  type PublicUser,
} from "@shared/schema";
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  hashToken,
  sessionExpiry,
  extractBearerToken,
} from "../services/auth";

/** Remove o hash da senha antes de qualquer resposta. */
function toPublicUser(user: User): PublicUser {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}

/**
 * Cadastro aberto ou fechado.
 *
 * Numa instância pessoal, deixar o cadastro aberto significa que qualquer um
 * que ache a URL cria conta no seu servidor. Com `ALLOW_REGISTRATION=false`
 * só é possível criar a primeira conta — depois disso o cadastro fecha.
 */
const REGISTRATION_MODE = (process.env.ALLOW_REGISTRATION ?? "first-user").toLowerCase();

async function registrationAllowed(): Promise<boolean> {
  if (REGISTRATION_MODE === "true") return true;
  if (REGISTRATION_MODE === "false") return false;

  // "first-user" (padrão): só até existir uma conta.
  return (await storage.countUsers()) === 0;
}

export function registerAuthRoutes(app: Express) {
  /** Informa ao client se a tela de cadastro deve aparecer. */
  app.get("/api/auth/config", async (_req, res) => {
    try {
      res.json({ registrationOpen: await registrationAllowed() });
    } catch (error) {
      console.error("Banco indisponível ao consultar cadastro:", error);
      res.status(503).json({ message: "O banco de dados está indisponível. Tente novamente em instantes." });
    }
  });

  /** Cria uma conta e já devolve a sessão. */
  app.post("/api/auth/register", async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Dados inválidos",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    if (!(await registrationAllowed())) {
      return res.status(403).json({
        error: "REGISTRATION_CLOSED",
        message: "O cadastro está fechado neste servidor.",
      });
    }

    const { email, password, firstName, lastName } = parsed.data;

    if (await storage.getUserByEmail(email)) {
      return res.status(409).json({
        error: "EMAIL_TAKEN",
        message: "Já existe uma conta com este e-mail.",
      });
    }

    const user = await storage.createUserWithPassword({
      email,
      passwordHash: await hashPassword(password),
      firstName: firstName ?? null,
      lastName: lastName ?? null,
    });

    const { token, tokenHash } = createSessionToken();
    await storage.createAuthSession({
      userId: user.id,
      tokenHash,
      userAgent: req.headers["user-agent"] ?? null,
      expiresAt: sessionExpiry(),
    });

    res.status(201).json({ token, user: toPublicUser(user) });
  });

  /** Autentica e devolve um token de sessão. */
  app.post("/api/auth/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Dados inválidos",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { email, password } = parsed.data;
    const user = await storage.getUserByEmail(email);

    // Mesma mensagem para e-mail inexistente e senha errada: dizer qual dos
    // dois falhou entrega quais e-mails têm conta no servidor.
    const invalid = () =>
      res.status(401).json({
        error: "INVALID_CREDENTIALS",
        message: "E-mail ou senha incorretos.",
      });

    if (!user) {
      // Gasta o mesmo tempo de um hash real para que a diferença de resposta
      // não revele se o e-mail existe.
      await verifyPassword(password, "scrypt$00$00");
      return invalid();
    }

    if (!(await verifyPassword(password, user.passwordHash))) {
      return invalid();
    }

    const { token, tokenHash } = createSessionToken();
    await storage.createAuthSession({
      userId: user.id,
      tokenHash,
      userAgent: req.headers["user-agent"] ?? null,
      expiresAt: sessionExpiry(),
    });

    res.json({ token, user: toPublicUser(user) });
  });

  /** Usuário da sessão atual. */
  app.get(
    "/api/auth/me",
    requireAuth,
    authed(async (req, res) => {
      const user = await storage.getUser(req.user.id);

      if (!user) {
        return res.status(401).json({ error: "INVALID_TOKEN", message: "Sessão inválida" });
      }

      res.json(toPublicUser(user));
    }),
  );

  /** Encerra a sessão atual. */
  app.post("/api/auth/logout", requireAuth, async (req, res) => {
    const token = extractBearerToken(req.headers.authorization);
    if (token) await storage.deleteAuthSession(hashToken(token));

    res.json({ success: true });
  });

  /** Troca a senha e derruba as demais sessões. */
  app.post(
    "/api/auth/change-password",
    requireAuth,
    authed(async (req, res) => {
      const parsed = changePasswordSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          message: "Dados inválidos",
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const user = await storage.getUser(req.user.id);

      if (!user || !(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
        return res.status(401).json({
          error: "INVALID_CREDENTIALS",
          message: "Senha atual incorreta.",
        });
      }

      await storage.setUserPassword(user.id, await hashPassword(parsed.data.newPassword));

      // Trocar a senha deve expulsar quem estiver logado em outros
      // dispositivos; o aparelho atual recebe uma sessão nova.
      await storage.deleteUserAuthSessions(user.id);

      const { token, tokenHash } = createSessionToken();
      await storage.createAuthSession({
        userId: user.id,
        tokenHash,
        userAgent: req.headers["user-agent"] ?? null,
        expiresAt: sessionExpiry(),
      });

      res.json({ token });
    }),
  );
}
