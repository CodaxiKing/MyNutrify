import {
  users,
  foods,
  mealEntries,
  dailySummaries,
  type User,
  type UpsertUser,
  type UserProfile,
  type Food,
  type InsertFood,
  type MealEntry,
  type InsertMealEntry,
  type DailySummary,
  type InsertDailySummary,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, gte, lte, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserProfile(id: string, profile: Partial<UserProfile>): Promise<User>;
  
  // Food operations
  createFood(food: InsertFood): Promise<Food>;
  getFoodById(id: string): Promise<Food | undefined>;
  
  // Meal operations
  createMealEntry(entry: InsertMealEntry): Promise<MealEntry>;
  getMealsByUserAndDate(userId: string, date: Date): Promise<MealEntry[]>;
  getMealsByUserAndDateRange(userId: string, startDate: Date, endDate: Date): Promise<MealEntry[]>;
  deleteMealEntry(id: string, userId: string): Promise<boolean>;
  
  // Daily summary operations
  getDailySummary(userId: string, date: Date): Promise<DailySummary | undefined>;
  upsertDailySummary(summary: InsertDailySummary): Promise<DailySummary>;
  getDailySummariesForRange(userId: string, startDate: Date, endDate: Date): Promise<DailySummary[]>;
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
    const [result] = await db
      .insert(dailySummaries)
      .values(summary)
      .onConflictDoUpdate({
        target: [dailySummaries.userId, dailySummaries.date],
        set: {
          totalCalories: summary.totalCalories,
          totalCarbs: summary.totalCarbs,
          totalProtein: summary.totalProtein,
          totalFat: summary.totalFat,
          mealCount: summary.mealCount,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
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
}

export const storage = new DatabaseStorage();
