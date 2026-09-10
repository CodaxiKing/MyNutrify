/**
 * Primitivas de animação compartilhadas.
 *
 * Centralizar as variantes aqui mantém o ritmo do app consistente — todas as
 * telas usam as mesmas curvas e durações em vez de cada componente inventar
 * a sua.
 */

import type { Transition, Variants } from "framer-motion";

/** Mola padrão: rápida, com um leve overshoot. */
export const spring: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};

/** Mola suave, para elementos grandes (painéis, cartões expandindo). */
export const softSpring: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 28,
};

/** Mola bem reativa, para toques e microinterações. */
export const snappySpring: Transition = {
  type: "spring",
  stiffness: 600,
  damping: 24,
};

/** Entrada/saída de página. */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.18, ease: "easeIn" } },
};

/** Container de lista: revela os filhos em cascata. */
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.055, delayChildren: 0.04 },
  },
};

/** Item de lista, usado junto de `staggerContainer`. */
export const staggerItem: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: softSpring },
};

/** Aparição de modais e sheets. */
export const popIn: Variants = {
  initial: { opacity: 0, scale: 0.94 },
  animate: { opacity: 1, scale: 1, transition: spring },
  exit: { opacity: 0, scale: 0.96, transition: { duration: 0.15 } },
};

/** Escala de toque padrão dos elementos clicáveis. */
export const tapScale = { scale: 0.96 } as const;
