/**
 * Cabeçalho do app.
 *
 * O ícone da marca era um `<i class="fas fa-camera-retro">` sem o Font Awesome
 * carregado em lugar nenhum — aparecia como um quadrado vazio. Agora usa
 * lucide, que já é a biblioteca de ícones do projeto.
 */

import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { ArrowLeft, LogOut, Moon, Salad, Server, Sun, User } from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";
import { PlanBadge } from "@/components/plan-badge";
import { UpgradeModal } from "@/components/upgrade-modal";
import { useUserProfile } from "@/hooks/use-user-profile";
import { isNativeApp } from "@/lib/api-url";
import { useAuthActions } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";

interface MobileHeaderProps {
  onProfileClick?: () => void;
  /** Quando definido, mostra a seta de voltar no lugar da marca. */
  onBack?: () => void;
}

export function MobileHeader({ onProfileClick, onBack }: MobileHeaderProps) {
  const { data: userProfile } = useUserProfile();
  const { logout } = useAuthActions();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  return (
    <>
      <header
        className="gradient-brand grain sticky top-0 z-30 overflow-hidden px-4 pb-3 text-white"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
      >
        <div className="flex items-center justify-between">
          {onBack ? (
            <div className="flex min-w-0 items-center gap-1.5">
              <ActionButton
                variant="ghost"
                size="icon"
                aria-label="Voltar"
                className="-ml-1 size-9 shrink-0 text-white hover:bg-white/20 hover:text-white"
                onClick={onBack}
              >
                <ArrowLeft />
              </ActionButton>

              <Link href="/" asChild>
                <a className="truncate font-display text-lg font-bold tracking-tight">
                  MyNutrify
                </a>
              </Link>
            </div>
          ) : (
            /* asChild: o Link do wouter v3 ja e a propria <a>. */
            <Link href="/" asChild>
              <a className="flex items-center gap-2.5">
                <div className="glass-card flex size-9 items-center justify-center rounded-xl">
                  <Salad className="size-5" />
                </div>
                <span className="font-display text-lg font-bold tracking-tight">MyNutrify</span>
              </a>
            </Link>
          )}

          <div className="flex items-center gap-1.5">
            <PlanBadge plan={userProfile?.plan} onClick={() => setShowUpgradeModal(true)} />

            <ThemeToggle />

            {/* Atalho para trocar o endereço do servidor sem recompilar o APK. */}
            {isNativeApp && (
              <Link href="/servidor" asChild>
                <motion.a
                  whileTap={{ scale: 0.92 }}
                  aria-label="Configurar servidor"
                  className="flex size-9 items-center justify-center rounded-2xl text-white transition-colors hover:bg-white/20"
                >
                  <Server className="size-5" />
                </motion.a>
              </Link>
            )}

            <ActionButton
              variant="ghost"
              size="icon"
              aria-label="Abrir perfil"
              className="size-9 text-white hover:bg-white/20 hover:text-white"
              onClick={onProfileClick}
              data-testid="button-profile"
            >
              <User />
            </ActionButton>

            <ActionButton
              variant="ghost"
              size="icon"
              aria-label="Sair da conta"
              className="size-9 text-white hover:bg-white/20 hover:text-white"
              onClick={async () => {
                await logout();
                toast({ title: "Você saiu da conta" });
              }}
            >
              <LogOut />
            </ActionButton>
          </div>
        </div>
      </header>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentPlan={userProfile?.plan}
      />
    </>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // O tema só é conhecido no client; renderizar antes disso causaria um
  // descompasso entre o ícone e o tema real.
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <ActionButton
      variant="ghost"
      size="icon"
      aria-label={isDark ? "Usar tema claro" : "Usar tema escuro"}
      className="size-9 text-white hover:bg-white/20 hover:text-white"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {mounted && (
        <motion.span
          key={isDark ? "dark" : "light"}
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="flex"
        >
          {isDark ? <Moon /> : <Sun />}
        </motion.span>
      )}
    </ActionButton>
  );
}
