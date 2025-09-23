import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getMealIcon } from "@/components/tab-navigation";
import { MealEntry, MealType } from "@/types/nutrition";
import { formatCalories } from "@/lib/nutrition-calculator";
import { MealCard } from "./meal-card";

interface MealCategorySelectorProps {
  mealType: MealType;
  meals: MealEntry[];
  onEditMeal?: (meal: MealEntry) => void;
  onDeleteMeal?: (mealId: string) => void;
}

const mealTypeLabels: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch', 
  dinner: 'Dinner',
  snack: 'Snacks'
};

const mealTypeIcons: Record<MealType, string> = {
  breakfast: '☕',
  lunch: '🍽️',
  dinner: '🍽️', 
  snack: '🍎'
};

export function MealCategorySelector({ 
  mealType, 
  meals, 
  onEditMeal, 
  onDeleteMeal 
}: MealCategorySelectorProps) {
  const totalCalories = meals.reduce((sum, meal) => sum + meal.totalCalories, 0);
  const MealIcon = getMealIcon(mealType);

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center space-x-3">
            <MealIcon className="h-5 w-5 text-accent" />
            <h3 className="font-semibold" data-testid={`text-meal-category-${mealType}`}>
              {mealTypeLabels[mealType]}
            </h3>
            <Badge variant="secondary" className="text-xs">
              {meals.length} {meals.length === 1 ? 'item' : 'items'}
            </Badge>
          </div>
          <div className="text-sm font-medium" data-testid={`text-meal-total-${mealType}`}>
            {formatCalories(totalCalories)} cal
          </div>
        </div>
        
        {meals.length > 0 ? (
          <div className="p-4 space-y-3">
            {meals.map((meal) => (
              <MealCard
                key={meal.id}
                mealEntry={meal}
                onEdit={onEditMeal}
                onDelete={onDeleteMeal}
              />
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-muted-foreground">
            <span className="text-4xl mb-2 block">{mealTypeIcons[mealType]}</span>
            <p className="text-sm">No {mealTypeLabels[mealType].toLowerCase()} recorded yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
