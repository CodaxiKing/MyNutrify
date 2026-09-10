/**
 * Login e cadastro.
 *
 * Uma tela só, alternando entre os dois modos — são os mesmos campos mais um.
 * O cadastro só aparece quando o servidor aceita novas contas
 * (`ALLOW_REGISTRATION`), o que numa instância pessoal significa "só a primeira".
 */

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, LogIn, Salad, Server, UserPlus } from "lucide-react";
import { Link } from "wouter";

import { ActionButton } from "@/components/ui/action-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { pageVariants } from "@/lib/motion";
import { AuthError, useAuthActions, useRegistrationOpen } from "@/hooks/use-auth";
import { getApiBaseUrl, isNativeApp } from "@/lib/api-url";

type Mode = "login" | "register";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login, register } = useAuthActions();
  const { data: config, isError: configError } = useRegistrationOpen();

  const registrationOpen = config?.registrationOpen ?? false;
  const isRegister = mode === "register";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (isRegister) {
        await register({ email, password, firstName: firstName.trim() || undefined });
        toast({ title: "Conta criada", description: "Bem-vindo ao MyNutrify!" });
      } else {
        await login(email, password);
        toast({ title: "Bem-vindo de volta" });
      }
      // O App troca de tela sozinho quando o token muda.
    } catch (caught) {
      const message =
        caught instanceof AuthError
          ? caught.message
          : "Não foi possível falar com o servidor. Confira o endereço nas configurações.";

      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="mobile-container flex min-h-screen flex-col bg-background"
    >
      {/* ------------------------------------------------------------ topo */}
      <header
        className="gradient-brand grain relative overflow-hidden rounded-b-[2rem] px-6 pb-12 text-white"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 3.5rem)" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-white/20 blur-3xl"
        />

        <div className="relative">
          <div className="glass-card mb-5 flex size-14 items-center justify-center rounded-2xl">
            <Salad className="size-7" />
          </div>

          <h1 className="font-display text-[2rem] font-bold leading-[1.08]">
            {isRegister ? (
              <>
                Criar conta
                <br />
                <span className="text-white/70">no MyNutrify.</span>
              </>
            ) : (
              <>
                Bem-vindo
                <br />
                <span className="text-white/70">de volta.</span>
              </>
            )}
          </h1>
        </div>
      </header>

      {/* --------------------------------------------------------- formulário */}
      <form onSubmit={handleSubmit} className="flex-1 space-y-4 px-4 py-6">
        <div className="surface-card space-y-4 p-5">
          <AnimatePresence initial={false}>
            {isRegister && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-1.5 pb-4">
                  <Label htmlFor="firstName">Como quer ser chamado</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    placeholder="Diego"
                    autoComplete="given-name"
                    className="h-11 rounded-xl"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError(null);
              }}
              placeholder="voce@email.com"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              className="h-11 rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError(null);
                }}
                placeholder={isRegister ? "Pelo menos 8 caracteres" : "Sua senha"}
                autoComplete={isRegister ? "new-password" : "current-password"}
                required
                className="h-11 rounded-xl pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-destructive/10 p-3 text-sm leading-relaxed text-destructive"
            >
              {error}
            </motion.p>
          )}

          <ActionButton
            type="submit"
            variant="brand"
            size="lg"
            full
            loading={submitting}
            icon={isRegister ? <UserPlus /> : <LogIn />}
          >
            {isRegister ? "Criar conta" : "Entrar"}
          </ActionButton>
        </div>

        {/* ------------------------------------------------ alternar o modo */}
        {registrationOpen && (
          <button
            type="button"
            onClick={() => {
              setMode(isRegister ? "login" : "register");
              setError(null);
            }}
            className="w-full py-2 text-center text-sm text-muted-foreground"
          >
            {isRegister ? (
              <>
                Já tem conta? <span className="font-semibold text-primary">Entrar</span>
              </>
            ) : (
              <>
                Primeira vez?{" "}
                <span className="font-semibold text-primary">Criar conta</span>
              </>
            )}
          </button>
        )}

        {!registrationOpen && !isRegister && !configError && (
          <p className="px-2 text-center text-xs leading-relaxed text-muted-foreground">
            Este servidor não está aceitando novos cadastros.
          </p>
        )}

        {/* ------------------------------------------------ servidor errado */}
        {(configError || isNativeApp) && (
          <Link href="/servidor" asChild>
            <motion.a
              whileTap={{ scale: 0.98 }}
              className={cn(
                "flex items-center gap-3 rounded-2xl border border-border/70 p-3.5",
                configError && "border-amber-500/40 bg-amber-500/5",
              )}
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted">
                <Server className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {configError ? "Servidor não respondeu" : "Servidor"}
                </p>
                <p className="truncate font-mono text-xs text-muted-foreground">
                  {getApiBaseUrl() || "mesma origem"}
                </p>
              </div>
            </motion.a>
          </Link>
        )}
      </form>
    </motion.div>
  );
}
