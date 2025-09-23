import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { analyzeFoodImage } from "./services/openai";
import { 
  calculateBMR, 
  calculateDailyCalorieGoal, 
  calculateMacroTargets,
  calculateNutritionTotals,
  validateNutritionParams 
} from "./services/nutrition";
import { userProfileSchema, insertFoodSchema, insertMealEntrySchema } from "@shared/schema";

// Configure multer for image uploads
const upload = multer({ 
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  storage: multer.memoryStorage() 
});

// Simple in-memory storage for user profile (for MVP testing)
let currentUserProfile = {
  id: "user-1",
  firstName: "John",
  lastName: "Doe",
  email: "john.doe@example.com",
  height: 175,
  weight: 70,
  age: 28,
  gender: "male",
  fitnessGoal: "maintain",
  bmr: 1680,
  dailyCalorieGoal: 1980,
};

export async function registerRoutes(app: Express): Promise<Server> {
  
  // User profile routes
  app.get('/api/user/profile', async (req: any, res) => {
    try {
      // Return current user profile (updated by POST endpoint)
      res.json(currentUserProfile);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  app.post('/api/user/profile', async (req, res) => {
    try {
      const profileData = userProfileSchema.parse(req.body);
      
      // Validate nutrition parameters
      const validationErrors = validateNutritionParams(profileData);
      if (validationErrors.length > 0) {
        return res.status(400).json({ 
          message: "Invalid profile data", 
          errors: validationErrors 
        });
      }

      // Calculate BMR and daily calorie goal
      const bmr = calculateBMR(profileData);
      const dailyCalorieGoal = calculateDailyCalorieGoal(profileData);
      
      // Update the in-memory profile with the calculated values
      currentUserProfile = {
        ...currentUserProfile,
        height: profileData.height,
        weight: profileData.weight,
        age: profileData.age,
        gender: profileData.gender,
        fitnessGoal: profileData.fitnessGoal,
        firstName: profileData.firstName || currentUserProfile.firstName,
        lastName: profileData.lastName || currentUserProfile.lastName,
        email: profileData.email || currentUserProfile.email,
        bmr,
        dailyCalorieGoal,
      };
      
      const updatedProfile = {
        ...currentUserProfile,
        macroTargets: calculateMacroTargets(dailyCalorieGoal, profileData.fitnessGoal)
      };
      
      res.json(updatedProfile);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(400).json({ message: "Invalid profile data" });
    }
  });

  // Food analysis routes
  app.post('/api/food/analyze', upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image provided" });
      }

      // Convert buffer to base64
      const base64Image = req.file.buffer.toString('base64');
      
      // Analyze with OpenAI
      const analysisResult = await analyzeFoodImage(base64Image);
      
      // Create food entry in database
      const food = await storage.createFood({
        name: analysisResult.name,
        caloriesPerServing: analysisResult.calories,
        servingSize: analysisResult.servingSize,
        carbs: analysisResult.macronutrients.carbs,
        protein: analysisResult.macronutrients.protein,
        fat: analysisResult.macronutrients.fat,
        confidence: analysisResult.confidence,
      });

      res.json({
        ...analysisResult,
        foodId: food.id,
      });
    } catch (error) {
      console.error("Error analyzing food image:", error);
      res.status(500).json({ 
        message: "Failed to analyze food image", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Meal entry routes
  app.post('/api/meals', async (req, res) => {
    try {
      const mealData = insertMealEntrySchema.parse(req.body);
      
      // For now, use mock user ID
      const mockUserId = "user-1";
      
      const mealEntry = await storage.createMealEntry({
        ...mealData,
        userId: mockUserId,
      });

      // Update daily summary
      const mealDate = new Date(mealData.date);
      const todaysMeals = await storage.getMealsByUserAndDate(mockUserId, mealDate);
      const nutritionTotals = calculateNutritionTotals(todaysMeals.map(meal => ({
        totalCalories: meal.totalCalories,
        totalCarbs: meal.totalCarbs || 0,
        totalProtein: meal.totalProtein || 0,
        totalFat: meal.totalFat || 0,
      })));

      await storage.upsertDailySummary({
        userId: mockUserId,
        date: mealDate,
        totalCalories: nutritionTotals.calories,
        totalCarbs: nutritionTotals.carbs,
        totalProtein: nutritionTotals.protein,
        totalFat: nutritionTotals.fat,
        mealCount: todaysMeals.length,
      });

      res.json(mealEntry);
    } catch (error) {
      console.error("Error creating meal entry:", error);
      res.status(400).json({ message: "Invalid meal data" });
    }
  });

  app.get('/api/meals', async (req, res) => {
    try {
      const { date, startDate, endDate } = req.query;
      const mockUserId = "user-1";

      let meals;
      if (startDate && endDate) {
        meals = await storage.getMealsByUserAndDateRange(
          mockUserId, 
          new Date(startDate as string), 
          new Date(endDate as string)
        );
      } else if (date) {
        meals = await storage.getMealsByUserAndDate(mockUserId, new Date(date as string));
      } else {
        // Default to today
        meals = await storage.getMealsByUserAndDate(mockUserId, new Date());
      }

      res.json(meals);
    } catch (error) {
      console.error("Error fetching meals:", error);
      res.status(500).json({ message: "Failed to fetch meals" });
    }
  });

  app.delete('/api/meals/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const mockUserId = "user-1";
      
      const success = await storage.deleteMealEntry(id, mockUserId);
      if (success) {
        res.json({ message: "Meal deleted successfully" });
      } else {
        res.status(404).json({ message: "Meal not found" });
      }
    } catch (error) {
      console.error("Error deleting meal:", error);
      res.status(500).json({ message: "Failed to delete meal" });
    }
  });

  // Daily summary routes
  app.get('/api/daily-summary', async (req, res) => {
    try {
      const { date } = req.query;
      const mockUserId = "user-1";
      const targetDate = date ? new Date(date as string) : new Date();

      const summary = await storage.getDailySummary(mockUserId, targetDate);
      
      if (!summary) {
        // Return empty summary if no data exists
        res.json({
          totalCalories: 0,
          totalCarbs: 0,
          totalProtein: 0,
          totalFat: 0,
          mealCount: 0,
        });
      } else {
        res.json(summary);
      }
    } catch (error) {
      console.error("Error fetching daily summary:", error);
      res.status(500).json({ message: "Failed to fetch daily summary" });
    }
  });

  app.get('/api/weekly-summary', async (req, res) => {
    try {
      const mockUserId = "user-1";
      const today = new Date();
      const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      const summaries = await storage.getDailySummariesForRange(mockUserId, oneWeekAgo, today);
      
      res.json(summaries);
    } catch (error) {
      console.error("Error fetching weekly summary:", error);
      res.status(500).json({ message: "Failed to fetch weekly summary" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
