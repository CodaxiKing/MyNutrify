/**
 * Botões animados do MyNutrify.
 *
 * Camada em cima do Button do shadcn com: variantes em gradiente, resposta ao
 * toque via framer-motion, estado de carregamento e ripple opcional. O Button
 * original continua existindo para os usos neutros.
 */

import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { snappySpring } from "@/lib/motion";

const actionButtonVariants = cva(
  "relative inline-flex select-none items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-2xl font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        brand: "gradient-brand text-white shadow-lg shadow-primary/25",
        energy: "gradient-energy text-white shadow-lg shadow-orange-500/25",
        fasting: "gradient-fasting text-white shadow-lg shadow-purple-500/25",
        strength: "gradient-strength text-white shadow-lg shadow-rose-500/25",
        fresh: "gradient-fresh text-white shadow-lg shadow-emerald-500/25",
        solid: "bg-primary text-primary-foreground shadow-md shadow-primary/20",
        soft: "bg-primary/10 text-primary hover:bg-primary/15",
        outline: "border-2 border-border bg-transparent text-foreground hover:bg-muted/60",
        ghost: "bg-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        danger: "bg-destructive text-destructive-foreground shadow-md shadow-destructive/20",
      },
      size: {
        sm: "h-9 px-3.5 text-sm [&_svg]:size-4",
        md: "h-11 px-5 text-sm [&_svg]:size-[18px]",
        lg: "h-13 px-6 text-base [&_svg]:size-5",
        xl: "h-16 px-8 text-lg [&_svg]:size-6",
        icon: "size-11 [&_svg]:size-5",
        "icon-lg": "size-14 [&_svg]:size-6",
      },
      full: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "brand",
      size: "md",
    },
  },
);

type MotionButtonProps = Omit<HTMLMotionProps<"button">, "children">;

export interface ActionButtonProps
  extends MotionButtonProps,
    VariantProps<typeof actionButtonVariants> {
  children?: React.ReactNode;
  /** Mostra um spinner e bloqueia cliques. */
  loading?: boolean;
  /** Ícone antes do texto. */
  icon?: React.ReactNode;
  /** Ícone depois do texto. */
  trailingIcon?: React.ReactNode;
  /** Desliga o efeito de ondulação no toque. */
  disableRipple?: boolean;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
  size: number;
}

export const ActionButton = React.forwardRef<HTMLButtonElement, ActionButtonProps>(
  (
    {
      className,
      variant,
      size,
      full,
      loading = false,
      disabled,
      icon,
      trailingIcon,
      disableRipple = false,
      children,
      onClick,
      ...props
    },
    ref,
  ) => {
    const [ripples, setRipples] = React.useState<Ripple[]>([]);
    const isDisabled = disabled || loading;

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (!disableRipple) {
        const rect = event.currentTarget.getBoundingClientRect();
        // A ondulação cobre o botão inteiro a partir do ponto tocado.
        const size = Math.max(rect.width, rect.height) * 2;
        const ripple: Ripple = {
          id: Date.now() + Math.random(),
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          size,
        };
        setRipples((current) => [...current, ripple]);
        window.setTimeout(
          () => setRipples((current) => current.filter((r) => r.id !== ripple.id)),
          600,
        );
      }

      onClick?.(event);
    };

    return (
      <motion.button
        ref={ref}
        type="button"
        disabled={isDisabled}
        onClick={handleClick}
        whileTap={isDisabled ? undefined : { scale: 0.96 }}
        whileHover={isDisabled ? undefined : { scale: 1.02 }}
        transition={snappySpring}
        className={cn(actionButtonVariants({ variant, size, full }), className)}
        {...props}
      >
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            aria-hidden
            className="pointer-events-none absolute animate-[ripple_600ms_ease-out] rounded-full bg-white/30"
            style={{
              left: ripple.x - ripple.size / 2,
              top: ripple.y - ripple.size / 2,
              width: ripple.size,
              height: ripple.size,
            }}
          />
        ))}

        {loading ? (
          <Loader2 className="animate-spin" />
        ) : (
          icon
        )}

        {children}

        {!loading && trailingIcon}
      </motion.button>
    );
  },
);

ActionButton.displayName = "ActionButton";

/**
 * Botão flutuante de ação (FAB), com pulso opcional para chamar atenção.
 */
export interface FabProps extends ActionButtonProps {
  pulse?: boolean;
}

export const Fab = React.forwardRef<HTMLButtonElement, FabProps>(
  ({ className, pulse = false, variant = "brand", ...props }, ref) => (
    <div className="relative">
      {pulse && (
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 -z-10 rounded-full opacity-60",
            variant === "brand" ? "gradient-brand" : "bg-primary",
            "animate-ping",
          )}
        />
      )}
      <ActionButton
        ref={ref}
        variant={variant}
        size="icon-lg"
        className={cn("rounded-full", className)}
        {...props}
      />
    </div>
  ),
);

Fab.displayName = "Fab";

export { actionButtonVariants };
