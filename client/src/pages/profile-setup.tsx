/**
 * Onboarding do perfil.
 *
 * Coleta altura, peso, idade, sexo e objetivo, e mostra ao vivo o BMR calculado
 * (Mifflin-St Jeor), a meta calórica diária e a divisão de macros.
 *
 * A tela ainda dizia "Welcome to CalorieSnap" — nome de um projeto anterior — e
 * era a única em inglês num app em português.
 */

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Salad, Target, TrendingDown, TrendingUp, Zap } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ActionButton } from "@/components/ui/action-button";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { useToast } from "@/hooks/use-toast";
import { useUpdateUserProfile } from "@/hooks/use-user-profile";
import {
  calculateBMR,
  calculateDailyCalorieGoal,
  calculateMacroTargets,
} from "@/lib/nutrition-calculator";
import type { UserProfile } from "@/types/nutrition";
import { cn } from "@/lib/utils";
import { staggerContainer, staggerItem } from "@/lib/motion";

const profileSchema = z.object({
  height: z
    .number({ invalid_type_error: "Informe sua altura" })
    .min(100, "A altura deve ser de pelo menos 100 cm")
    .max(250, "A altura deve ser menor que 250 cm"),
  weight: z
    .number({ invalid_type_error: "Informe seu peso" })
    .min(30, "O peso deve ser de pelo menos 30 kg")
    .max(300, "O peso deve ser menor que 300 kg"),
  age: z
    .number({ invalid_type_error: "Informe sua idade" })
    .min(13, "A idade mínima é 13 anos")
    .max(120, "A idade deve ser menor que 120 anos"),
  gender: z.enum(["male", "female"], { required_error: "Selecione o sexo biológico" }),
  fitnessGoal: z.enum(["lose", "maintain", "gain"], {
    required_error: "Escolha um objetivo",
  }),
});

type ProfileForm = z.infer<typeof profileSchema>;

const GOALS = {
  lose: {
    title: "Emagrecer",
    description: "Criar um déficit calórico",
    detail: "Cerca de 500 kcal abaixo da manutenção — aproximadamente 0,5 kg por semana.",
    icon: TrendingDown,
    accent: "text-rose-500",
    ring: "border-rose-500/50 bg-rose-500/5",
  },
  maintain: {
    title: "Manter",
    description: "Manter o peso atual",
    detail: "Comer no nível de manutenção para estabilizar o peso.",
    icon: Target,
    accent: "text-sky-500",
    ring: "border-sky-500/50 bg-sky-500/5",
  },
  gain: {
    title: "Ganhar massa",
    description: "Criar um superávit calórico",
    detail: "De 300 a 500 kcal acima da manutenção, para ganho magro.",
    icon: TrendingUp,
    accent: "text-emerald-500",
    ring: "border-emerald-500/50 bg-emerald-500/5",
  },
} as const;

export interface ProfileSetupProps {
  onComplete: (profile: UserProfile) => void;
  existingProfile?: Partial<UserProfile>;
}

export default function ProfileSetup({ onComplete, existingProfile }: ProfileSetupProps) {
  const { toast } = useToast();
  const updateProfile = useUpdateUserProfile();

  const isEditing = Boolean(existingProfile?.height && existingProfile?.weight);

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    mode: "onChange",
    defaultValues: {
      height: existingProfile?.height ?? undefined,
      weight: existingProfile?.weight ?? undefined,
      age: existingProfile?.age ?? undefined,
      gender: existingProfile?.gender ?? undefined,
      fitnessGoal: existingProfile?.fitnessGoal ?? undefined,
    },
  });

  const values = form.watch();

  const [calculated, setCalculated] = useState({
    bmr: 0,
    dailyGoal: 0,
    macroTargets: { protein: 0, carbs: 0, fat: 0 },
  });

  const { height, weight, age, gender, fitnessGoal } = values;

  useEffect(() => {
    if (!height || !weight || !age || !gender || !fitnessGoal) return;

    const bmr = calculateBMR({ height, weight, age, gender });
    const dailyGoal = calculateDailyCalorieGoal({ height, weight, age, gender, fitnessGoal });

    setCalculated({
      bmr,
      dailyGoal,
      macroTargets: calculateMacroTargets(dailyGoal, fitnessGoal),
    });
    // Depender dos campos individualmente evita recalcular a cada render — o
    // objeto de `watch()` tem identidade nova toda vez.
  }, [height, weight, age, gender, fitnessGoal]);

  const selectedGoal = fitnessGoal ? GOALS[fitnessGoal] : null;

  const activityCalories = useMemo(
    () => Math.max(0, Math.round(calculated.dailyGoal - calculated.bmr)),
    [calculated],
  );

  const onSubmit = async (data: ProfileForm) => {
    try {
      const profileData: UserProfile = {
        ...data,
        bmr: calculated.bmr,
        dailyCalorieGoal: calculated.dailyGoal,
      };

      await updateProfile.mutateAsync(profileData);

      toast({
        title: isEditing ? "Perfil atualizado" : "Tudo pronto!",
        description: `Sua meta é de ${Math.round(calculated.dailyGoal)} kcal por dia.`,
      });

      onComplete(profileData);
    } catch (error) {
      toast({
        title: "Não foi possível salvar",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mobile-container min-h-screen bg-background">
      <header
        className="gradient-brand grain relative overflow-hidden rounded-b-[2rem] px-5 page-content text-white"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 2.5rem)" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-white/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-16 size-52 rounded-full bg-black/15 blur-3xl"
        />

        <div className="relative">
          <div className="glass-card mb-4 flex size-12 items-center justify-center rounded-2xl">
            <Salad className="size-6" />
          </div>

          <p className="section-label text-white/70">
            {isEditing ? "Perfil" : "Passo único"}
          </p>

          <h1 className="mt-1.5 font-display text-[2rem] font-bold leading-[1.08] tracking-tight">
            {isEditing ? (
              "Seus dados"
            ) : (
              <>
                Suas metas,
                <br />
                <span className="text-white/70">calculadas para você.</span>
              </>
            )}
          </h1>

          <p className="mt-3 max-w-[19rem] text-sm leading-relaxed text-white/75">
            {isEditing
              ? "Atualize seus dados para recalcular as metas."
              : "Cinco campos e o app calcula seu metabolismo basal, a meta calórica diária e a divisão de macros."}
          </p>
        </div>
      </header>

      <motion.form
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4 px-4 py-5 page-content"
      >
        {/* ------------------------------------------------------- medidas */}
        <motion.div variants={staggerItem} className="surface-card space-y-4 p-5">
          <p className="section-label">Suas medidas</p>

          <div className="grid grid-cols-2 gap-3">
            <Field
              id="height"
              label="Altura (cm)"
              placeholder="175"
              error={form.formState.errors.height?.message}
              register={form.register("height", { valueAsNumber: true })}
              testId="input-height"
            />
            <Field
              id="weight"
              label="Peso (kg)"
              placeholder="70"
              step="0.1"
              error={form.formState.errors.weight?.message}
              register={form.register("weight", { valueAsNumber: true })}
              testId="input-weight"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field
              id="age"
              label="Idade"
              placeholder="28"
              error={form.formState.errors.age?.message}
              register={form.register("age", { valueAsNumber: true })}
              testId="input-age"
            />

            <div className="space-y-1.5">
              <Label htmlFor="gender">Sexo biológico</Label>
              <Select
                value={gender ?? ""}
                onValueChange={(value) =>
                  form.setValue("gender", value as "male" | "female", {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger id="gender" className="h-11 rounded-xl" data-testid="select-gender">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Masculino</SelectItem>
                  <SelectItem value="female">Feminino</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.gender && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.gender.message}
                </p>
              )}
            </div>
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">
            O sexo biológico entra na fórmula de Mifflin-St Jeor, usada para estimar o seu
            metabolismo basal.
          </p>
        </motion.div>

        {/* ------------------------------------------------------- objetivo */}
        <motion.div variants={staggerItem} className="surface-card space-y-3 p-5">
          <p className="section-label">Seu objetivo</p>

          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(GOALS) as Array<keyof typeof GOALS>).map((key) => {
              const goal = GOALS[key];
              const Icon = goal.icon;
              const active = fitnessGoal === key;

              return (
                <motion.button
                  key={key}
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  data-testid={`tab-${key}`}
                  onClick={() =>
                    form.setValue("fitnessGoal", key, { shouldValidate: true })
                  }
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-2xl border-2 p-3 transition-colors",
                    active ? goal.ring : "border-border bg-card hover:border-primary/30",
                  )}
                >
                  <Icon className={cn("size-5", active ? goal.accent : "text-muted-foreground")} />
                  <span className="text-[11px] font-medium leading-tight">{goal.title}</span>
                </motion.button>
              );
            })}
          </div>

          {selectedGoal && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground"
            >
              {selectedGoal.detail}
            </motion.p>
          )}

          {form.formState.errors.fitnessGoal && (
            <p className="text-xs text-destructive">
              {form.formState.errors.fitnessGoal.message}
            </p>
          )}
        </motion.div>

        {/* --------------------------------------------------- metas vivas */}
        {calculated.bmr > 0 && (
          <motion.div variants={staggerItem} className="surface-card-accent overflow-hidden">
            {/* Meta calórica como herói: número grande em display, o resto
                subordinado. Antes eram três blocos cinza do mesmo peso. */}
            <div className="gradient-brand grain relative overflow-hidden px-5 py-7 text-center text-white">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-12 -top-14 size-40 rounded-full bg-white/20 blur-3xl"
              />

              <div className="relative">
                <p className="section-label inline-flex items-center gap-1.5 text-white/75">
                  <Zap className="size-3.5" />
                  Meta calórica diária
                </p>

                <AnimatedNumber
                  value={calculated.dailyGoal}
                  className="display-number mt-1.5 block text-[3.25rem] leading-none"
                  data-testid="text-calculated-goal"
                />

                <p className="mt-1.5 text-sm font-medium text-white/70">kcal por dia</p>
              </div>
            </div>

            <div className="p-5">
              <div className="grid grid-cols-2 gap-2.5">
                <MiniStat
                  label="Metabolismo basal"
                  value={calculated.bmr}
                  unit="kcal/dia"
                  testId="text-calculated-bmr"
                />
                <MiniStat
                  label="Gasto com atividade"
                  value={activityCalories}
                  unit="kcal/dia"
                />
              </div>

              <p className="section-label mb-2.5 mt-5">Macronutrientes por dia</p>

              <div className="grid grid-cols-3 gap-2">
                <MacroChip
                  label="Proteína"
                  grams={calculated.macroTargets.protein}
                  accent="bg-rose-500"
                  className="text-rose-600 dark:text-rose-400"
                />
                <MacroChip
                  label="Carboidrato"
                  grams={calculated.macroTargets.carbs}
                  accent="bg-sky-500"
                  className="text-sky-600 dark:text-sky-400"
                />
                <MacroChip
                  label="Gordura"
                  grams={calculated.macroTargets.fat}
                  accent="bg-amber-500"
                  className="text-amber-600 dark:text-amber-400"
                />
              </div>
            </div>
          </motion.div>
        )}

        <motion.div variants={staggerItem}>
          <ActionButton
            type="submit"
            variant="brand"
            size="lg"
            full
            loading={updateProfile.isPending}
            disabled={!form.formState.isValid}
            data-testid="button-complete-setup"
          >
            {isEditing ? "Salvar alterações" : "Concluir cadastro"}
          </ActionButton>
        </motion.div>
      </motion.form>
    </div>
  );
}

function Field({
  id,
  label,
  placeholder,
  step,
  error,
  register,
  testId,
}: {
  id: string;
  label: string;
  placeholder: string;
  step?: string;
  error?: string;
  register: ReturnType<ReturnType<typeof useForm<ProfileForm>>["register"]>;
  testId: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        step={step}
        placeholder={placeholder}
        className="h-11 rounded-xl"
        data-testid={testId}
        {...register}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function MiniStat({
  label,
  value,
  unit,
  testId,
}: {
  label: string;
  value: number;
  unit: string;
  testId?: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
      <p className="truncate text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
      <AnimatedNumber
        value={value}
        className="display-number mt-1 block text-2xl"
        data-testid={testId}
      />
      <p className="text-[10px] text-muted-foreground">{unit}</p>
    </div>
  );
}

function MacroChip({
  label,
  grams,
  accent,
  className,
}: {
  label: string;
  grams: number;
  /** Cor da barrinha superior, que identifica o macro de relance. */
  accent: string;
  className: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-muted/30">
      <div className={cn("h-1 w-full", accent)} />
      <div className={cn("p-2.5 text-center", className)}>
        <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
        <p className="display-number text-base">{grams}g</p>
      </div>
    </div>
  );
}
