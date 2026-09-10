import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Configuração do app nativo.
 *
 * O APK empacota apenas o client (`dist/public`). A API Express continua
 * rodando em um servidor — o endereço é definido em tempo de build pela
 * variável `VITE_API_BASE_URL` (ver `client/src/lib/api-url.ts`).
 */
const config: CapacitorConfig = {
  appId: "app.mynutrify",
  appName: "MyNutrify",
  webDir: "dist/public",
  android: {
    // Necessário enquanto a API é acessada por HTTP em rede local.
    // Em produção, use HTTPS e remova esta permissão.
    allowMixedContent: true,
  },
  server: {
    androidScheme: "http",
    // Libera o tráfego em texto puro para o servidor de desenvolvimento na LAN.
    cleartext: true,
  },
};

export default config;
