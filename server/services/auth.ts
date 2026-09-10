/**
 * Autenticação: hash de senha e sessões por token.
 *
 * Usa `scrypt` do módulo `crypto` do próprio Node em vez de bcrypt ou argon2.
 * Os dois exigem compilação nativa, o que quebra ou atrasa deploy em
 * plataformas como Render e Railway — scrypt é resistente a hardware
 * dedicado, faz parte da runtime e não adiciona dependência nenhuma.
 */

import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/** Validade de uma sessão sem uso. Renovada a cada requisição autenticada. */
export const SESSION_TTL_DAYS = 90;

/**
 * Gera o hash de uma senha.
 *
 * Formato: `scrypt$<salt-hex>$<hash-hex>` — carrega o algoritmo junto para que
 * uma troca futura possa reconhecer e migrar hashes antigos.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

/**
 * Confere uma senha contra o hash guardado.
 *
 * A comparação é feita em tempo constante: comparar com `===` vazaria
 * informação pelo tempo de resposta.
 */
export async function verifyPassword(
  password: string,
  stored: string | null,
): Promise<boolean> {
  if (!stored) return false;

  const [algorithm, saltHex, hashHex] = stored.split("$");
  if (algorithm !== "scrypt" || !saltHex || !hashHex) return false;

  try {
    const expected = Buffer.from(hashHex, "hex");
    const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);

    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/**
 * Cria um token de sessão.
 *
 * Devolve o token que vai para o client e o hash que fica no banco — o token
 * em si nunca é persistido.
 */
export function createSessionToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

/** SHA-256 do token. Rápido de propósito: o token já tem 256 bits de entropia. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Data de expiração de uma sessão criada agora. */
export function sessionExpiry(): Date {
  return new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * Extrai o token do cabeçalho `Authorization: Bearer <token>`.
 */
export function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;

  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}
