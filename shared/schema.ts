import { sql } from "drizzle-orm";
import { 
  pgTable, 
  varchar, 
  text, 
  integer, 
  real, 
  timestamp, 
  jsonb,
  index,
  uniqueIndex,
  pgEnum
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User plan enum
export const userPlanEnum = pgEnum("user_plan", ["free", "premium", "vip"]);

/**
 * Sessões de login.
 *
 * Guarda o SHA-256 do token, nunca o token em si: um vazamento do banco não
 * permite se passar por ninguém. O client manda o token original no cabeçalho
 * `Authorization: Bearer`.
 *
 * Token em vez de cookie porque o APK conversa com a API em outra origem —
 * cookies cross-site exigiriam `SameSite=None; Secure` e são frágeis dentro da
 * WebView. Com token o comportamento é idêntico na web e no app.
 */
export const authSessions = pgTable("auth_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  userAgent: varchar("user_agent", { length: 300 }),
  createdAt: timestamp("created_at").defaultNow(),
  lastUsedAt: timestamp("last_used_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
}, (table) => [
  index("auth_sessions_user_idx").on(table.userId),
  index("auth_sessions_expires_idx").on(table.expiresAt),
]);

// User profile table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  // Hash scrypt no formato "scrypt$<salt-hex>$<hash-hex>". Nulo nos usuários
  // criados antes do login existir.
  passwordHash: varchar("password_hash"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  height: integer("height"), // cm
  weight: real("weight"), // kg
  age: integer("age"),
  gender: varchar("gender", { length: 10 }), // 'male' or 'female'
  fitnessGoal: varchar("fitness_goal", { length: 20 }), // 'lose', 'maintain', 'gain'
  bmr: real("bmr"), // calculated BMR
  dailyCalorieGoal: real("daily_calorie_goal"), // calculated daily goal
  
  // Subscription and billing
  plan: userPlanEnum("plan").default("free").notNull(),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionStatus: varchar("subscription_status", { length: 20 }), // 'active', 'canceled', 'past_due', etc.
  subscriptionEndDate: timestamp("subscription_end_date"),
  trialEndDate: timestamp("trial_end_date"),
  
  // Usage limits for free users
  aiAnalysisUsedToday: integer("ai_analysis_used_today").default(0),
  lastAiAnalysisReset: timestamp("last_ai_analysis_reset").defaultNow(),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Food items recognized by AI
export const foods = pgTable("foods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  caloriesPerServing: real("calories_per_serving").notNull(),
  servingSize: varchar("serving_size", { length: 100 }).notNull(),
  carbs: real("carbs"), // grams
  protein: real("protein"), // grams
  fat: real("fat"), // grams
  imageUrl: varchar("image_url"),
  confidence: real("confidence"), // AI confidence score
  barcode: varchar("barcode", { length: 50 }), // Barcode for external API lookup
  source: varchar("source", { length: 20 }).default("ai"), // 'ai', 'manual', 'barcode', 'openfoodfacts'
  createdAt: timestamp("created_at").defaultNow(),
});

// User recipes
export const recipes = pgTable("recipes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  servings: real("servings").notNull().default(1), // How many servings this recipe makes
  totalCalories: real("total_calories").notNull(),
  totalCarbs: real("total_carbs"),
  totalProtein: real("total_protein"),
  totalFat: real("total_fat"),
  imageUrl: varchar("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Recipe ingredients - links recipes to foods with quantities
export const recipeIngredients = pgTable("recipe_ingredients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recipeId: varchar("recipe_id").notNull().references(() => recipes.id, { onDelete: 'cascade' }),
  foodId: varchar("food_id").notNull().references(() => foods.id),
  quantity: real("quantity").notNull(), // serving multiplier for this ingredient
  createdAt: timestamp("created_at").defaultNow(),
});

// Meal entries for users
export const mealEntries = pgTable("meal_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  foodId: varchar("food_id").references(() => foods.id),
  recipeId: varchar("recipe_id").references(() => recipes.id), // Reference to user recipe
  mealType: varchar("meal_type", { length: 20 }).notNull(), // 'breakfast', 'lunch', 'dinner', 'snack'
  date: timestamp("date").notNull(),
  quantity: real("quantity").default(1), // serving multiplier
  totalCalories: real("total_calories").notNull(),
  totalCarbs: real("total_carbs"),
  totalProtein: real("total_protein"),
  totalFat: real("total_fat"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Exercise database with MET values
export const exercises = pgTable("exercises", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(), // 'cardio', 'strength', 'sports', 'flexibility'
  metValue: real("met_value").notNull(), // Metabolic Equivalent of Task
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User activity entries
export const activityEntries = pgTable("activity_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  exerciseId: varchar("exercise_id").references(() => exercises.id),
  customExerciseName: varchar("custom_exercise_name", { length: 200 }), // For custom exercises
  duration: integer("duration").notNull(), // minutes
  intensity: varchar("intensity", { length: 20 }).default('moderate'), // 'light', 'moderate', 'vigorous'
  caloriesBurned: real("calories_burned").notNull(),
  date: timestamp("date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Daily nutrition summaries for faster queries
export const dailySummaries = pgTable("daily_summaries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  date: timestamp("date").notNull(),
  totalCalories: real("total_calories").default(0),
  totalCarbs: real("total_carbs").default(0),
  totalProtein: real("total_protein").default(0),
  totalFat: real("total_fat").default(0),
  mealCount: integer("meal_count").default(0),
  caloriesBurned: real("calories_burned").default(0), // New field for burned calories
  netCalories: real("net_calories").default(0), // Consumed - Burned
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("daily_summaries_user_date_idx").on(table.userId, table.date),
]);

// ---------------------------------------------------------------------------
// Treinos (séries de musculação)
// ---------------------------------------------------------------------------

// Um plano de treino montado pelo usuário (ex.: "Treino A - Peito e Tríceps")
export const workoutPlans = pgTable("workout_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  // Dias da semana em que o plano deve aparecer (0 = domingo ... 6 = sábado)
  weekdays: jsonb("weekdays").$type<number[]>().default([]),
  color: varchar("color", { length: 20 }).default("primary"),
  archived: integer("archived").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("workout_plans_user_idx").on(table.userId),
]);

// Cada exercício dentro de um plano, com a prescrição de séries
export const workoutPlanExercises = pgTable("workout_plan_exercises", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  planId: varchar("plan_id").notNull().references(() => workoutPlans.id, { onDelete: 'cascade' }),
  // Id do exercício na biblioteca (shared/exercise-db.json), ex.: "0001".
  // Nulo quando o usuário criou o exercício à mão.
  libraryExerciseId: varchar("library_exercise_id", { length: 10 }),
  // Referência da mídia de demonstração, guardada junto para o player montar a
  // URL sem precisar consultar a biblioteca a cada exercício.
  mediaId: varchar("media_id", { length: 20 }),
  // Snapshot dos dados da biblioteca, para o plano não quebrar se o dataset mudar
  name: varchar("name", { length: 200 }).notNull(),
  bodyPart: varchar("body_part", { length: 40 }).notNull(),
  equipment: varchar("equipment", { length: 60 }).notNull(),
  target: varchar("target", { length: 60 }).notNull(),
  position: integer("position").notNull().default(0),
  sets: integer("sets").notNull().default(3),
  reps: integer("reps").notNull().default(10),
  weight: real("weight"), // kg, opcional (peso corporal)
  restSeconds: integer("rest_seconds").notNull().default(60),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("workout_plan_exercises_plan_idx").on(table.planId),
]);

// Uma execução do plano (sessão de treino)
export const workoutSessions = pgTable("workout_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  planId: varchar("plan_id").references(() => workoutPlans.id, { onDelete: 'set null' }),
  planName: varchar("plan_name", { length: 120 }).notNull(),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  finishedAt: timestamp("finished_at"),
  durationSeconds: integer("duration_seconds"),
  totalVolume: real("total_volume").default(0), // soma de peso x reps
  caloriesBurned: real("calories_burned").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("workout_sessions_user_started_idx").on(table.userId, table.startedAt),
]);

// Cada série registrada dentro de uma sessão
export const workoutSetLogs = pgTable("workout_set_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => workoutSessions.id, { onDelete: 'cascade' }),
  // Nulo em exercício criado pelo usuário.
  libraryExerciseId: varchar("library_exercise_id", { length: 10 }),
  exerciseName: varchar("exercise_name", { length: 200 }).notNull(),
  setNumber: integer("set_number").notNull(),
  reps: integer("reps").notNull(),
  weight: real("weight"),
  completed: integer("completed").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("workout_set_logs_session_idx").on(table.sessionId),
]);

// ---------------------------------------------------------------------------
// Jejum intermitente
// ---------------------------------------------------------------------------

export const fastingStatusEnum = pgEnum("fasting_status", ["active", "completed", "broken"]);

export const fastingSessions = pgTable("fasting_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  // Protocolo escolhido: '16:8', '18:6', '20:4', 'omad', '24h', '36h', 'custom'
  protocol: varchar("protocol", { length: 20 }).notNull().default("16:8"),
  // Duração alvo do jejum em minutos
  targetMinutes: integer("target_minutes").notNull(),
  startedAt: timestamp("started_at").notNull(),
  // Preenchido quando o usuário encerra (no prazo ou antes)
  endedAt: timestamp("ended_at"),
  status: fastingStatusEnum("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("fasting_sessions_user_started_idx").on(table.userId, table.startedAt),
]);


// ---------------------------------------------------------------------------
// Contador de passos
// ---------------------------------------------------------------------------

/**
 * Passos por dia.
 *
 * O sensor do Android conta desde o último boot do aparelho, então o total do
 * dia é calculado no client e sincronizado aqui. A data fica como texto
 * `YYYY-MM-DD` no fuso do usuário: guardar timestamp faria o "dia" virar à
 * meia-noite UTC, que para o Brasil cai às 21h.
 */
export const dailySteps = pgTable("daily_steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: varchar("date", { length: 10 }).notNull(),
  steps: integer("steps").notNull().default(0),
  distanceMeters: real("distance_meters").notNull().default(0),
  caloriesBurned: real("calories_burned").notNull().default(0),
  // 'sensor' (contador do aparelho) ou 'manual' (digitado pelo usuário)
  source: varchar("source", { length: 10 }).notNull().default("sensor"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Um registro por usuário por dia.
  uniqueIndex("daily_steps_user_date_key").on(table.userId, table.date),
]);

// Relations
export const userRelations = relations(users, ({ many }) => ({
  mealEntries: many(mealEntries),
  dailySummaries: many(dailySummaries),
  activityEntries: many(activityEntries),
  recipes: many(recipes),
  workoutPlans: many(workoutPlans),
  workoutSessions: many(workoutSessions),
  fastingSessions: many(fastingSessions),
}));

export const workoutPlanRelations = relations(workoutPlans, ({ one, many }) => ({
  user: one(users, {
    fields: [workoutPlans.userId],
    references: [users.id],
  }),
  exercises: many(workoutPlanExercises),
  sessions: many(workoutSessions),
}));

export const workoutPlanExerciseRelations = relations(workoutPlanExercises, ({ one }) => ({
  plan: one(workoutPlans, {
    fields: [workoutPlanExercises.planId],
    references: [workoutPlans.id],
  }),
}));

export const workoutSessionRelations = relations(workoutSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [workoutSessions.userId],
    references: [users.id],
  }),
  plan: one(workoutPlans, {
    fields: [workoutSessions.planId],
    references: [workoutPlans.id],
  }),
  setLogs: many(workoutSetLogs),
}));

export const workoutSetLogRelations = relations(workoutSetLogs, ({ one }) => ({
  session: one(workoutSessions, {
    fields: [workoutSetLogs.sessionId],
    references: [workoutSessions.id],
  }),
}));

export const fastingSessionRelations = relations(fastingSessions, ({ one }) => ({
  user: one(users, {
    fields: [fastingSessions.userId],
    references: [users.id],
  }),
}));

export const recipeRelations = relations(recipes, ({ one, many }) => ({
  user: one(users, {
    fields: [recipes.userId],
    references: [users.id],
  }),
  ingredients: many(recipeIngredients),
  mealEntries: many(mealEntries),
}));

export const recipeIngredientRelations = relations(recipeIngredients, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipeIngredients.recipeId],
    references: [recipes.id],
  }),
  food: one(foods, {
    fields: [recipeIngredients.foodId],
    references: [foods.id],
  }),
}));

export const foodRelations = relations(foods, ({ many }) => ({
  mealEntries: many(mealEntries),
  recipeIngredients: many(recipeIngredients),
}));

export const mealEntryRelations = relations(mealEntries, ({ one }) => ({
  user: one(users, {
    fields: [mealEntries.userId],
    references: [users.id],
  }),
  food: one(foods, {
    fields: [mealEntries.foodId],
    references: [foods.id],
  }),
  recipe: one(recipes, {
    fields: [mealEntries.recipeId],
    references: [recipes.id],
  }),
}));

export const activityEntryRelations = relations(activityEntries, ({ one }) => ({
  user: one(users, {
    fields: [activityEntries.userId],
    references: [users.id],
  }),
  exercise: one(exercises, {
    fields: [activityEntries.exerciseId],
    references: [exercises.id],
  }),
}));

export const dailySummaryRelations = relations(dailySummaries, ({ one }) => ({
  user: one(users, {
    fields: [dailySummaries.userId],
    references: [users.id],
  }),
}));

// Schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const userProfileSchema = insertUserSchema.extend({
  height: z.number().min(100).max(250),
  weight: z.number().min(30).max(300),
  age: z.number().min(13).max(120),
  gender: z.enum(['male', 'female']),
  fitnessGoal: z.enum(['lose', 'maintain', 'gain']),
});

export const insertFoodSchema = createInsertSchema(foods).omit({
  id: true,
  createdAt: true,
});

export const insertMealEntrySchema = createInsertSchema(mealEntries).omit({
  id: true,
  createdAt: true,
});

export const insertExerciseSchema = createInsertSchema(exercises).omit({
  id: true,
  createdAt: true,
});

export const insertActivityEntrySchema = createInsertSchema(activityEntries).omit({
  id: true,
  createdAt: true,
});

export const insertDailySummarySchema = createInsertSchema(dailySummaries).omit({
  id: true,
  updatedAt: true,
});

export const insertRecipeSchema = createInsertSchema(recipes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRecipeIngredientSchema = createInsertSchema(recipeIngredients).omit({
  id: true,
  createdAt: true,
});

// Enhanced schemas with additional validation
export const activityEntrySchema = insertActivityEntrySchema.extend({
  duration: z.number().min(1).max(1440), // 1 minute to 24 hours
  intensity: z.enum(['light', 'moderate', 'vigorous']),
  caloriesBurned: z.number().min(0),
});

export const recipeSchema = insertRecipeSchema.extend({
  name: z.string().min(1).max(200),
  servings: z.number().min(0.1).max(50),
  totalCalories: z.number().min(0),
});

export const recipeIngredientSchema = insertRecipeIngredientSchema.extend({
  quantity: z.number().min(0.01),
});

export const foodSearchSchema = z.object({
  query: z.string().min(1).max(100),
  limit: z.number().min(1).max(50).optional().default(20),
});

export const barcodeSchema = z.object({
  barcode: z.string().min(8).max(50),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = typeof users.$inferInsert;
export type UserProfile = z.infer<typeof userProfileSchema>;

export type Food = typeof foods.$inferSelect;
export type InsertFood = z.infer<typeof insertFoodSchema>;

export type MealEntry = typeof mealEntries.$inferSelect;
export type InsertMealEntry = z.infer<typeof insertMealEntrySchema>;

export type Exercise = typeof exercises.$inferSelect;
export type InsertExercise = z.infer<typeof insertExerciseSchema>;

export type ActivityEntry = typeof activityEntries.$inferSelect;
export type InsertActivityEntry = z.infer<typeof insertActivityEntrySchema>;

export type DailySummary = typeof dailySummaries.$inferSelect;
export type InsertDailySummary = z.infer<typeof insertDailySummarySchema>;

export type Recipe = typeof recipes.$inferSelect;
export type InsertRecipe = z.infer<typeof insertRecipeSchema>;

export type RecipeIngredient = typeof recipeIngredients.$inferSelect;
export type InsertRecipeIngredient = z.infer<typeof insertRecipeIngredientSchema>;

// Additional types for API responses
export type RecipeWithIngredients = Recipe & {
  ingredients: (RecipeIngredient & { food: Food })[];
};

export type FoodSearchResult = Food;
export type BarcodeSearchResult = Food;

// ---------------------------------------------------------------------------
// Treinos — schemas e tipos
// ---------------------------------------------------------------------------

export const insertWorkoutPlanSchema = createInsertSchema(workoutPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkoutPlanExerciseSchema = createInsertSchema(workoutPlanExercises).omit({
  id: true,
  createdAt: true,
});

export const insertWorkoutSessionSchema = createInsertSchema(workoutSessions).omit({
  id: true,
  createdAt: true,
});

export const insertWorkoutSetLogSchema = createInsertSchema(workoutSetLogs).omit({
  id: true,
  createdAt: true,
});

/** Prescrição de um exercício ao montar/editar um plano. */
export const workoutPlanExerciseInputSchema = z.object({
  // Ausente em exercício criado pelo usuário.
  libraryExerciseId: z.string().max(10).nullable().optional(),
  mediaId: z.string().max(20).nullable().optional(),
  name: z.string().min(1, "Dê um nome ao exercício").max(200),
  bodyPart: z.string().min(1).max(40),
  equipment: z.string().min(1).max(60),
  target: z.string().min(1).max(60),
  sets: z.number().int().min(1).max(20),
  reps: z.number().int().min(1).max(500),
  weight: z.number().min(0).max(1000).nullable().optional(),
  restSeconds: z.number().int().min(0).max(600),
  notes: z.string().max(500).nullable().optional(),
});

/** Payload de criação/edição de um plano de treino completo. */
export const workoutPlanInputSchema = z.object({
  name: z.string().min(1, "Dê um nome ao treino").max(120),
  description: z.string().max(500).nullable().optional(),
  weekdays: z.array(z.number().int().min(0).max(6)).max(7).default([]),
  color: z.string().max(20).default("primary"),
  exercises: z.array(workoutPlanExerciseInputSchema).min(1, "Adicione ao menos um exercício"),
});

/** Payload de finalização de uma sessão de treino. */
export const finishWorkoutSessionSchema = z.object({
  notes: z.string().max(1000).nullable().optional(),
  setLogs: z.array(z.object({
    libraryExerciseId: z.string().max(10).nullable().optional(),
    exerciseName: z.string().min(1).max(200),
    setNumber: z.number().int().min(1).max(50),
    reps: z.number().int().min(0).max(500),
    weight: z.number().min(0).max(1000).nullable().optional(),
    completed: z.boolean().default(true),
  })).default([]),
});

export type WorkoutPlan = typeof workoutPlans.$inferSelect;
export type InsertWorkoutPlan = z.infer<typeof insertWorkoutPlanSchema>;
export type WorkoutPlanExercise = typeof workoutPlanExercises.$inferSelect;
export type InsertWorkoutPlanExercise = z.infer<typeof insertWorkoutPlanExerciseSchema>;
export type WorkoutSession = typeof workoutSessions.$inferSelect;
export type InsertWorkoutSession = z.infer<typeof insertWorkoutSessionSchema>;
export type WorkoutSetLog = typeof workoutSetLogs.$inferSelect;
export type InsertWorkoutSetLog = z.infer<typeof insertWorkoutSetLogSchema>;

export type WorkoutPlanInput = z.infer<typeof workoutPlanInputSchema>;
export type WorkoutPlanWithExercises = WorkoutPlan & { exercises: WorkoutPlanExercise[] };
export type WorkoutSessionWithLogs = WorkoutSession & { setLogs: WorkoutSetLog[] };

// ---------------------------------------------------------------------------
// Jejum intermitente — schemas e tipos
// ---------------------------------------------------------------------------

export const insertFastingSessionSchema = createInsertSchema(fastingSessions).omit({
  id: true,
  createdAt: true,
});

export const startFastingSchema = z.object({
  protocol: z.enum(["16:8", "18:6", "20:4", "omad", "24h", "36h", "custom"]),
  // 30 min a 7 dias
  targetMinutes: z.number().int().min(30).max(10080),
  // Permite registrar um jejum que começou antes (ex.: "comi pela última vez às 20h")
  startedAt: z.coerce.date().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const endFastingSchema = z.object({
  notes: z.string().max(500).nullable().optional(),
});

export type FastingSession = typeof fastingSessions.$inferSelect;
export type InsertFastingSession = z.infer<typeof insertFastingSessionSchema>;
export type StartFastingInput = z.infer<typeof startFastingSchema>;

// ---------------------------------------------------------------------------
// Autenticação — schemas e tipos
// ---------------------------------------------------------------------------

const emailSchema = z
  .string()
  .trim()
  .min(1, "Informe seu e-mail")
  .max(200)
  .email("E-mail inválido")
  // Guardado em minúsculas para "Diego@x.com" e "diego@x.com" serem a mesma conta.
  .transform((value) => value.toLowerCase());

export const registerSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(8, "A senha precisa de pelo menos 8 caracteres")
    .max(200, "Senha longa demais"),
  firstName: z.string().trim().max(80).optional(),
  lastName: z.string().trim().max(80).optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe sua senha").max(200),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z
    .string()
    .min(8, "A nova senha precisa de pelo menos 8 caracteres")
    .max(200),
});

export type AuthSession = typeof authSessions.$inferSelect;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

/** Usuário como o client o recebe — nunca inclui o hash da senha. */
export type PublicUser = Omit<User, "passwordHash">;

// ---------------------------------------------------------------------------
// Passos — schemas e tipos
// ---------------------------------------------------------------------------

export const syncStepsSchema = z.object({
  /** Data no fuso do usuário, `YYYY-MM-DD`. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  // 200 mil passos é bem acima de qualquer dia real; acima disso é erro de
  // leitura do sensor, não caminhada.
  steps: z.number().int().min(0).max(200_000),
  source: z.enum(["sensor", "manual"]).default("sensor"),
});

export type DailySteps = typeof dailySteps.$inferSelect;
export type SyncStepsInput = z.infer<typeof syncStepsSchema>;
