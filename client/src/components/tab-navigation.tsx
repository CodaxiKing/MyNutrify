/**
 * Barra de navegação inferior.
 *
 * O indicador da aba ativa é um `layoutId` do framer-motion, então ele desliza
 * entre as abas em vez de piscar. O botão central abre a câmera.
 */

import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Activity,
  Apple,
  Camera,
  Coffee,
  Dumbbell,
  Home,
  Timer,
  Utensils,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";

interface Tab {
  href: string;
  label: string;
  icon: typeof Home;
}

/** Abas à esquerda e à direita do botão central. */
const LEFT_TABS: Tab[] = [
  { href: "/", label: "Início", icon: Home },
  { href: "/alimentos", label: "Comida", icon: Utensils },
];

const RIGHT_TABS: Tab[] = [
  { href: "/treinos", label: "Treinos", icon: Dumbbell },
  { href: "/jejum", label: "Jejum", icon: Timer },
];

export function TabNavigation() {
  const [location] = useLocation();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-border/60 bg-card/90 backdrop-blur-xl"
      style={{
        // Com targetSdk 36 o Android desenha edge-to-edge e a barra de gestos
        // fica por cima do app. O `env()` sozinho vem 0 na WebView do Capacitor,
        // então os rótulos ficavam escondidos atrás dela — o `max()` garante uma
        // folga mínima em qualquer aparelho.
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 1.25rem)",
      }}
    >
      <div className="flex items-center justify-around px-2 py-1.5">
        {LEFT_TABS.map((tab) => (
          <TabButton key={tab.href} tab={tab} active={isActive(location, tab.href)} />
        ))}

        {/* Botão central: registrar refeição pela câmera. */}
        {/* `asChild` evita o <a> dentro de <a> — o Link do wouter v3 já
            renderiza a âncora e apenas repassa href para o filho. */}
        <Link href="/camera" asChild>
          <motion.a
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            transition={spring}
            aria-label="Registrar pela câmera"
            className="gradient-brand -mt-6 flex size-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg shadow-primary/30"
          >
            <Camera className="size-6" />
          </motion.a>
        </Link>

        {RIGHT_TABS.map((tab) => (
          <TabButton key={tab.href} tab={tab} active={isActive(location, tab.href)} />
        ))}
      </div>
    </nav>
  );
}

/** A raiz só casa exata; as demais casam por prefixo (sub-rotas). */
function isActive(location: string, href: string) {
  return href === "/" ? location === "/" : location.startsWith(href);
}

function TabButton({ tab, active }: { tab: Tab; active: boolean }) {
  const Icon = tab.icon;

  return (
    <Link href={tab.href} asChild>
      <motion.a
        whileTap={{ scale: 0.92 }}
        className={cn(
          "relative flex min-w-16 flex-col items-center gap-0.5 rounded-xl px-3 py-2 transition-colors",
          active ? "text-primary" : "text-muted-foreground hover:text-foreground",
        )}
      >
        {active && (
          <motion.span
            layoutId="tab-indicator"
            transition={spring}
            className="absolute inset-0 -z-10 rounded-xl bg-primary/10"
          />
        )}

        <Icon className={cn("transition-all", active ? "size-[22px]" : "size-5")} />
        <span className={cn("text-[10px]", active && "font-semibold")}>{tab.label}</span>
      </motion.a>
    </Link>
  );
}

export function getMealIcon(mealType: string) {
  switch (mealType) {
    case "breakfast":
      return Coffee;
    case "lunch":
    case "dinner":
      return Utensils;
    case "snack":
      return Apple;
    default:
      return Utensils;
  }
}

export { Activity };
