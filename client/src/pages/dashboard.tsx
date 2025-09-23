import { DailyProgress } from "@/components/daily-progress";
import { MacronutrientBars } from "@/components/macronutrient-bars";
import { WeeklyChart } from "@/components/weekly-chart";
import { MealCard } from "@/components/meal-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDailySummary, useWeeklySummary, useMealsForDate, useDeleteMeal } from "@/hooks/use-nutrition-data";
import { useUserProfile } from "@/hooks/use-user-profile";
import { calculateMacroTargets } from "@/lib/nutrition-calculator";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { toast } = useToast();
  const { data: profile } = useUserProfile();
  const { data: dailySummary } = useDailySummary();
  const { data: weeklySummary } = useWeeklySummary();
  const { data: todaysMeals = [] } = useMealsForDate();
  const deleteModal = useDeleteMeal();

  const macroTargets = profile?.dailyCalorieGoal 
    ? calculateMacroTargets(profile.dailyCalorieGoal, profile.fitnessGoal || 'maintain')
    : { protein: 0, carbs: 0, fat: 0 };

  const currentMacros = {
    carbs: dailySummary?.totalCarbs || 0,
    protein: dailySummary?.totalProtein || 0,
    fat: dailySummary?.totalFat || 0,
  };

  // Get recent meals (last 3)
  const recentMeals = todaysMeals
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  const handleDeleteMeal = async (mealId: string) => {
    try {
      await deleteModal.mutateAsync(mealId);
      toast({
        title: "Meal Deleted",
        description: "The meal has been removed from your diary.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete meal. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-4 space-y-6 pb-20">
      {/* Daily Progress */}
      <DailyProgress 
        consumed={dailySummary?.totalCalories || 0}
        goal={profile?.dailyCalorieGoal || 2000}
      />

      {/* Macronutrients */}
      <MacronutrientBars 
        current={currentMacros}
        targets={macroTargets}
      />

      {/* Weekly Chart */}
      <WeeklyChart data={weeklySummary} />

      {/* Recent Meals */}
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Recent Meals</h3>
            <Button variant="ghost" size="sm" className="text-primary" data-testid="button-view-all-meals">
              View All
            </Button>
          </div>
          
          {recentMeals.length > 0 ? (
            <div className="space-y-3">
              {recentMeals.map((meal) => (
                <MealCard
                  key={meal.id}
                  mealEntry={meal}
                  onDelete={handleDeleteMeal}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No meals recorded yet today</p>
              <p className="text-sm mt-1">Use the camera to scan your first meal!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
