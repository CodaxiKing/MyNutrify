import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { analyzeFoodImage } from "./services/openai";
import { openFoodFactsService } from "./services/openfoodfacts";
import { 
  calculateBMR, 
  calculateDailyCalorieGoal, 
  calculateMacroTargets,
  calculateNutritionTotals,
  validateNutritionParams 
} from "./services/nutrition";
import { 
  userProfileSchema, 
  insertFoodSchema, 
  insertMealEntrySchema, 
  mealEntries, 
  exercises, 
  activityEntries,
  recipeSchema,
  recipeIngredientSchema,
  foodSearchSchema,
  barcodeSchema
} from "@shared/schema";
import { db } from "./db";
import { calculateCaloriesBurned, searchExercises, validateActivityData, commonExercises } from "./services/activity";
import Stripe from "stripe";

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// VIP system imports
import { 
  requireAuth, 
  requireAIAnalysis, 
  requirePremium, 
  requireVIP,
  requireRecipeLimit,
  requireAdvancedNutrition,
  requireDetailedReports,
  requireDataExport,
  incrementDailyAIUsage,
  type AuthenticatedRequest
} from "./middleware/permissions";

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
      
      // Create/update user in database
      const userData = {
        id: "user-1", // Use fixed ID for MVP
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
      
      // Upsert user in database
      const user = await storage.upsertUser(userData);
      
      // Update the in-memory profile for backwards compatibility
      currentUserProfile = {
        ...userData,
      };
      
      const updatedProfile = {
        ...user,
        macroTargets: calculateMacroTargets(dailyCalorieGoal, profileData.fitnessGoal)
      };
      
      res.json(updatedProfile);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(400).json({ message: "Invalid profile data" });
    }
  });

  // Food analysis routes - PROTECTED by AI analysis limit
  app.post('/api/food/analyze', requireAuth, requireAIAnalysis, upload.single('image'), async (req: any, res) => {
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

      // Increment AI usage counter for the user
      await incrementDailyAIUsage(req.user.id);

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
      // For now, use mock user ID
      const mockUserId = "user-1";
      
      // Manually validate and transform the data
      const { mealType, date, quantity, totalCalories, totalCarbs, totalProtein, totalFat, foodId } = req.body;
      
      const mealData = {
        userId: mockUserId,
        mealType: mealType,
        date: new Date(date), // Convert string to Date
        quantity: quantity || 1,
        totalCalories: totalCalories,
        totalCarbs: totalCarbs || 0,
        totalProtein: totalProtein || 0,
        totalFat: totalFat || 0,
        foodId: foodId || null
      };
      
      // Directly insert to database bypassing schema validation
      const [mealEntry] = await db
        .insert(mealEntries)
        .values(mealData)
        .returning();

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

  // Exercise routes
  app.get('/api/exercises', async (req, res) => {
    try {
      const { category } = req.query;
      
      // First, populate database with common exercises if empty
      const existingExercises = await storage.getAllExercises();
      if (existingExercises.length === 0) {
        for (const exercise of commonExercises) {
          await storage.createExercise(exercise);
        }
      }
      
      let exercises;
      if (category) {
        exercises = await storage.searchExercises('', category as string);
      } else {
        exercises = await storage.getAllExercises();
      }
      
      res.json(exercises);
    } catch (error) {
      console.error("Error fetching exercises:", error);
      res.status(500).json({ message: "Failed to fetch exercises" });
    }
  });

  app.get('/api/exercises/search', async (req, res) => {
    try {
      const { q: query, category } = req.query;
      
      if (!query) {
        return res.status(400).json({ message: "Query parameter is required" });
      }
      
      const exercises = await storage.searchExercises(query as string, category as string);
      res.json(exercises);
    } catch (error) {
      console.error("Error searching exercises:", error);
      res.status(500).json({ message: "Failed to search exercises" });
    }
  });

  // Activity routes
  app.post('/api/activities', async (req, res) => {
    try {
      const mockUserId = "user-1";
      const { exerciseId, customExerciseName, duration, intensity, notes, metValue } = req.body;
      
      // Get user weight for calorie calculation
      const userWeight = currentUserProfile.weight || 70; // Default 70kg if not set
      
      // Calculate calories burned
      let caloriesBurned = 0;
      let finalMetValue = metValue;
      
      if (exerciseId) {
        const exercise = await storage.getExerciseById(exerciseId);
        if (exercise) {
          finalMetValue = exercise.metValue;
        }
      }
      
      if (finalMetValue) {
        const calculation = calculateCaloriesBurned(finalMetValue, userWeight, duration, intensity || 'moderate');
        caloriesBurned = calculation.caloriesBurned;
      }
      
      // Validate activity data
      const validationErrors = validateActivityData({
        duration,
        intensity: intensity || 'moderate',
        caloriesBurned
      });
      
      if (validationErrors.length > 0) {
        return res.status(400).json({ 
          message: "Invalid activity data", 
          errors: validationErrors 
        });
      }
      
      // Create activity entry
      const activityData = {
        userId: mockUserId,
        exerciseId: exerciseId || null,
        customExerciseName: customExerciseName || null,
        duration,
        intensity: intensity || 'moderate',
        caloriesBurned,
        date: new Date(),
        notes: notes || null
      };
      
      const activityEntry = await storage.createActivityEntry(activityData);
      
      // Update daily summary with burned calories
      const today = new Date();
      const existingSummary = await storage.getDailySummary(mockUserId, today);
      const todaysActivities = await storage.getActivitiesByUserAndDate(mockUserId, today);
      const totalCaloriesBurned = todaysActivities.reduce((sum, activity) => sum + activity.caloriesBurned, 0);
      
      const summaryData = {
        userId: mockUserId,
        date: today,
        totalCalories: existingSummary?.totalCalories || 0,
        totalCarbs: existingSummary?.totalCarbs || 0,
        totalProtein: existingSummary?.totalProtein || 0,
        totalFat: existingSummary?.totalFat || 0,
        mealCount: existingSummary?.mealCount || 0,
        caloriesBurned: totalCaloriesBurned,
        netCalories: (existingSummary?.totalCalories || 0) - totalCaloriesBurned
      };
      
      await storage.upsertDailySummary(summaryData);
      
      res.json(activityEntry);
    } catch (error) {
      console.error("Error creating activity entry:", error);
      res.status(500).json({ message: "Failed to create activity entry" });
    }
  });

  app.get('/api/activities', async (req, res) => {
    try {
      const { date, startDate, endDate } = req.query;
      const mockUserId = "user-1";

      let activities;
      if (startDate && endDate) {
        activities = await storage.getActivitiesByUserAndDateRange(
          mockUserId, 
          new Date(startDate as string), 
          new Date(endDate as string)
        );
      } else if (date) {
        activities = await storage.getActivitiesByUserAndDate(mockUserId, new Date(date as string));
      } else {
        // Default to today
        activities = await storage.getActivitiesByUserAndDate(mockUserId, new Date());
      }

      res.json(activities);
    } catch (error) {
      console.error("Error fetching activities:", error);
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  app.delete('/api/activities/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const mockUserId = "user-1";
      
      const success = await storage.deleteActivityEntry(id, mockUserId);
      if (success) {
        // Update daily summary after deletion
        const today = new Date();
        const todaysActivities = await storage.getActivitiesByUserAndDate(mockUserId, today);
        const totalCaloriesBurned = todaysActivities.reduce((sum, activity) => sum + activity.caloriesBurned, 0);
        
        const existingSummary = await storage.getDailySummary(mockUserId, today);
        if (existingSummary) {
          const summaryData = {
            userId: mockUserId,
            date: today,
            totalCalories: existingSummary.totalCalories || 0,
            totalCarbs: existingSummary.totalCarbs || 0,
            totalProtein: existingSummary.totalProtein || 0,
            totalFat: existingSummary.totalFat || 0,
            mealCount: existingSummary.mealCount || 0,
            caloriesBurned: totalCaloriesBurned,
            netCalories: (existingSummary.totalCalories || 0) - totalCaloriesBurned
          };
          
          await storage.upsertDailySummary(summaryData);
        }
        
        res.json({ message: "Activity deleted successfully" });
      } else {
        res.status(404).json({ message: "Activity not found" });
      }
    } catch (error) {
      console.error("Error deleting activity:", error);
      res.status(500).json({ message: "Failed to delete activity" });
    }
  });

  // Food search routes
  app.get('/api/food/search', async (req, res) => {
    try {
      const { q: query, limit } = req.query;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: "Query parameter is required" });
      }

      const validatedQuery = foodSearchSchema.parse({ 
        query, 
        limit: limit ? parseInt(limit as string) : undefined 
      });
      
      // Search in local database first
      const localResults = await storage.searchFoods(validatedQuery.query, validatedQuery.limit);
      
      // If we have less than the limit from local search, search OpenFoodFacts
      let externalResults: any[] = [];
      if (localResults.length < validatedQuery.limit) {
        const remainingLimit = validatedQuery.limit - localResults.length;
        const openFoodFactsResults = await openFoodFactsService.searchByName(validatedQuery.query, remainingLimit);
        
        // Save external results to local database for future searches and get proper IDs
        for (const externalFood of openFoodFactsResults) {
          try {
            const savedFood = await storage.createFood(externalFood);
            externalResults.push(savedFood);
          } catch (error) {
            // If food already exists, try to find it by name and barcode
            console.log("Food might already exist, attempting to find existing:", error);
            try {
              if (externalFood.barcode) {
                const existingFood = await storage.getFoodByBarcode(externalFood.barcode);
                if (existingFood) {
                  externalResults.push(existingFood);
                }
              }
            } catch (findError) {
              console.log("Could not find existing food:", findError);
            }
          }
        }
      }
      
      // Combine and return results
      const allResults = [...localResults, ...externalResults];
      res.json(allResults.slice(0, validatedQuery.limit));
    } catch (error) {
      console.error("Error searching foods:", error);
      res.status(500).json({ message: "Failed to search foods" });
    }
  });

  app.post('/api/food/barcode', async (req, res) => {
    try {
      const { barcode } = barcodeSchema.parse(req.body);
      
      // Check if we already have this barcode in our database
      let food = await storage.getFoodByBarcode(barcode);
      
      if (!food) {
        // Search OpenFoodFacts for the barcode
        const externalFood = await openFoodFactsService.searchByBarcode(barcode);
        
        if (externalFood) {
          // Save to local database
          food = await storage.createFood(externalFood);
        }
      }
      
      if (food) {
        res.json(food);
      } else {
        res.status(404).json({ message: "Food not found for this barcode" });
      }
    } catch (error) {
      console.error("Error searching barcode:", error);
      res.status(500).json({ message: "Failed to search barcode" });
    }
  });

  // Recipe routes
  app.get('/api/recipes', requireAuth, async (req: any, res) => {
    try {
      const recipes = await storage.getUserRecipes(req.user.id);
      res.json(recipes);
    } catch (error) {
      console.error("Error fetching recipes:", error);
      res.status(500).json({ message: "Failed to fetch recipes" });
    }
  });

  app.get('/api/recipes/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const recipe = await storage.getRecipeWithIngredients(id);
      
      if (recipe) {
        res.json(recipe);
      } else {
        res.status(404).json({ message: "Recipe not found" });
      }
    } catch (error) {
      console.error("Error fetching recipe:", error);
      res.status(500).json({ message: "Failed to fetch recipe" });
    }
  });

  app.post('/api/recipes', requireAuth, requireRecipeLimit, async (req: any, res) => {
    try {
      const recipeData = recipeSchema.parse({
        ...req.body,
        userId: req.user.id
      });

      const recipe = await storage.createRecipe(recipeData);
      res.json(recipe);
    } catch (error) {
      console.error("Error creating recipe:", error);
      res.status(400).json({ message: "Invalid recipe data" });
    }
  });

  app.put('/api/recipes/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updates = recipeSchema.partial().parse(req.body);
      
      const recipe = await storage.updateRecipe(id, updates);
      res.json(recipe);
    } catch (error) {
      console.error("Error updating recipe:", error);
      res.status(400).json({ message: "Invalid recipe data" });
    }
  });

  app.delete('/api/recipes/:id', requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const success = await storage.deleteRecipe(id, req.user.id);
      if (success) {
        res.json({ message: "Recipe deleted successfully" });
      } else {
        res.status(404).json({ message: "Recipe not found" });
      }
    } catch (error) {
      console.error("Error deleting recipe:", error);
      res.status(500).json({ message: "Failed to delete recipe" });
    }
  });

  // Recipe ingredient routes
  app.get('/api/recipes/:id/ingredients', async (req, res) => {
    try {
      const { id } = req.params;
      const ingredients = await storage.getRecipeIngredients(id);
      res.json(ingredients);
    } catch (error) {
      console.error("Error fetching recipe ingredients:", error);
      res.status(500).json({ message: "Failed to fetch recipe ingredients" });
    }
  });

  app.post('/api/recipes/:id/ingredients', async (req, res) => {
    try {
      const { id: recipeId } = req.params;
      const ingredientData = recipeIngredientSchema.parse({
        ...req.body,
        recipeId
      });

      const ingredient = await storage.addRecipeIngredient(ingredientData);
      res.json(ingredient);
    } catch (error) {
      console.error("Error adding recipe ingredient:", error);
      res.status(400).json({ message: "Invalid ingredient data" });
    }
  });

  app.put('/api/recipe-ingredients/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { quantity } = req.body;
      
      if (typeof quantity !== 'number' || quantity <= 0) {
        return res.status(400).json({ message: "Valid quantity is required" });
      }

      const ingredient = await storage.updateRecipeIngredient(id, quantity);
      res.json(ingredient);
    } catch (error) {
      console.error("Error updating recipe ingredient:", error);
      res.status(400).json({ message: "Failed to update ingredient" });
    }
  });

  app.delete('/api/recipe-ingredients/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      const success = await storage.deleteRecipeIngredient(id);
      if (success) {
        res.json({ message: "Ingredient removed successfully" });
      } else {
        res.status(404).json({ message: "Ingredient not found" });
      }
    } catch (error) {
      console.error("Error removing recipe ingredient:", error);
      res.status(500).json({ message: "Failed to remove ingredient" });
    }
  });

  // === VIP SUBSCRIPTION ROUTES ===
  
  // Get user plan info
  app.get('/api/user/plan', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUserWithSubscription(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        plan: user.plan,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionEndDate: user.subscriptionEndDate,
        trialEndDate: user.trialEndDate,
        aiAnalysisUsedToday: user.aiAnalysisUsedToday,
        stripeCustomerId: user.stripeCustomerId,
        stripeSubscriptionId: user.stripeSubscriptionId,
      });
    } catch (error) {
      console.error("Error fetching user plan:", error);
      res.status(500).json({ message: "Failed to fetch plan info" });
    }
  });

  // Create subscription checkout session
  app.post('/api/create-checkout-session', requireAuth, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ message: "Stripe não configurado" });
      }

      const { plan, billing } = req.body; // plan: 'premium' | 'vip', billing: 'monthly' | 'yearly'
      
      if (!plan || !billing) {
        return res.status(400).json({ message: "Plan and billing cycle required" });
      }

      const priceId = billing === 'monthly' 
        ? (plan === 'premium' ? 'price_premium_monthly' : 'price_vip_monthly')
        : (plan === 'premium' ? 'price_premium_yearly' : 'price_vip_yearly');

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        customer_email: req.user.id + "@mynutrify.app", // Usar ID como email temporário
        metadata: {
          userId: req.user.id,
          plan: plan,
          billing: billing,
        },
        success_url: `${process.env.CLIENT_URL || 'http://localhost:5000'}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.CLIENT_URL || 'http://localhost:5000'}/cancel`,
        // trial_period_days: plan === 'premium' ? 7 : 14, // Premium: 7 dias, VIP: 14 dias // Feature não disponível na versão gratuita
      });

      res.json({ 
        sessionId: session.id,
        url: session.url 
      });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ message: "Erro ao criar sessão de checkout" });
    }
  });

  // Webhook do Stripe para processar eventos
  app.post('/api/stripe-webhook', async (req, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ message: "Stripe não configurado" });
      }

      const sig = req.headers['stripe-signature'];
      let event: Stripe.Event;

      try {
        event = stripe.webhooks.constructEvent(req.body, sig as string, process.env.STRIPE_WEBHOOK_SECRET || '');
      } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return res.status(400).send('Webhook Error: Invalid signature');
      }

      // Handle the event
      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data.object as Stripe.Checkout.Session;
          const { userId, plan } = session.metadata || {};
          
          if (userId && plan) {
            // Update user plan
            await storage.updateUserPlan(userId, plan as 'premium' | 'vip');
            await storage.updateUserStripeInfo(userId, {
              customerId: session.customer as string,
              subscriptionId: session.subscription as string,
              status: 'active'
            });
          }
          break;

        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          const subscription = event.data.object as Stripe.Subscription;
          
          // Find user by Stripe customer ID
          // TODO: Implement reverse lookup when needed
          break;

        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).json({ message: "Webhook processing failed" });
    }
  });

  // Get subscription limits/usage
  app.get('/api/user/limits', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUserWithSubscription(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const recipes = await storage.getUserRecipes(user.id);

      res.json({
        plan: user.plan,
        usage: {
          aiAnalysisToday: user.aiAnalysisUsedToday,
          recipesCreated: recipes.length,
        },
        limits: {
          aiAnalysisPerDay: user.plan === 'free' ? 3 : (user.plan === 'premium' ? 25 : -1),
          recipesLimit: user.plan === 'free' ? 5 : (user.plan === 'premium' ? 50 : -1),
        }
      });
    } catch (error) {
      console.error("Error fetching user limits:", error);
      res.status(500).json({ message: "Failed to fetch limits" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
