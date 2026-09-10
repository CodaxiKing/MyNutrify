/**
 * Tela inicial: resumo do dia, macros, gráfico da semana e atalhos.
 *
 * Os textos estavam em inglês enquanto o resto do app já era em português.
 */

import { useMemo } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Activity, ChevronRight, Dumbbell, Footprints, ScanLine, Timer } from "lucide-react";

import { DailyProgress } from "@/components/daily-progress";
import { StepsCard } from "@/components/steps-card";
import { MacronutrientBars } from "@/components/macronutrient-bars";
import { WeeklyChart } from "@/components/weekly-chart";
import { MealCard } from "@/components/meal-card";
import { ActivityRegistration } from "@/components/activity-registration";
import { ActivityCard } from "@/components/activity-card";
import { ActionButton } from "@/components/ui/action-button";
import {
  useActivitiesForDate,
  useDailySummary,
  useDeleteActivity,
  useDeleteMeal,
  useMealsForDate,
  useWeeklySummary,
} from "@/hooks/use-nutrition-data";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useActiveFasting, useFastingTimer } from "@/hooks/use-fasting";
import { calculateMacroTargets } from "@/lib/nutrition-calculator";
import { useToast } from "@/hooks/use-toast";
import { pageVariants, staggerContainer, staggerItem } from "@/lib/motion";
import { formatClock } from "@shared/fasting";

/** Atalhos para as telas que não têm aba própria. */
const SHORTCUTS = [
  { href: "/corrida", label: "Corrida", icon: Footprints, gradient: "gradient-energy" },
  { href: "/precisao", label: "Precisão", icon: ScanLine, gradient: "gradient-fresh" },
  { href: "/atividades", label: "Atividades", icon: Activity, gradient: "gradient-brand" },
  { href: "/treinos", label: "Treinos", icon: Dumbbell, gradient: "gradient-strength" },
];

export default function Dashboard() {
  const { toast } = useToast();
  const { data: profile } = useUserProfile();
  const { data: dailySummary } = useDailySummary();
  const { data: weeklySummary } = useWeeklySummary();
  const { data: todaysMeals = [] } = useMealsForDate();
  const { data: todaysActivities = [] } = useActivitiesForDate();
  const { data: activeFasting } = useActiveFasting();

  const fastingTimer = useFastingTimer(activeFasting);

  const deleteMeal = useDeleteMeal();
  const deleteActivity = useDeleteActivity();

  const macroTargets = profile?.dailyCalorieGoal
    ? calculateMacroTargets(profile.dailyCalorieGoal, profile.fitnessGoal || "maintain")
    : { protein: 0, carbs: 0, fat: 0 };

  const currentMacros = {
    carbs: dailySummary?.totalCarbs || 0,
    protein: dailySummary?.totalProtein || 0,
    fat: dailySummary?.totalFat || 0,
  };

  // As três entradas mais recentes de cada tipo. `sort` muta o array, então
  // copiamos antes — o original vem do cache do react-query.
  const recentMeals = useMemo(
    () =>
      [...todaysMeals]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 3),
    [todaysMeals],
  );

  const recentActivities = useMemo(
    () =>
      [...todaysActivities]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 3),
    [todaysActivities],
  );

  const handleDeleteMeal = async (mealId: string) => {
    try {
      await deleteMeal.mutateAsync(mealId);
      toast({
        title: "Refeição removida",
        description: "A refeição saiu do seu diário.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível remover a refeição. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    try {
      await deleteActivity.mutateAsync(activityId);
      toast({
        title: "Atividade removida",
        description: "A atividade saiu do seu diário.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível remover a atividade. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="page-content space-y-5 p-4"
    >
      {/* Faixa de jejum ativo — só aparece quando há um em andamento. */}
      {activeFasting && fastingTimer && (
        <Link href="/jejum" asChild>
          <motion.a
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.98 }}
            className="gradient-fasting flex items-center gap-3 rounded-2xl p-3.5 text-white shadow-lg shadow-purple-500/20"
          >
            <div className="glass-card flex size-10 shrink-0 items-center justify-center rounded-xl">
              <Timer className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-white/75">
                {fastingTimer.isComplete ? "Jejum concluído" : "Jejum em andamento"}
              </p>
              <p className="font-mono text-lg font-bold tabular-nums">
                {fastingTimer.isComplete
                  ? formatClock(fastingTimer.overtimeSeconds)
                  : formatClock(fastingTimer.remainingSeconds)}
              </p>
            </div>
            <ChevronRight className="size-5 shrink-0 text-white/70" />
          </motion.a>
        </Link>
      )}

      <DailyProgress
        consumed={dailySummary?.totalCalories || 0}
        goal={profile?.dailyCalorieGoal || 2000}
        burned={dailySummary?.caloriesBurned || 0}
        netCalories={
          dailySummary?.netCalories ??
          (dailySummary?.totalCalories || 0) - (dailySummary?.caloriesBurned || 0)
        }
      />

      <StepsCard />

      {/* ---------------------------------------------------------- atalhos */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-4 gap-2.5"
      >
        {SHORTCUTS.map((shortcut) => {
          const Icon = shortcut.icon;

          return (
            <motion.div key={shortcut.href} variants={staggerItem}>
              <Link href={shortcut.href} asChild>
                <motion.a
                  whileTap={{ scale: 0.94 }}
                  className="flex flex-col items-center gap-1.5"
                >
                  <span
                    className={`${shortcut.gradient} flex size-14 items-center justify-center rounded-2xl text-white shadow-md`}
                  >
                    <Icon className="size-6" />
                  </span>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {shortcut.label}
                  </span>
                </motion.a>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>

      <MacronutrientBars current={currentMacros} targets={macroTargets} />

      <WeeklyChart data={weeklySummary} />

      <ActivityRegistration />

      {/* ---------------------------------------------------- atividades */}
      <Section
        title="Atividades de hoje"
        actionLabel="Ver todas"
        actionHref="/atividades"
        empty={
          recentActivities.length === 0
            ? {
                title: "Nenhuma atividade registrada hoje",
                hint: "Registre sua primeira atividade física acima.",
              }
            : undefined
        }
      >
        {recentActivities.map((activity) => (
          <ActivityCard
            key={activity.id}
            activityEntry={activity}
            onDelete={handleDeleteActivity}
          />
        ))}
      </Section>

      {/* ------------------------------------------------------ refeições */}
      <Section
        title="Refeições de hoje"
        actionLabel="Ver diário"
        actionHref="/diario"
        empty={
          recentMeals.length === 0
            ? {
                title: "Nenhuma refeição registrada hoje",
                hint: "Use a câmera para registrar sua primeira refeição.",
              }
            : undefined
        }
      >
        {recentMeals.map((meal) => (
          <MealCard key={meal.id} mealEntry={meal} onDelete={handleDeleteMeal} />
        ))}
      </Section>
    </motion.div>
  );
}

function Section({
  title,
  actionLabel,
  actionHref,
  empty,
  children,
}: {
  title: string;
  actionLabel: string;
  actionHref: string;
  empty?: { title: string; hint: string };
  children: React.ReactNode;
}) {
  return (
    <section className="surface-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold">{title}</h3>
        <Link href={actionHref} asChild>
          <ActionButton
            variant="ghost"
            size="sm"
            trailingIcon={<ChevronRight />}
            className="text-primary"
          >
            {actionLabel}
          </ActionButton>
        </Link>
      </div>

      {empty ? (
        <div className="py-7 text-center text-muted-foreground">
          <p className="text-sm font-medium">{empty.title}</p>
          <p className="mt-1 text-xs">{empty.hint}</p>
        </div>
      ) : (
        <div className="space-y-2.5">{children}</div>
      )}
    </section>
  );
}
