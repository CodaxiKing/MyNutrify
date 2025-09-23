import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Plus } from "lucide-react";
import { FoodAnalysis, MealType } from "@/types/nutrition";
import { formatCalories, formatMacros } from "@/lib/nutrition-calculator";

interface FoodAnalysisResultProps {
  analysis: FoodAnalysis;
  selectedMealType: MealType;
  onMealTypeChange: (mealType: MealType) => void;
  onAddToDiary: () => void;
  onRetake: () => void;
  isAdding?: boolean;
}

export function FoodAnalysisResult({ 
  analysis, 
  selectedMealType,
  onMealTypeChange,
  onAddToDiary, 
  onRetake,
  isAdding
}: FoodAnalysisResultProps) {
  const mealTypes: { id: MealType; label: string; icon: string }[] = [
    { id: 'breakfast', label: 'Breakfast', icon: '☕' },
    { id: 'lunch', label: 'Lunch', icon: '🍽️' },
    { id: 'dinner', label: 'Dinner', icon: '🍽️' },
    { id: 'snack', label: 'Snack', icon: '🍎' },
  ];

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
          <h3 className="text-lg font-semibold">AI Analysis</h3>
          <Badge 
            variant="secondary" 
            className={`${getConfidenceColor(analysis.confidence)} text-white`}
          >
            {Math.round(analysis.confidence * 100)}% confidence
          </Badge>
        </div>
        
        {/* Food Information */}
        <div className="flex items-center space-x-4 p-4 bg-muted rounded-lg">
          <div className="w-16 h-16 rounded-lg bg-accent/20 flex items-center justify-center">
            <span className="text-2xl">🍽️</span>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-lg" data-testid="text-food-name">
              {analysis.name}
            </h4>
            <p className="text-sm text-muted-foreground">
              {analysis.servingSize}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Calories:</span>
                <span className="font-semibold ml-1" data-testid="text-analysis-calories">
                  {formatCalories(analysis.calories)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Serving:</span>
                <span className="font-semibold ml-1" data-testid="text-serving-size">
                  {analysis.servingSize}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Macronutrient Breakdown */}
        <div className="bg-muted rounded-lg p-4">
          <h5 className="font-medium mb-3">Nutritional Breakdown</h5>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-chart-1 font-semibold" data-testid="text-analysis-carbs">
                {formatMacros(analysis.macronutrients.carbs)}
              </div>
              <div className="text-xs text-muted-foreground">Carbs</div>
            </div>
            <div>
              <div className="text-chart-2 font-semibold" data-testid="text-analysis-protein">
                {formatMacros(analysis.macronutrients.protein)}
              </div>
              <div className="text-xs text-muted-foreground">Protein</div>
            </div>
            <div>
              <div className="text-chart-3 font-semibold" data-testid="text-analysis-fat">
                {formatMacros(analysis.macronutrients.fat)}
              </div>
              <div className="text-xs text-muted-foreground">Fat</div>
            </div>
          </div>
        </div>

        {/* Meal Category Selection */}
        <div>
          <h5 className="font-medium mb-3">Add to:</h5>
          <div className="grid grid-cols-4 gap-2">
            {mealTypes.map((meal) => (
              <Button
                key={meal.id}
                variant={selectedMealType === meal.id ? "default" : "outline"}
                className="p-3 flex flex-col items-center space-y-1 h-auto"
                onClick={() => onMealTypeChange(meal.id)}
                data-testid={`button-meal-${meal.id}`}
              >
                <span className="text-lg">{meal.icon}</span>
                <span className="text-xs">{meal.label}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <Button 
            className="flex-1" 
            onClick={onAddToDiary}
            disabled={isAdding}
            data-testid="button-add-to-diary"
          >
            {isAdding ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Adding...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add to Diary
              </>
            )}
          </Button>
          <Button 
            variant="outline" 
            onClick={onRetake}
            disabled={isAdding}
            data-testid="button-retake"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
