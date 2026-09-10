/**
 * Número que anima até o novo valor em vez de trocar de uma vez.
 *
 * Usado nos contadores de calorias, volume de treino e horas de jejum.
 */

import { useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

export interface AnimatedNumberProps {
  value: number;
  /** Casas decimais exibidas. */
  decimals?: number;
  className?: string;
  suffix?: string;
  prefix?: string;
}

export function AnimatedNumber({
  value,
  decimals = 0,
  className,
  suffix,
  prefix,
}: AnimatedNumberProps) {
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 120, damping: 24 });

  const display = useTransform(spring, (latest) =>
    `${prefix ?? ""}${latest.toLocaleString("pt-BR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}${suffix ?? ""}`,
  );

  useEffect(() => {
    motionValue.set(Number.isFinite(value) ? value : 0);
  }, [motionValue, value]);

  return <motion.span className={className}>{display}</motion.span>;
}
