import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { MealCategorySelector } from "@/components/meal-category-selector";
import { useMealsForDate, useDeleteMeal } from "@/hooks/use-nutrition-data";
import { useToast } from "@/hooks/use-toast";
import { MealType, MealEntry } from "@/types/nutrition";
import { formatCalories, formatMacros } from "@/lib/nutrition-calculator";

export default function Diary() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { data: meals = [] } = useMealsForDate(selectedDate);
  const deleteMeal = useDeleteMeal();

  // Group meals by type
  const mealsByType: Record<MealType, MealEntry[]> = {
    breakfast: meals.filter(m => m.mealType === 'breakfast'),
    lunch: meals.filter(m => m.mealType === 'lunch'),
    dinner: meals.filter(m => m.mealType === 'dinner'),
    snack: meals.filter(m => m.mealType === 'snack'),
  };

  // Calculate totals
  const totals = meals.reduce(
    (acc, meal) => ({
      calories: acc.calories + meal.totalCalories,
      carbs: acc.carbs + meal.totalCarbs,
      protein: acc.protein + meal.totalProtein,
      fat: acc.fat + meal.totalFat,
    }),
    { calories: 0, carbs: 0, protein: 0, fat: 0 }
  );

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 1 : -1));
    setSelectedDate(newDate);
  };

  const handleDeleteMeal = async (mealId: string) => {
    try {
      await deleteMeal.mutateAsync(mealId);
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

  const isToday = selectedDate.toDateString() === new Date().toDateString();
  const dateDisplay = isToday ? 'Today' : selectedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: selectedDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  });

  return (
    <div className="p-4 space-y-4 pb-20">
      {/* Date Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateDate('prev')}
          data-testid="button-prev-day"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold" data-testid="text-diary-date">
          {dateDisplay}
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateDate('next')}
          data-testid="button-next-day"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Daily Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-primary font-bold text-xl" data-testid="text-diary-total-calories">
                {formatCalories(totals.calories)}
              </div>
              <div className="text-xs text-muted-foreground">Calories</div>
            </div>
            <div>
              <div className="text-chart-1 font-bold text-xl" data-testid="text-diary-total-carbs">
                {formatMacros(totals.carbs)}
              </div>
              <div className="text-xs text-muted-foreground">Carbs</div>
            </div>
            <div>
              <div className="text-chart-2 font-bold text-xl" data-testid="text-diary-total-protein">
                {formatMacros(totals.protein)}
              </div>
              <div className="text-xs text-muted-foreground">Protein</div>
            </div>
            <div>
              <div className="text-chart-3 font-bold text-xl" data-testid="text-diary-total-fat">
                {formatMacros(totals.fat)}
              </div>
              <div className="text-xs text-muted-foreground">Fat</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Meals by Category */}
      <div className="space-y-4">
        {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((mealType) => (
          <MealCategorySelector
            key={mealType}
            mealType={mealType}
            meals={mealsByType[mealType]}
            onDeleteMeal={handleDeleteMeal}
          />
        ))}
      </div>

      {/* Add Manual Entry Button */}
      <Button 
        variant="outline" 
        className="w-full p-4 border-2 border-dashed hover:border-primary hover:text-primary"
        data-testid="button-add-manual-meal"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Manual Entry
      </Button>
    </div>
  );
}
