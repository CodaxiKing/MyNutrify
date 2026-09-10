import { foodSearchTerms } from "../shared/food-search";
import {
  users,
  foods,
  mealEntries,
  dailySummaries,
  exercises,
  activityEntries,
  recipes,
  recipeIngredients,
  workoutPlans,
  workoutPlanExercises,
  workoutSessions,
  workoutSetLogs,
  fastingSessions,
  authSessions,
  dailySteps,
  type User,
  type UpsertUser,
  type UserProfile,
  type Food,
  type InsertFood,
  type MealEntry,
  type InsertMealEntry,
  type DailySummary,
  type InsertDailySummary,
  type Exercise,
  type InsertExercise,
  type ActivityEntry,
  type InsertActivityEntry,
  type Recipe,
  type InsertRecipe,
  type RecipeIngredient,
  type InsertRecipeIngredient,
  type RecipeWithIngredients,
  type WorkoutPlan,
  type WorkoutPlanExercise,
  type WorkoutPlanWithExercises,
  type WorkoutPlanInput,
  type WorkoutSession,
  type WorkoutSessionWithLogs,
  type WorkoutSetLog,
  type FastingSession,
  type StartFastingInput,
  type AuthSession,
  type DailySteps,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, gte, lte, sql, inArray, isNull, isNotNull } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserProfile(id: string, profile: Partial<UserProfile>): Promise<User>;
  
  // VIP and billing operations
  updateUserPlan(userId: string, plan: 'free' | 'premium' | 'vip'): Promise<User>;
  updateStripeCustomerId(userId: string, customerId: string): Promise<User>;
  updateUserStripeInfo(userId: string, stripeInfo: { customerId?: string; subscriptionId?: string; status?: string }): Promise<User>;
  resetDailyAIUsage(userId: string): Promise<void>;
  incrementDailyAIUsage(userId: string): Promise<void>;
  getUserWithSubscription(userId: string): Promise<User | undefined>;
  
  // Food operations
  createFood(food: InsertFood): Promise<Food>;
  getFoodById(id: string): Promise<Food | undefined>;
  searchFoods(query: string, limit?: number): Promise<Food[]>;
  getFoodByBarcode(barcode: string): Promise<Food | undefined>;
  
  // Meal operations
  createMealEntry(entry: InsertMealEntry): Promise<MealEntry>;
  getMealsByUserAndDate(userId: string, date: Date): Promise<MealEntry[]>;
  getMealsByUserAndDateRange(userId: string, startDate: Date, endDate: Date): Promise<MealEntry[]>;
  deleteMealEntry(id: string, userId: string): Promise<boolean>;
  
  // Exercise operations
  createExercise(exercise: InsertExercise): Promise<Exercise>;
  getExerciseById(id: string): Promise<Exercise | undefined>;
  searchExercises(query: string, category?: string): Promise<Exercise[]>;
  getAllExercises(): Promise<Exercise[]>;
  
  // Activity operations
  createActivityEntry(entry: InsertActivityEntry): Promise<ActivityEntry>;
  getActivitiesByUserAndDate(userId: string, date: Date): Promise<ActivityEntry[]>;
  getActivitiesByUserAndDateRange(userId: string, startDate: Date, endDate: Date): Promise<ActivityEntry[]>;
  deleteActivityEntry(id: string, userId: string): Promise<boolean>;
  
  // Daily summary operations
  getDailySummary(userId: string, date: Date): Promise<DailySummary | undefined>;
  upsertDailySummary(summary: InsertDailySummary): Promise<DailySummary>;
  getDailySummariesForRange(userId: string, startDate: Date, endDate: Date): Promise<DailySummary[]>;

  // Recipe operations
  createRecipe(recipe: InsertRecipe): Promise<Recipe>;
  getRecipeById(id: string): Promise<Recipe | undefined>;
  getRecipeWithIngredients(id: string): Promise<RecipeWithIngredients | undefined>;
  getUserRecipes(userId: string): Promise<Recipe[]>;
  updateRecipe(id: string, recipe: Partial<InsertRecipe>): Promise<Recipe>;
  deleteRecipe(id: string, userId: string): Promise<boolean>;

  // Recipe ingredient operations
  addRecipeIngredient(ingredient: InsertRecipeIngredient): Promise<RecipeIngredient>;
  updateRecipeIngredient(id: string, quantity: number): Promise<RecipeIngredient>;
  deleteRecipeIngredient(id: string): Promise<boolean>;
  getRecipeIngredients(recipeId: string): Promise<(RecipeIngredient & { food: Food })[]>;
  userOwnsRecipeIngredient(ingredientId: string, userId: string): Promise<boolean>;

  // Workout plan operations
  createWorkoutPlan(userId: string, plan: WorkoutPlanInput): Promise<WorkoutPlanWithExercises>;
  getWorkoutPlans(userId: string): Promise<WorkoutPlanWithExercises[]>;
  getWorkoutPlan(id: string, userId: string): Promise<WorkoutPlanWithExercises | undefined>;
  updateWorkoutPlan(id: string, userId: string, plan: WorkoutPlanInput): Promise<WorkoutPlanWithExercises | undefined>;
  deleteWorkoutPlan(id: string, userId: string): Promise<boolean>;

  // Workout session operations
  startWorkoutSession(userId: string, planId: string | null, planName: string): Promise<WorkoutSession>;
  getActiveWorkoutSession(userId: string): Promise<WorkoutSessionWithLogs | undefined>;
  finishWorkoutSession(
    id: string,
    userId: string,
    data: {
      setLogs: Array<Omit<WorkoutSetLog, "id" | "sessionId" | "createdAt" | "completed"> & { completed: boolean }>;
      caloriesBurned: number;
      notes?: string | null;
    },
  ): Promise<WorkoutSessionWithLogs | undefined>;
  cancelWorkoutSession(id: string, userId: string): Promise<boolean>;
  getWorkoutSessions(userId: string, limit?: number): Promise<WorkoutSession[]>;
  getWorkoutSessionsInRange(userId: string, startDate: Date, endDate: Date): Promise<WorkoutSession[]>;

  // Fasting operations
  startFastingSession(userId: string, input: StartFastingInput): Promise<FastingSession>;
  getActiveFastingSession(userId: string): Promise<FastingSession | undefined>;
  endFastingSession(id: string, userId: string, notes?: string | null): Promise<FastingSession | undefined>;
  deleteFastingSession(id: string, userId: string): Promise<boolean>;
  getFastingSessions(userId: string, limit?: number): Promise<FastingSession[]>;

  // Auth operations
  getUserByEmail(email: string): Promise<User | undefined>;
  createUserWithPassword(data: {
    email: string;
    passwordHash: string;
    firstName?: string | null;
    lastName?: string | null;
  }): Promise<User>;
  setUserPassword(userId: string, passwordHash: string): Promise<void>;
  createAuthSession(data: {
    userId: string;
    tokenHash: string;
    userAgent?: string | null;
    expiresAt: Date;
  }): Promise<AuthSession>;
  getAuthSessionByTokenHash(tokenHash: string): Promise<AuthSession | undefined>;
  touchAuthSession(id: string, expiresAt: Date): Promise<void>;
  deleteAuthSession(tokenHash: string): Promise<boolean>;
  deleteUserAuthSessions(userId: string): Promise<void>;
  deleteExpiredAuthSessions(): Promise<number>;
  countUsers(): Promise<number>;

  // Step counter operations
  getDailySteps(userId: string, date: string): Promise<DailySteps | undefined>;
  getRecentDailySteps(userId: string, days: number): Promise<DailySteps[]>;
  upsertDailySteps(data: {
    userId: string;
    date: string;
    steps: number;
    distanceMeters: number;
    caloriesBurned: number;
    source: string;
  }): Promise<DailySteps>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserProfile(id: string, profile: Partial<UserProfile>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...profile, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Food operations
  async createFood(food: InsertFood): Promise<Food> {
    const [createdFood] = await db
      .insert(foods)
      .values(food)
      .returning();
    return createdFood;
  }

  async getFoodById(id: string): Promise<Food | undefined> {
    const [food] = await db.select().from(foods).where(eq(foods.id, id));
    return food;
  }

  async searchFoods(query: string, limit: number = 20): Promise<Food[]> {
    const terms = foodSearchTerms(query);
    if (!terms.length) return [];
    // Accent-insensitive without requiring the PostgreSQL unaccent extension.
    const name = sql`translate(lower(${foods.name}), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc')`;
    return await db
      .select()
      .from(foods)
      .where(and(...terms.map(term => sql`${name} LIKE ${'%' + term + '%'}`), sql`coalesce(${foods.source}, '') <> 'usda'`))
      .orderBy(asc(foods.name))
      .limit(limit);
  }

  async getFoodByBarcode(barcode: string): Promise<Food | undefined> {
    const [food] = await db.select().from(foods).where(eq(foods.barcode, barcode));
    return food;
  }

  // Exercise operations
  async createExercise(exercise: InsertExercise): Promise<Exercise> {
    const [createdExercise] = await db
      .insert(exercises)
      .values(exercise)
      .returning();
    return createdExercise;
  }

  async getExerciseById(id: string): Promise<Exercise | undefined> {
    const [exercise] = await db.select().from(exercises).where(eq(exercises.id, id));
    return exercise;
  }

  async searchExercises(query: string, category?: string): Promise<Exercise[]> {
    const lowerQuery = query.toLowerCase();
    let whereCondition = sql`LOWER(${exercises.name}) LIKE ${'%' + lowerQuery + '%'} OR LOWER(${exercises.description}) LIKE ${'%' + lowerQuery + '%'}`;
    
    if (category) {
      whereCondition = sql`(${whereCondition}) AND ${exercises.category} = ${category}`;
    }
    
    return await db
      .select()
      .from(exercises)
      .where(whereCondition)
      .orderBy(asc(exercises.name));
  }

  async getAllExercises(): Promise<Exercise[]> {
    return await db
      .select()
      .from(exercises)
      .orderBy(asc(exercises.category), asc(exercises.name));
  }

  // Meal operations
  async createMealEntry(entry: InsertMealEntry): Promise<MealEntry> {
    const [mealEntry] = await db
      .insert(mealEntries)
      .values(entry)
      .returning();
    return mealEntry;
  }

  async getMealsByUserAndDate(userId: string, date: Date): Promise<MealEntry[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return await db
      .select()
      .from(mealEntries)
      .where(
        and(
          eq(mealEntries.userId, userId),
          gte(mealEntries.date, startOfDay),
          lte(mealEntries.date, endOfDay)
        )
      )
      .orderBy(asc(mealEntries.date));
  }

  async getMealsByUserAndDateRange(userId: string, startDate: Date, endDate: Date): Promise<MealEntry[]> {
    return await db
      .select()
      .from(mealEntries)
      .where(
        and(
          eq(mealEntries.userId, userId),
          gte(mealEntries.date, startDate),
          lte(mealEntries.date, endDate)
        )
      )
      .orderBy(desc(mealEntries.date));
  }

  async deleteMealEntry(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(mealEntries)
      .where(and(eq(mealEntries.id, id), eq(mealEntries.userId, userId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Activity operations
  async createActivityEntry(entry: InsertActivityEntry): Promise<ActivityEntry> {
    const [activityEntry] = await db
      .insert(activityEntries)
      .values(entry)
      .returning();
    return activityEntry;
  }

  async getActivitiesByUserAndDate(userId: string, date: Date): Promise<ActivityEntry[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return await db
      .select()
      .from(activityEntries)
      .where(
        and(
          eq(activityEntries.userId, userId),
          gte(activityEntries.date, startOfDay),
          lte(activityEntries.date, endOfDay)
        )
      )
      .orderBy(desc(activityEntries.date));
  }

  async getActivitiesByUserAndDateRange(userId: string, startDate: Date, endDate: Date): Promise<ActivityEntry[]> {
    return await db
      .select()
      .from(activityEntries)
      .where(
        and(
          eq(activityEntries.userId, userId),
          gte(activityEntries.date, startDate),
          lte(activityEntries.date, endDate)
        )
      )
      .orderBy(desc(activityEntries.date));
  }

  async deleteActivityEntry(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(activityEntries)
      .where(and(eq(activityEntries.id, id), eq(activityEntries.userId, userId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Daily summary operations
  async getDailySummary(userId: string, date: Date): Promise<DailySummary | undefined> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const [summary] = await db
      .select()
      .from(dailySummaries)
      .where(
        and(
          eq(dailySummaries.userId, userId),
          gte(dailySummaries.date, startOfDay),
          lte(dailySummaries.date, endOfDay)
        )
      );
    return summary;
  }

  async upsertDailySummary(summary: InsertDailySummary): Promise<DailySummary> {
    // Try to find existing summary for the user and date
    const existing = await this.getDailySummary(summary.userId, summary.date);
    
    if (existing) {
      // Update existing record
      const [updated] = await db
        .update(dailySummaries)
        .set({
          totalCalories: summary.totalCalories,
          totalCarbs: summary.totalCarbs,
          totalProtein: summary.totalProtein,
          totalFat: summary.totalFat,
          mealCount: summary.mealCount,
          caloriesBurned: summary.caloriesBurned,
          netCalories: summary.netCalories,
          updatedAt: new Date(),
        })
        .where(eq(dailySummaries.id, existing.id))
        .returning();
      return updated;
    } else {
      // Insert new record
      const [created] = await db
        .insert(dailySummaries)
        .values(summary)
        .returning();
      return created;
    }
  }

  async getDailySummariesForRange(userId: string, startDate: Date, endDate: Date): Promise<DailySummary[]> {
    return await db
      .select()
      .from(dailySummaries)
      .where(
        and(
          eq(dailySummaries.userId, userId),
          gte(dailySummaries.date, startDate),
          lte(dailySummaries.date, endDate)
        )
      )
      .orderBy(asc(dailySummaries.date));
  }

  // Recipe operations
  async createRecipe(recipe: InsertRecipe): Promise<Recipe> {
    const [createdRecipe] = await db
      .insert(recipes)
      .values(recipe)
      .returning();
    return createdRecipe;
  }

  async getRecipeById(id: string): Promise<Recipe | undefined> {
    const [recipe] = await db.select().from(recipes).where(eq(recipes.id, id));
    return recipe;
  }

  async getRecipeWithIngredients(id: string): Promise<RecipeWithIngredients | undefined> {
    const recipe = await this.getRecipeById(id);
    if (!recipe) return undefined;

    const ingredients = await this.getRecipeIngredients(id);
    return { ...recipe, ingredients };
  }

  async getUserRecipes(userId: string): Promise<Recipe[]> {
    return await db
      .select()
      .from(recipes)
      .where(eq(recipes.userId, userId))
      .orderBy(desc(recipes.createdAt));
  }

  async updateRecipe(id: string, recipeData: Partial<InsertRecipe>): Promise<Recipe> {
    const [updated] = await db
      .update(recipes)
      .set({ ...recipeData, updatedAt: new Date() })
      .where(eq(recipes.id, id))
      .returning();
    return updated;
  }

  async deleteRecipe(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(recipes)
      .where(and(eq(recipes.id, id), eq(recipes.userId, userId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Recipe ingredient operations
  async addRecipeIngredient(ingredient: InsertRecipeIngredient): Promise<RecipeIngredient> {
    const [created] = await db
      .insert(recipeIngredients)
      .values(ingredient)
      .returning();
    return created;
  }

  async updateRecipeIngredient(id: string, quantity: number): Promise<RecipeIngredient> {
    const [updated] = await db
      .update(recipeIngredients)
      .set({ quantity })
      .where(eq(recipeIngredients.id, id))
      .returning();
    return updated;
  }

  async deleteRecipeIngredient(id: string): Promise<boolean> {
    const result = await db
      .delete(recipeIngredients)
      .where(eq(recipeIngredients.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getRecipeIngredients(recipeId: string): Promise<(RecipeIngredient & { food: Food })[]> {
    return await db
      .select({
        id: recipeIngredients.id,
        recipeId: recipeIngredients.recipeId,
        foodId: recipeIngredients.foodId,
        quantity: recipeIngredients.quantity,
        createdAt: recipeIngredients.createdAt,
        food: foods,
      })
      .from(recipeIngredients)
      .innerJoin(foods, eq(recipeIngredients.foodId, foods.id))
      .where(eq(recipeIngredients.recipeId, recipeId))
      .orderBy(asc(recipeIngredients.createdAt));
  }

  /**
   * Confere se o ingrediente pertence a uma receita do usuário.
   *
   * As rotas de ingrediente só recebem o id do próprio ingrediente, então a
   * checagem de dono precisa subir até a receita.
   */
  async userOwnsRecipeIngredient(ingredientId: string, userId: string): Promise<boolean> {
    const [row] = await db
      .select({ id: recipeIngredients.id })
      .from(recipeIngredients)
      .innerJoin(recipes, eq(recipeIngredients.recipeId, recipes.id))
      .where(and(eq(recipeIngredients.id, ingredientId), eq(recipes.userId, userId)))
      .limit(1);
    return Boolean(row);
  }

  // VIP and billing operations implementation
  async updateUserPlan(userId: string, plan: 'free' | 'premium' | 'vip'): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({ plan, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async updateStripeCustomerId(userId: string, customerId: string): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({ stripeCustomerId: customerId, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async updateUserStripeInfo(
    userId: string, 
    stripeInfo: { customerId?: string; subscriptionId?: string; status?: string }
  ): Promise<User> {
    const updateData: any = { updatedAt: new Date() };
    
    if (stripeInfo.customerId) updateData.stripeCustomerId = stripeInfo.customerId;
    if (stripeInfo.subscriptionId) updateData.stripeSubscriptionId = stripeInfo.subscriptionId;
    if (stripeInfo.status) updateData.subscriptionStatus = stripeInfo.status;

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async resetDailyAIUsage(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        aiAnalysisUsedToday: 0,
        lastAiAnalysisReset: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async incrementDailyAIUsage(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        aiAnalysisUsedToday: sql`${users.aiAnalysisUsedToday} + 1`,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async getUserWithSubscription(userId: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    return user;
  }

  // ---------------------------------------------------------------------
  // Planos de treino
  // ---------------------------------------------------------------------

  async createWorkoutPlan(userId: string, plan: WorkoutPlanInput): Promise<WorkoutPlanWithExercises> {
    return db.transaction(async (tx) => {
      const [created] = await tx
        .insert(workoutPlans)
        .values({
          userId,
          name: plan.name,
          description: plan.description ?? null,
          weekdays: plan.weekdays,
          color: plan.color,
        })
        .returning();

      const exercises = await tx
        .insert(workoutPlanExercises)
        .values(
          plan.exercises.map((exercise, index) => ({
            planId: created.id,
            libraryExerciseId: exercise.libraryExerciseId ?? null,
            mediaId: exercise.mediaId ?? null,
            name: exercise.name,
            bodyPart: exercise.bodyPart,
            equipment: exercise.equipment,
            target: exercise.target,
            position: index,
            sets: exercise.sets,
            reps: exercise.reps,
            weight: exercise.weight ?? null,
            restSeconds: exercise.restSeconds,
            notes: exercise.notes ?? null,
          })),
        )
        .returning();

      return { ...created, exercises };
    });
  }

  async getWorkoutPlans(userId: string): Promise<WorkoutPlanWithExercises[]> {
    const plans = await db
      .select()
      .from(workoutPlans)
      .where(and(eq(workoutPlans.userId, userId), eq(workoutPlans.archived, 0)))
      .orderBy(desc(workoutPlans.updatedAt));

    if (plans.length === 0) return [];

    // Uma query so para todos os exercicios, em vez de N+1.
    const allExercises = await db
      .select()
      .from(workoutPlanExercises)
      .where(inArray(workoutPlanExercises.planId, plans.map((p) => p.id)))
      .orderBy(asc(workoutPlanExercises.position));

    const byPlan = new Map<string, WorkoutPlanExercise[]>();
    for (const exercise of allExercises) {
      const list = byPlan.get(exercise.planId) ?? [];
      list.push(exercise);
      byPlan.set(exercise.planId, list);
    }

    return plans.map((plan) => ({ ...plan, exercises: byPlan.get(plan.id) ?? [] }));
  }

  async getWorkoutPlan(id: string, userId: string): Promise<WorkoutPlanWithExercises | undefined> {
    const [plan] = await db
      .select()
      .from(workoutPlans)
      .where(and(eq(workoutPlans.id, id), eq(workoutPlans.userId, userId)));

    if (!plan) return undefined;

    const exercises = await db
      .select()
      .from(workoutPlanExercises)
      .where(eq(workoutPlanExercises.planId, id))
      .orderBy(asc(workoutPlanExercises.position));

    return { ...plan, exercises };
  }

  async updateWorkoutPlan(
    id: string,
    userId: string,
    plan: WorkoutPlanInput,
  ): Promise<WorkoutPlanWithExercises | undefined> {
    return db.transaction(async (tx) => {
      const [updated] = await tx
        .update(workoutPlans)
        .set({
          name: plan.name,
          description: plan.description ?? null,
          weekdays: plan.weekdays,
          color: plan.color,
          updatedAt: new Date(),
        })
        .where(and(eq(workoutPlans.id, id), eq(workoutPlans.userId, userId)))
        .returning();

      if (!updated) return undefined;

      // A lista de exercicios e substituida por completo - mais simples e
      // seguro que reconciliar posicoes uma a uma.
      await tx.delete(workoutPlanExercises).where(eq(workoutPlanExercises.planId, id));

      const exercises = await tx
        .insert(workoutPlanExercises)
        .values(
          plan.exercises.map((exercise, index) => ({
            planId: id,
            libraryExerciseId: exercise.libraryExerciseId ?? null,
            mediaId: exercise.mediaId ?? null,
            name: exercise.name,
            bodyPart: exercise.bodyPart,
            equipment: exercise.equipment,
            target: exercise.target,
            position: index,
            sets: exercise.sets,
            reps: exercise.reps,
            weight: exercise.weight ?? null,
            restSeconds: exercise.restSeconds,
            notes: exercise.notes ?? null,
          })),
        )
        .returning();

      return { ...updated, exercises };
    });
  }

  async deleteWorkoutPlan(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(workoutPlans)
      .where(and(eq(workoutPlans.id, id), eq(workoutPlans.userId, userId)))
      .returning();
    return result.length > 0;
  }

  // ---------------------------------------------------------------------
  // Sessoes de treino
  // ---------------------------------------------------------------------

  async startWorkoutSession(
    userId: string,
    planId: string | null,
    planName: string,
  ): Promise<WorkoutSession> {
    const [session] = await db
      .insert(workoutSessions)
      .values({ userId, planId, planName, startedAt: new Date() })
      .returning();
    return session;
  }

  async getActiveWorkoutSession(userId: string): Promise<WorkoutSessionWithLogs | undefined> {
    const [session] = await db
      .select()
      .from(workoutSessions)
      .where(and(eq(workoutSessions.userId, userId), isNull(workoutSessions.finishedAt)))
      .orderBy(desc(workoutSessions.startedAt))
      .limit(1);

    if (!session) return undefined;

    const setLogs = await db
      .select()
      .from(workoutSetLogs)
      .where(eq(workoutSetLogs.sessionId, session.id))
      .orderBy(asc(workoutSetLogs.setNumber));

    return { ...session, setLogs };
  }

  async finishWorkoutSession(
    id: string,
    userId: string,
    data: {
      setLogs: Array<Omit<WorkoutSetLog, "id" | "sessionId" | "createdAt" | "completed"> & { completed: boolean }>;
      caloriesBurned: number;
      notes?: string | null;
    },
  ): Promise<WorkoutSessionWithLogs | undefined> {
    return db.transaction(async (tx) => {
      const [session] = await tx
        .select()
        .from(workoutSessions)
        .where(and(eq(workoutSessions.id, id), eq(workoutSessions.userId, userId)));

      if (!session) return undefined;

      const finishedAt = new Date();
      const durationSeconds = Math.max(
        0,
        Math.round((finishedAt.getTime() - session.startedAt.getTime()) / 1000),
      );

      const completedLogs = data.setLogs.filter((log) => log.completed);
      const totalVolume = completedLogs.reduce(
        (sum, log) => sum + (log.weight ?? 0) * log.reps,
        0,
      );

      // Regravar do zero mantem a sessao consistente se o usuario reenviar.
      await tx.delete(workoutSetLogs).where(eq(workoutSetLogs.sessionId, id));

      let setLogs: WorkoutSetLog[] = [];
      if (data.setLogs.length > 0) {
        setLogs = await tx
          .insert(workoutSetLogs)
          .values(
            data.setLogs.map((log) => ({
              sessionId: id,
              libraryExerciseId: log.libraryExerciseId,
              exerciseName: log.exerciseName,
              setNumber: log.setNumber,
              reps: log.reps,
              weight: log.weight ?? null,
              completed: log.completed ? 1 : 0,
            })),
          )
          .returning();
      }

      const [updated] = await tx
        .update(workoutSessions)
        .set({
          finishedAt,
          durationSeconds,
          totalVolume,
          caloriesBurned: data.caloriesBurned,
          notes: data.notes ?? null,
        })
        .where(eq(workoutSessions.id, id))
        .returning();

      return { ...updated, setLogs };
    });
  }

  async cancelWorkoutSession(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(workoutSessions)
      .where(
        and(
          eq(workoutSessions.id, id),
          eq(workoutSessions.userId, userId),
          isNull(workoutSessions.finishedAt),
        ),
      )
      .returning();
    return result.length > 0;
  }

  async getWorkoutSessions(userId: string, limit: number = 30): Promise<WorkoutSession[]> {
    return db
      .select()
      .from(workoutSessions)
      .where(and(eq(workoutSessions.userId, userId), isNotNull(workoutSessions.finishedAt)))
      .orderBy(desc(workoutSessions.startedAt))
      .limit(limit);
  }

  async getWorkoutSessionsInRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<WorkoutSession[]> {
    return db
      .select()
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.userId, userId),
          isNotNull(workoutSessions.finishedAt),
          gte(workoutSessions.startedAt, startDate),
          lte(workoutSessions.startedAt, endDate),
        ),
      )
      .orderBy(asc(workoutSessions.startedAt));
  }

  // ---------------------------------------------------------------------
  // Jejum intermitente
  // ---------------------------------------------------------------------

  async startFastingSession(userId: string, input: StartFastingInput): Promise<FastingSession> {
    const [session] = await db
      .insert(fastingSessions)
      .values({
        userId,
        protocol: input.protocol,
        targetMinutes: input.targetMinutes,
        startedAt: input.startedAt ?? new Date(),
        status: "active",
        notes: input.notes ?? null,
      })
      .returning();
    return session;
  }

  async getActiveFastingSession(userId: string): Promise<FastingSession | undefined> {
    const [session] = await db
      .select()
      .from(fastingSessions)
      .where(and(eq(fastingSessions.userId, userId), eq(fastingSessions.status, "active")))
      .orderBy(desc(fastingSessions.startedAt))
      .limit(1);
    return session;
  }

  async endFastingSession(
    id: string,
    userId: string,
    notes?: string | null,
  ): Promise<FastingSession | undefined> {
    const [session] = await db
      .select()
      .from(fastingSessions)
      .where(and(eq(fastingSessions.id, id), eq(fastingSessions.userId, userId)));

    if (!session || session.status !== "active") return undefined;

    const endedAt = new Date();
    const elapsedMinutes = (endedAt.getTime() - session.startedAt.getTime()) / 60000;

    // Bateu a meta = concluido; parou antes = interrompido.
    const status = elapsedMinutes >= session.targetMinutes ? "completed" : "broken";

    const [updated] = await db
      .update(fastingSessions)
      .set({ endedAt, status, notes: notes ?? session.notes })
      .where(eq(fastingSessions.id, id))
      .returning();

    return updated;
  }

  async deleteFastingSession(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(fastingSessions)
      .where(and(eq(fastingSessions.id, id), eq(fastingSessions.userId, userId)))
      .returning();
    return result.length > 0;
  }

  async getFastingSessions(userId: string, limit: number = 60): Promise<FastingSession[]> {
    return db
      .select()
      .from(fastingSessions)
      .where(eq(fastingSessions.userId, userId))
      .orderBy(desc(fastingSessions.startedAt))
      .limit(limit);
  }

  // ---------------------------------------------------------------------
  // Autenticação
  // ---------------------------------------------------------------------

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      // Os e-mails são gravados em minúsculas no cadastro; normalizar aqui
      // também protege contra registros antigos com maiúsculas.
      .where(sql`lower(${users.email}) = ${email.toLowerCase()}`)
      .limit(1);
    return user;
  }

  async createUserWithPassword(data: {
    email: string;
    passwordHash: string;
    firstName?: string | null;
    lastName?: string | null;
  }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        email: data.email,
        passwordHash: data.passwordHash,
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
      })
      .returning();
    return user;
  }

  async setUserPassword(userId: string, passwordHash: string): Promise<void> {
    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async createAuthSession(data: {
    userId: string;
    tokenHash: string;
    userAgent?: string | null;
    expiresAt: Date;
  }): Promise<AuthSession> {
    const [session] = await db
      .insert(authSessions)
      .values({
        userId: data.userId,
        tokenHash: data.tokenHash,
        // O cabeçalho pode ser enorme; o banco só precisa do suficiente para
        // o usuário reconhecer o dispositivo.
        userAgent: data.userAgent?.slice(0, 300) ?? null,
        expiresAt: data.expiresAt,
      })
      .returning();
    return session;
  }

  async getAuthSessionByTokenHash(tokenHash: string): Promise<AuthSession | undefined> {
    const [session] = await db
      .select()
      .from(authSessions)
      .where(eq(authSessions.tokenHash, tokenHash))
      .limit(1);
    return session;
  }

  async touchAuthSession(id: string, expiresAt: Date): Promise<void> {
    await db
      .update(authSessions)
      .set({ lastUsedAt: new Date(), expiresAt })
      .where(eq(authSessions.id, id));
  }

  async deleteAuthSession(tokenHash: string): Promise<boolean> {
    const result = await db
      .delete(authSessions)
      .where(eq(authSessions.tokenHash, tokenHash))
      .returning();
    return result.length > 0;
  }

  async deleteUserAuthSessions(userId: string): Promise<void> {
    await db.delete(authSessions).where(eq(authSessions.userId, userId));
  }

  async deleteExpiredAuthSessions(): Promise<number> {
    const result = await db
      .delete(authSessions)
      .where(lte(authSessions.expiresAt, new Date()))
      .returning();
    return result.length;
  }

  /**
   * Contas que conseguem fazer login.
   *
   * Conta só quem tem senha: o usuário legado criado antes do login existir
   * (`user-1`, sem `passwordHash`) não pode entrar, então não deve bloquear o
   * cadastro da primeira conta de verdade.
   */
  async countUsers(): Promise<number> {
    const [row] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(users)
      .where(isNotNull(users.passwordHash));
    return row?.total ?? 0;
  }

  // ---------------------------------------------------------------------
  // Contador de passos
  // ---------------------------------------------------------------------

  async getDailySteps(userId: string, date: string): Promise<DailySteps | undefined> {
    const [record] = await db
      .select()
      .from(dailySteps)
      .where(and(eq(dailySteps.userId, userId), eq(dailySteps.date, date)))
      .limit(1);
    return record;
  }

  async getRecentDailySteps(userId: string, days: number): Promise<DailySteps[]> {
    return db
      .select()
      .from(dailySteps)
      .where(eq(dailySteps.userId, userId))
      // A data é texto YYYY-MM-DD, cuja ordem alfabética já é cronológica.
      .orderBy(desc(dailySteps.date))
      .limit(days);
  }

  async upsertDailySteps(data: {
    userId: string;
    date: string;
    steps: number;
    distanceMeters: number;
    caloriesBurned: number;
    source: string;
  }): Promise<DailySteps> {
    const [record] = await db
      .insert(dailySteps)
      .values(data)
      .onConflictDoUpdate({
        target: [dailySteps.userId, dailySteps.date],
        set: {
          // O contador do dia nunca deve andar para trás: se o app for
          // reinstalado, o sensor recomeça do zero e enviaria um total menor
          // que o já registrado.
          steps: sql`greatest(${dailySteps.steps}, ${data.steps})`,
          distanceMeters: sql`greatest(${dailySteps.distanceMeters}, ${data.distanceMeters})`,
          caloriesBurned: sql`greatest(${dailySteps.caloriesBurned}, ${data.caloriesBurned})`,
          source: data.source,
          updatedAt: new Date(),
        },
      })
      .returning();
    return record;
  }
}

export const storage = new DatabaseStorage();
