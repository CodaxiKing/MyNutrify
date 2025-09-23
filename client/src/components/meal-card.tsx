import { Button } from "@/components/ui/button";
import { getMealIcon } from "@/components/tab-navigation";
import { formatCalories } from "@/lib/nutrition-calculator";
import { Edit2, Trash2 } from "lucide-react";
import { MealEntry } from "@/types/nutrition";

interface MealCardProps {
  mealEntry: MealEntry;
  onEdit?: (meal: MealEntry) => void;
  onDelete?: (mealId: string) => void;
}

export function MealCard({ mealEntry, onEdit, onDelete }: MealCardProps) {
  const MealIcon = getMealIcon(mealEntry.mealType);
  
  return (
    <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
      <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center">
        <MealIcon className="h-6 w-6 text-accent" />
      </div>
      <div className="flex-1">
        <div className="font-medium" data-testid={`text-meal-name-${mealEntry.id}`}>
          {mealEntry.foodName || 'Unknown Food'}
        </div>
        <div className="text-sm text-muted-foreground">
          {mealEntry.quantity > 1 && `${mealEntry.quantity} servings • `}
          {new Date(mealEntry.date).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>
      <div className="text-right flex items-center space-x-2">
        <div>
          <div className="font-semibold" data-testid={`text-meal-calories-${mealEntry.id}`}>
            {formatCalories(mealEntry.totalCalories)} cal
          </div>
          <div className="text-xs text-muted-foreground">
            C: {Math.round(mealEntry.totalCarbs)}g | 
            P: {Math.round(mealEntry.totalProtein)}g | 
            F: {Math.round(mealEntry.totalFat)}g
          </div>
        </div>
        <div className="flex flex-col space-y-1">
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => onEdit(mealEntry)}
              data-testid={`button-edit-meal-${mealEntry.id}`}
            >
              <Edit2 className="h-3 w-3" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
              onClick={() => onDelete(mealEntry.id!)}
              data-testid={`button-delete-meal-${mealEntry.id}`}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
