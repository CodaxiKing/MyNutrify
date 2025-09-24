import { useState } from "react";
import { Camera, Search, QrCode, ChefHat, Plus, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

// Import existing components
import { CameraInterface } from "@/components/camera-interface";
import { FoodAnalysisResult } from "@/components/food-analysis-result";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { FoodSearch } from "@/components/food-search";
import { RecipeManager } from "@/components/recipe-manager";
import { AddToMealModal } from "@/components/add-to-meal-modal";

// Import hooks and types
import { useAnalyzeFood } from "@/hooks/use-nutrition-data";
import { useAddMeal } from "@/hooks/use-nutrition-data";
import type { FoodAnalysis, MealType } from "@/types/nutrition";
import type { Food, Recipe } from "@shared/schema";

type FoodMode = 'menu' | 'camera' | 'barcode' | 'search' | 'recipes';

export default function FoodPage() {
  const { toast } = useToast();
  const analyzeFood = useAnalyzeFood();
  const addMeal = useAddMeal();
  
  const [mode, setMode] = useState<FoodMode>('menu');
  const [analysisResult, setAnalysisResult] = useState<FoodAnalysis | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<MealType>('lunch');
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [showAddToMealModal, setShowAddToMealModal] = useState(false);

  // Camera AI Analysis
  const handleImageCapture = async (file: File) => {
    try {
      const result = await analyzeFood.mutateAsync(file);
      setAnalysisResult(result);
      
      // Auto-select meal type based on time
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
        title: "Análise Falhou",
        description: "Falha ao analisar a imagem do alimento. Tente novamente.",
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
        title: "Refeição Adicionada",
        description: `${analysisResult.name} foi adicionado ao seu ${selectedMealType}.`,
      });

      setAnalysisResult(null);
      setMode('menu');
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao adicionar refeição ao diário. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Barcode Detection
  const handleBarcodeDetected = async (barcode: string) => {
    try {
      const response = await fetch('/api/food/barcode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ barcode }),
      });

      if (response.ok) {
        const food = await response.json();
        setSelectedFood(food);
        setShowAddToMealModal(true);
        setMode('menu');
      } else {
        toast({
          title: 'Alimento Não Encontrado',
          description: 'Não encontramos informações para este código de barras.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error searching barcode:', error);
      toast({
        title: 'Erro na Busca',
        description: 'Erro ao buscar informações do código de barras.',
        variant: 'destructive',
      });
    }
  };

  // Food Search
  const handleFoodSelected = (food: Food, quantity: number) => {
    setSelectedFood(food);
    setShowAddToMealModal(true);
    setMode('menu');
  };

  const handleFoodAdded = () => {
    toast({
      title: 'Sucesso!',
      description: 'Alimento adicionado ao seu diário alimentar.',
    });
    setShowAddToMealModal(false);
    setSelectedFood(null);
  };

  // Render current mode
  const renderMode = () => {
    switch (mode) {
      case 'camera':
        if (analysisResult) {
          return (
            <FoodAnalysisResult
              analysis={analysisResult}
              selectedMealType={selectedMealType}
              onMealTypeChange={setSelectedMealType}
              onAddToDiary={handleAddToDiary}
              onRetake={() => setAnalysisResult(null)}
              isAdding={addMeal.isPending}
            />
          );
        }
        return (
          <CameraInterface 
            onImageCapture={handleImageCapture}
            isAnalyzing={analyzeFood.isPending}
          />
        );
      case 'barcode':
        return (
          <BarcodeScanner 
            isOpen={true}
            onClose={() => setMode('menu')}
            onBarcodeDetected={handleBarcodeDetected} 
          />
        );
      case 'search':
        return (
          <FoodSearch 
            isOpen={true}
            onClose={() => setMode('menu')}
            onFoodSelected={handleFoodSelected} 
          />
        );
      case 'recipes':
        return <RecipeManager isOpen={true} onClose={() => setMode('menu')} onRecipeSaved={() => {}} />;
      default:
        return null;
    }
  };

  if (mode !== 'menu') {
    return (
      <div className="space-y-4 pb-24 pt-4">
        <div className="px-4">
          <Button 
            variant="outline" 
            onClick={() => { setMode('menu'); setAnalysisResult(null); }}
            className="mb-4"
          >
            ← Voltar ao Menu
          </Button>
        </div>
        {renderMode()}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Adicionar Alimentos</h1>
        <p className="text-muted-foreground">Escolha como deseja registrar sua refeição</p>
      </div>

      {/* Main Action Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* AI Camera */}
        <Card className="group cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20" onClick={() => setMode('camera')}>
          <CardHeader className="text-center pb-3">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <Camera className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-lg">Câmera IA</CardTitle>
          </CardHeader>
          <CardContent className="text-center pt-0">
            <p className="text-sm text-muted-foreground">Tire foto do alimento para análise automática</p>
            <Badge variant="secondary" className="mt-2">
              <Sparkles className="h-3 w-3 mr-1" />
              Recomendado
            </Badge>
          </CardContent>
        </Card>

        {/* Barcode Scanner */}
        <Card className="group cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20" onClick={() => setMode('barcode')}>
          <CardHeader className="text-center pb-3">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500/10 to-green-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <QrCode className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-lg">Código de Barras</CardTitle>
          </CardHeader>
          <CardContent className="text-center pt-0">
            <p className="text-sm text-muted-foreground">Escaneie produtos industrializados</p>
          </CardContent>
        </Card>

        {/* Manual Search */}
        <Card className="group cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20" onClick={() => setMode('search')}>
          <CardHeader className="text-center pb-3">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500/10 to-blue-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <Search className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-lg">Busca Manual</CardTitle>
          </CardHeader>
          <CardContent className="text-center pt-0">
            <p className="text-sm text-muted-foreground">Procure na base de dados de alimentos</p>
          </CardContent>
        </Card>

        {/* Recipes */}
        <Card className="group cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20" onClick={() => setMode('recipes')}>
          <CardHeader className="text-center pb-3">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-orange-500/10 to-orange-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <ChefHat className="h-8 w-8 text-orange-600" />
            </div>
            <CardTitle className="text-lg">Receitas</CardTitle>
          </CardHeader>
          <CardContent className="text-center pt-0">
            <p className="text-sm text-muted-foreground">Crie e gerencie suas receitas</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Tips */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Dicas Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
            <p className="text-sm text-muted-foreground">Use a <strong>Câmera IA</strong> para obter análises nutricionais precisas</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-green-600 mt-2 flex-shrink-0"></div>
            <p className="text-sm text-muted-foreground">O <strong>Código de Barras</strong> é perfeito para produtos embalados</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-600 mt-2 flex-shrink-0"></div>
            <p className="text-sm text-muted-foreground">Use <strong>Busca Manual</strong> quando souber o nome exato do alimento</p>
          </div>
        </CardContent>
      </Card>

      {/* Add to Meal Modal */}
      <AddToMealModal
        isOpen={showAddToMealModal}
        onClose={() => { setShowAddToMealModal(false); setSelectedFood(null); }}
        food={selectedFood}
        onFoodAdded={handleFoodAdded}
      />
    </div>
  );
}