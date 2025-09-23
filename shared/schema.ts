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

// User profile table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
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
  createdAt: timestamp("created_at").defaultNow(),
});

// Meal entries for users
export const mealEntries = pgTable("meal_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  foodId: varchar("food_id").references(() => foods.id),
  mealType: varchar("meal_type", { length: 20 }).notNull(), // 'breakfast', 'lunch', 'dinner', 'snack'
  date: timestamp("date").notNull(),
  quantity: real("quantity").default(1), // serving multiplier
  totalCalories: real("total_calories").notNull(),
  totalCarbs: real("total_carbs"),
  totalProtein: real("total_protein"),
  totalFat: real("total_fat"),
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
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("daily_summaries_user_date_idx").on(table.userId, table.date),
]);

// Relations
export const userRelations = relations(users, ({ many }) => ({
  mealEntries: many(mealEntries),
  dailySummaries: many(dailySummaries),
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

export const insertDailySummarySchema = createInsertSchema(dailySummaries).omit({
  id: true,
  updatedAt: true,
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

export type DailySummary = typeof dailySummaries.$inferSelect;
export type InsertDailySummary = z.infer<typeof insertDailySummarySchema>;
