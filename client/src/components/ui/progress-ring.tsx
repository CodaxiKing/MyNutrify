/**
 * Anel de progresso circular animado.
 *
 * Usado no consumo diário de calorias, no cronômetro de jejum e no avanço do
 * treino. Desenha em SVG e anima o `strokeDashoffset` com framer-motion.
 */

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface ProgressRingProps {
  /** Progresso de 0 a 1. Valores acima de 1 preenchem o anel por completo. */
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  /** Cor do traço — aceita qualquer valor CSS, inclusive `url(#gradiente)`. */
  color?: string;
  trackClassName?: string;
  children?: React.ReactNode;
}

export function ProgressRing({
  value,
  size = 180,
  strokeWidth = 14,
  className,
  color = "hsl(var(--ring))",
  trackClassName = "text-muted/50",
  children,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Sem clamp, um valor > 1 faria o traço "desandar" para o outro lado.
  const clamped = Math.min(Math.max(value, 0), 1);
  const offset = circumference * (1 - clamped);

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={trackClassName}
          stroke="currentColor"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ type: "spring", stiffness: 90, damping: 20 }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}
