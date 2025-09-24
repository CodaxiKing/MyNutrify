import {
  users,
  foods,
  mealEntries,
  dailySummaries,
  exercises,
  activityEntries,
  recipes,
  recipeIngredients,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, gte, lte, sql } from "drizzle-orm";

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
    const lowerQuery = query.toLowerCase();
    return await db
      .select()
      .from(foods)
      .where(sql`LOWER(${foods.name}) LIKE ${'%' + lowerQuery + '%'}`)
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
}

export const storage = new DatabaseStorage();
