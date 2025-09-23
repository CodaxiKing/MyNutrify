import { useState } from "react";
import { CameraInterface } from "@/components/camera-interface";
import { FoodAnalysisResult } from "@/components/food-analysis-result";
import { useAnalyzeFood, useAddMeal } from "@/hooks/use-nutrition-data";
import { useToast } from "@/hooks/use-toast";
import { FoodAnalysis, MealType } from "@/types/nutrition";

export default function Camera() {
  const { toast } = useToast();
  const analyzeFood = useAnalyzeFood();
  const addMeal = useAddMeal();
  
  const [analysisResult, setAnalysisResult] = useState<FoodAnalysis | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<MealType>('lunch');

  const handleImageCapture = async (file: File) => {
    try {
      const result = await analyzeFood.mutateAsync(file);
      setAnalysisResult(result);
      
      // Auto-select meal type based on time of day
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 11) {
        setSelectedMealType('breakfast');
      } else if (hour >= 11 && hour < 16) {
        setSelectedMealType('lunch');
      } else if (hour >= 16 && hour < 21) {
        setSelectedMealType('dinner');
      } else {
        setSelectedMealType('snack');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze the food image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddToDiary = async () => {
    if (!analysisResult) return;

    try {
      await addMeal.mutateAsync({
        mealType: selectedMealType,
        date: new Date(),
        quantity: 1,
        totalCalories: analysisResult.calories,
        totalCarbs: analysisResult.macronutrients.carbs,
        totalProtein: analysisResult.macronutrients.protein,
        totalFat: analysisResult.macronutrients.fat,
        foodId: analysisResult.foodId,
        foodName: analysisResult.name,
      });

      toast({
        title: "Meal Added",
        description: `${analysisResult.name} has been added to your ${selectedMealType}.`,
      });

      // Reset for next analysis
      setAnalysisResult(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add meal to diary. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRetake = () => {
    setAnalysisResult(null);
  };

  return (
    <div className="space-y-4 pb-20">
      {!analysisResult ? (
        <CameraInterface 
          onImageCapture={handleImageCapture}
          isAnalyzing={analyzeFood.isPending}
        />
      ) : (
        <FoodAnalysisResult
          analysis={analysisResult}
          selectedMealType={selectedMealType}
          onMealTypeChange={setSelectedMealType}
          onAddToDiary={handleAddToDiary}
          onRetake={handleRetake}
          isAdding={addMeal.isPending}
        />
      )}
    </div>
  );
}
