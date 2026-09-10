/**
 * CORS para os clientes nativos.
 *
 * Na web o client é servido pelo próprio Express, então tudo é mesma origem e
 * CORS nunca entrou em cena. Dentro do APK a WebView roda em `http://localhost`
 * (Android) ou `capacitor://localhost` (iOS) e chama a API em outra origem —
 * sem estes cabeçalhos o navegador bloqueia a leitura de toda resposta.
 *
 * Como o client usa `credentials: "include"`, o `Access-Control-Allow-Origin`
 * precisa ecoar uma origem específica: o coringa `*` é rejeitado junto de
 * credenciais.
 */

import type { RequestHandler } from "express";

/** Origens das WebViews do Capacitor, sempre liberadas. */
const NATIVE_ORIGINS = [
  "http://localhost",
  "https://localhost",
  "capacitor://localhost",
  "ionic://localhost",
];

/**
 * Origens extras liberadas por ambiente, separadas por vírgula.
 * Ex.: `CORS_ORIGINS=https://app.mynutrify.com,https://staging.mynutrify.com`
 */
const EXTRA_ORIGINS = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const ALLOWED = new Set([...NATIVE_ORIGINS, ...EXTRA_ORIGINS]);

/** Libera qualquer `http://<host>:<porta>` em desenvolvimento. */
function isDevOrigin(origin: string): boolean {
  if (process.env.NODE_ENV === "production") return false;

  try {
    const { protocol, hostname } = new URL(origin);
    if (protocol !== "http:") return false;

    // localhost, 10.0.2.2 (host visto do emulador) e IPs de rede privada.
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "10.0.2.2" ||
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(hostname)
    );
  } catch {
    return false;
  }
}

export const cors: RequestHandler = (req, res, next) => {
  const origin = req.headers.origin;

  // Requisição de mesma origem (a web): nada a fazer.
  if (!origin) return next();

  if (ALLOWED.has(origin) || isDevOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    // A resposta muda conforme a origem; sem isso um cache intermediário
    // poderia servir os cabeçalhos de uma origem para outra.
    res.setHeader("Vary", "Origin");
  }

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      req.headers["access-control-request-headers"] ?? "Content-Type,Authorization",
    );
    res.setHeader("Access-Control-Max-Age", "86400");
    return res.sendStatus(204);
  }

  next();
};
