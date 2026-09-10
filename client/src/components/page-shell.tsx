/**
 * Casca padrão das páginas: header com gradiente + área de conteúdo animada.
 *
 * Centraliza o espaçamento e a transição de entrada para que todas as telas
 * tenham o mesmo comportamento sem repetir markup.
 */

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { pageVariants } from "@/lib/motion";
import { ActionButton } from "@/components/ui/action-button";

export type PageAccent = "brand" | "energy" | "fasting" | "strength" | "fresh";

const ACCENT_CLASS: Record<PageAccent, string> = {
  brand: "gradient-brand",
  energy: "gradient-energy",
  fasting: "gradient-fasting",
  strength: "gradient-strength",
  fresh: "gradient-fresh",
};

export interface PageShellProps {
  title: string;
  subtitle?: string;
  accent?: PageAccent;
  icon?: React.ReactNode;
  /** Ações no canto direito do header. */
  actions?: React.ReactNode;
  /** Exibe uma seta de voltar e chama este callback. */
  onBack?: () => void;
  /** Conteúdo extra dentro do header (chips, estatísticas). */
  headerContent?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export function PageShell({
  title,
  subtitle,
  accent = "brand",
  icon,
  actions,
  onBack,
  headerContent,
  className,
  children,
}: PageShellProps) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={cn("page-content min-h-screen bg-background", className)}
    >
      <header
        className={cn(
          "grain relative overflow-hidden rounded-b-[2rem] px-5 pb-6 pt-[calc(env(safe-area-inset-top,0px)+1.25rem)] text-white",
          ACCENT_CLASS[accent],
        )}
      >
        {/* Brilhos decorativos que dão profundidade ao gradiente. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-16 size-44 rounded-full bg-white/15 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 -left-12 size-40 rounded-full bg-black/10 blur-2xl"
        />

        <div className="relative flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {onBack && (
              <ActionButton
                variant="ghost"
                size="icon"
                onClick={onBack}
                aria-label="Voltar"
                className="-ml-2 size-9 shrink-0 text-white hover:bg-white/20 hover:text-white"
              >
                <ArrowLeft />
              </ActionButton>
            )}

            {icon && (
              <div className="glass-card flex size-11 shrink-0 items-center justify-center rounded-2xl">
                {icon}
              </div>
            )}

            <div className="min-w-0">
              <h1 className="truncate font-display text-[1.35rem] font-bold leading-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="truncate text-sm text-white/80">{subtitle}</p>
              )}
            </div>
          </div>

          {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
        </div>

        {headerContent && <div className="relative mt-5">{headerContent}</div>}
      </header>

      <div className="px-4 pt-5">{children}</div>
    </motion.div>
  );
}
