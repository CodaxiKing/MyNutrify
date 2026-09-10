/**
 * Resumo calórico do dia: anel de progresso e o balanço consumido/queimado.
 */

import { Flame, Target, TrendingDown, Utensils } from "lucide-react";
import { ProgressRing } from "@/components/ui/progress-ring";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { cn } from "@/lib/utils";

export interface DailyProgressProps {
  consumed: number;
  goal: number;
  remaining?: number;
  burned?: number;
  netCalories?: number;
}

export function DailyProgress({
  consumed,
  goal,
  remaining,
  burned = 0,
  netCalories,
}: DailyProgressProps) {
  const safeGoal = goal > 0 ? goal : 2000;
  const progress = consumed / safeGoal;

  const actualRemaining = remaining ?? Math.max(0, safeGoal - consumed);
  const actualNet = netCalories ?? consumed - burned;
  const isOverGoal = consumed > safeGoal;

  return (
    <section className="surface-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="section-label">Progresso de hoje</h2>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-medium",
            isOverGoal
              ? "bg-destructive/10 text-destructive"
              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
          )}
        >
          {isOverGoal
            ? `${Math.round(consumed - safeGoal)} kcal acima`
            : `${Math.round(actualRemaining)} kcal restantes`}
        </span>
      </div>

      <div className="glow-under flex justify-center py-1">
        <ProgressRing
          value={progress}
          size={172}
          strokeWidth={13}
          color={isOverGoal ? "hsl(var(--destructive))" : "url(#dailyGradient)"}
        >
          <svg width="0" height="0" className="absolute" aria-hidden>
            <defs>
              <linearGradient id="dailyGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="hsl(203 88% 53%)" />
                <stop offset="100%" stopColor="hsl(190 90% 45%)" />
              </linearGradient>
            </defs>
          </svg>

          <AnimatedNumber
            value={consumed}
            className="display-number text-[2.75rem] leading-none text-foreground"
            data-testid="text-consumed-calories"
          />
          <span className="mt-1 text-xs text-muted-foreground">
            de {Math.round(safeGoal).toLocaleString("pt-BR")} kcal
          </span>
        </ProgressRing>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <Stat
          icon={<Utensils className="size-4" />}
          label="Consumido"
          value={consumed}
          tone="text-foreground"
          testId="text-total-consumed"
        />
        <Stat
          icon={<Flame className="size-4" />}
          label="Queimado"
          value={burned}
          tone="text-orange-500"
          testId="text-calories-burned"
        />
        <Stat
          icon={<TrendingDown className="size-4" />}
          label="Saldo líquido"
          value={actualNet}
          tone={actualNet < safeGoal ? "text-emerald-500" : "text-primary"}
          testId="text-net-calories"
        />
        <Stat
          icon={<Target className="size-4" />}
          label="Meta"
          value={safeGoal}
          tone="text-foreground"
          testId="text-daily-goal"
        />
      </div>
    </section>
  );
}

function Stat({
  icon,
  label,
  value,
  tone,
  testId,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: string;
  testId: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/25 p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="truncate text-[11px] font-medium">{label}</span>
      </div>
      <AnimatedNumber
        value={value}
        className={cn("display-number mt-0.5 block text-2xl", tone)}
        data-testid={testId}
      />
    </div>
  );
}
