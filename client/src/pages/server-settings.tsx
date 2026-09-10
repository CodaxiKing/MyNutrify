/**
 * Configuração do endereço do servidor.
 *
 * O APK só embala a interface — a API roda em outro lugar. Deixar esse
 * endereço editável aqui evita ter que recompilar o APK toda vez que o IP da
 * máquina muda ou que o servidor troca de casa.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Globe,
  Info,
  Loader2,
  RotateCcw,
  Server,
  XCircle,
} from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { ActionButton } from "@/components/ui/action-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { staggerContainer, staggerItem } from "@/lib/motion";
import {
  BUILD_API_BASE_URL,
  getApiBaseUrl,
  getStoredApiBaseUrl,
  setStoredApiBaseUrl,
  testApiConnection,
} from "@/lib/api-url";

type TestState =
  | { status: "idle" }
  | { status: "testing" }
  | { status: "ok" }
  | { status: "error"; message: string };

export interface ServerSettingsProps {
  /** Volta para a tela anterior; ausente quando é a primeira tela do app. */
  onBack?: () => void;
}

export default function ServerSettings({ onBack }: ServerSettingsProps) {
  const [url, setUrl] = useState(() => getStoredApiBaseUrl() ?? getApiBaseUrl());
  const [test, setTest] = useState<TestState>({ status: "idle" });

  const current = getApiBaseUrl();

  /** Aceita "192.168.1.9:5000" e completa o protocolo sozinho. */
  const normalize = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "";
    return /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  };

  const handleTest = async () => {
    const target = normalize(url);

    if (!target) {
      setTest({ status: "error", message: "Informe o endereço do servidor." });
      return;
    }

    setTest({ status: "testing" });
    const result = await testApiConnection(target);

    setTest(
      result.ok ? { status: "ok" } : { status: "error", message: result.error },
    );
  };

  const handleSave = () => {
    const target = normalize(url);
    setStoredApiBaseUrl(target || null);

    toast({
      title: "Servidor salvo",
      description: target || "Usando a mesma origem da página.",
    });

    // Recarrega para que todas as queries em cache refaçam contra o novo
    // endereço — invalidar uma a uma deixaria dados velhos na tela.
    window.setTimeout(() => window.location.reload(), 600);
  };

  const handleReset = () => {
    setStoredApiBaseUrl(null);
    setUrl(BUILD_API_BASE_URL);
    setTest({ status: "idle" });

    toast({ title: "Voltou ao padrão do build" });
    window.setTimeout(() => window.location.reload(), 600);
  };

  return (
    <PageShell
      title="Servidor"
      subtitle="Onde a API do MyNutrify está rodando"
      accent="brand"
      icon={<Server className="size-5" />}
      onBack={onBack}
    >
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="space-y-4"
      >
        <motion.div variants={staggerItem} className="surface-card space-y-4 p-5">
          <div className="space-y-1.5">
            <Label htmlFor="server-url">Endereço</Label>
            <Input
              id="server-url"
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                setTest({ status: "idle" });
              }}
              placeholder="192.168.1.9:5000"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="h-11 rounded-xl font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Pode escrever só <code className="font-mono">IP:porta</code> — o
              <code className="ml-1 font-mono">http://</code> é completado sozinho.
            </p>
          </div>

          {test.status !== "idle" && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex items-start gap-2 rounded-xl p-3 text-sm",
                test.status === "ok" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                test.status === "error" && "bg-destructive/10 text-destructive",
                test.status === "testing" && "bg-muted/60 text-muted-foreground",
              )}
            >
              {test.status === "testing" && <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" />}
              {test.status === "ok" && <CheckCircle2 className="mt-0.5 size-4 shrink-0" />}
              {test.status === "error" && <XCircle className="mt-0.5 size-4 shrink-0" />}

              <span className="leading-relaxed">
                {test.status === "testing" && "Testando conexão…"}
                {test.status === "ok" && "Conectado. Pode salvar."}
                {test.status === "error" && test.message}
              </span>
            </motion.div>
          )}

          <div className="flex gap-2.5">
            <ActionButton
              variant="outline"
              size="lg"
              full
              onClick={handleTest}
              loading={test.status === "testing"}
              icon={<Globe />}
            >
              Testar
            </ActionButton>

            <ActionButton variant="brand" size="lg" full onClick={handleSave}>
              Salvar
            </ActionButton>
          </div>
        </motion.div>

        {/* --------------------------------------------------------- estado */}
        <motion.div variants={staggerItem} className="surface-card space-y-3 p-5">
          <p className="section-label">Em uso agora</p>

          <p className="break-all font-mono text-sm">
            {current || "mesma origem da página"}
          </p>

          {BUILD_API_BASE_URL && (
            <>
              <p className="section-label pt-1">Padrão do build</p>
              <p className="break-all font-mono text-sm text-muted-foreground">
                {BUILD_API_BASE_URL}
              </p>
            </>
          )}

          {getStoredApiBaseUrl() && (
            <ActionButton
              variant="ghost"
              size="sm"
              full
              icon={<RotateCcw />}
              onClick={handleReset}
            >
              Voltar ao padrão
            </ActionButton>
          )}
        </motion.div>

        {/* ------------------------------------------------------- instruções */}
        <motion.div variants={staggerItem} className="surface-card p-5">
          <div className="mb-2.5 flex items-center gap-2">
            <Info className="size-4 text-muted-foreground" />
            <p className="section-label">Como descobrir o endereço</p>
          </div>

          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              Com o servidor rodando no seu PC (<code className="font-mono">npm run dev</code>),
              use o IP dele na rede e a porta 5000.
            </p>

            <div className="rounded-xl bg-muted/40 p-3">
              <p className="mb-1 text-xs font-medium text-foreground">Windows</p>
              <code className="block font-mono text-xs">ipconfig</code>
              <p className="mt-1 text-xs">Procure "Endereço IPv4" — algo como 192.168.1.9</p>
            </div>

            <div className="rounded-xl bg-muted/40 p-3">
              <p className="mb-1 text-xs font-medium text-foreground">Emulador Android</p>
              <code className="block font-mono text-xs">10.0.2.2:5000</code>
            </div>

            <p>
              O celular precisa estar na <strong className="text-foreground">mesma Wi-Fi</strong> do
              PC. Se hospedar a API na internet, use a URL <code className="font-mono">https://</code>{" "}
              dela aqui.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </PageShell>
  );
}
