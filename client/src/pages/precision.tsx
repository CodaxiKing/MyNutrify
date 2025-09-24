import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ScanLine, 
  Search, 
  ChefHat, 
  Plus,
  Clock,
  Zap,
  Target
} from 'lucide-react';
import { BarcodeScanner } from '@/components/barcode-scanner';
import { FoodSearch } from '@/components/food-search';
import { RecipeManager } from '@/components/recipe-manager';
import { AddToMealModal } from '@/components/add-to-meal-modal';
import { toast } from '@/hooks/use-toast';

interface Food {
  id: string;
  name: string;
  caloriesPerServing: number;
  servingSize: string;
  carbs?: number;
  protein?: number;
  fat?: number;
  source?: string;
}

interface Recipe {
  id?: string;
  name: string;
  description?: string;
  servings: number;
  totalCalories: number;
  totalCarbs?: number;
  totalProtein?: number;
  totalFat?: number;
  ingredients?: any[];
}

export default function Precision() {
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showFoodSearch, setShowFoodSearch] = useState(false);
  const [showRecipeManager, setShowRecipeManager] = useState(false);
  const [showAddToMealModal, setShowAddToMealModal] = useState(false);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [userRecipes, setUserRecipes] = useState<Recipe[]>([]);
  const [recentFoods, setRecentFoods] = useState<Food[]>([]);

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
        
        // Add to recent foods
        setRecentFoods(prev => {
          const filtered = prev.filter(f => f.id !== food.id);
          return [food, ...filtered].slice(0, 5);
        });

        // Show add to meal modal
        setSelectedFood(food);
        setShowAddToMealModal(true);
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

  const handleFoodSelected = (food: Food, quantity: number) => {
    // Add to recent foods
    setRecentFoods(prev => {
      const filtered = prev.filter(f => f.id !== food.id);
      return [food, ...filtered].slice(0, 5);
    });

    // Show add to meal modal
    setSelectedFood(food);
    setShowAddToMealModal(true);
  };

  const handleRecipeSaved = (recipe: Recipe) => {
    setUserRecipes(prev => {
      const filtered = prev.filter(r => r.id !== recipe.id);
      return [recipe, ...filtered];
    });
  };

  const handleFoodAdded = () => {
    // Refresh the app or trigger a re-fetch of daily summary
    toast({
      title: 'Sucesso!',
      description: 'Alimento adicionado ao seu diário alimentar.',
    });
  };

  const handleCloseAddToMealModal = () => {
    setShowAddToMealModal(false);
    setSelectedFood(null);
  };

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Target className="h-6 w-6 text-primary" />
          Precisão e Controle
        </h1>
        <p className="text-muted-foreground">
          Ferramentas avançadas para rastreamento nutricional preciso
        </p>
      </div>

      <Tabs defaultValue="scanner" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="scanner">Scanner</TabsTrigger>
          <TabsTrigger value="manual">Busca Manual</TabsTrigger>
          <TabsTrigger value="recipes">Receitas</TabsTrigger>
        </TabsList>

        {/* Scanner Tab */}
        <TabsContent value="scanner" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScanLine className="h-5 w-5" />
                Scanner de Código de Barras
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Escaneie códigos de barras para obter informações nutricionais precisas de produtos alimentícios.
              </p>
              
              <div className="grid gap-3">
                <Button 
                  onClick={() => setShowBarcodeScanner(true)}
                  className="w-full"
                  size="lg"
                >
                  <ScanLine className="h-5 w-5 mr-2" />
                  Abrir Scanner de Código de Barras
                </Button>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 border rounded-lg">
                    <Zap className="h-5 w-5 mx-auto text-green-600 mb-1" />
                    <p className="text-xs font-medium">Rápido</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <Target className="h-5 w-5 mx-auto text-blue-600 mb-1" />
                    <p className="text-xs font-medium">Preciso</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <Clock className="h-5 w-5 mx-auto text-purple-600 mb-1" />
                    <p className="text-xs font-medium">Eficiente</p>
                  </div>
                </div>
              </div>

              {recentFoods.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium">Alimentos Recentes</h3>
                  <div className="space-y-2">
                    {recentFoods.map((food) => (
                      <div key={food.id} className="flex items-center justify-between p-2 border rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{food.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {food.caloriesPerServing} cal • {food.servingSize}
                          </p>
                        </div>
                        {food.source && (
                          <Badge variant="secondary" className="text-xs">
                            {food.source === 'openfoodfacts' ? 'OpenFoodFacts' : 'Banco de Dados'}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manual Search Tab */}
        <TabsContent value="manual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Busca Manual de Alimentos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Busque alimentos por nome com resultados em tempo real de nossa base de dados e OpenFoodFacts.
              </p>
              
              <Button 
                onClick={() => setShowFoodSearch(true)}
                className="w-full"
                size="lg"
              >
                <Search className="h-5 w-5 mr-2" />
                Buscar Alimentos
              </Button>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">Recursos da Busca:</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Busca em tempo real</li>
                    <li>• Base de dados local + OpenFoodFacts</li>
                    <li>• Informações nutricionais completas</li>
                    <li>• Controle de quantidade preciso</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Como Usar:</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>1. Digite o nome do alimento</li>
                    <li>2. Selecione da lista</li>
                    <li>3. Ajuste a quantidade</li>
                    <li>4. Adicione à refeição</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recipes Tab */}
        <TabsContent value="recipes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <ChefHat className="h-5 w-5" />
                  Minhas Receitas
                </div>
                <Button 
                  onClick={() => setShowRecipeManager(true)}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Receita
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Crie receitas personalizadas, calcule automaticamente as informações nutricionais e use-as em seu diário alimentar.
              </p>

              {userRecipes.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <ChefHat className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">Nenhuma receita criada ainda</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Comece criando sua primeira receita personalizada
                  </p>
                  <Button onClick={() => setShowRecipeManager(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeira Receita
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {userRecipes.map((recipe) => (
                    <Card key={recipe.id} className="cursor-pointer hover:bg-muted/50">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium">{recipe.name}</h3>
                          <Badge variant="outline">{recipe.servings} porções</Badge>
                        </div>
                        {recipe.description && (
                          <p className="text-sm text-muted-foreground mb-2">{recipe.description}</p>
                        )}
                        <div className="grid grid-cols-4 gap-2 text-xs">
                          <div className="text-center">
                            <p className="font-medium">{Math.round(recipe.totalCalories / recipe.servings)}</p>
                            <p className="text-muted-foreground">cal/porção</p>
                          </div>
                          <div className="text-center">
                            <p className="font-medium">{recipe.totalCarbs ? Math.round((recipe.totalCarbs / recipe.servings) * 10) / 10 : 0}g</p>
                            <p className="text-muted-foreground">carbs</p>
                          </div>
                          <div className="text-center">
                            <p className="font-medium">{recipe.totalProtein ? Math.round((recipe.totalProtein / recipe.servings) * 10) / 10 : 0}g</p>
                            <p className="text-muted-foreground">prot</p>
                          </div>
                          <div className="text-center">
                            <p className="font-medium">{recipe.totalFat ? Math.round((recipe.totalFat / recipe.servings) * 10) / 10 : 0}g</p>
                            <p className="text-muted-foreground">gord</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Recursos das Receitas:</h4>
                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <ul className="space-y-1">
                    <li>• Cálculo automático de macros</li>
                    <li>• Múltiplos ingredientes</li>
                    <li>• Controle de porções</li>
                  </ul>
                  <ul className="space-y-1">
                    <li>• Uso no diário alimentar</li>
                    <li>• Edição e atualização</li>
                    <li>• Informações por porção</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <BarcodeScanner
        isOpen={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onBarcodeDetected={handleBarcodeDetected}
      />

      <FoodSearch
        isOpen={showFoodSearch}
        onClose={() => setShowFoodSearch(false)}
        onFoodSelected={handleFoodSelected}
      />

      <RecipeManager
        isOpen={showRecipeManager}
        onClose={() => setShowRecipeManager(false)}
        onRecipeSaved={handleRecipeSaved}
      />

      <AddToMealModal
        isOpen={showAddToMealModal}
        onClose={handleCloseAddToMealModal}
        food={selectedFood}
        onFoodAdded={handleFoodAdded}
      />
    </div>
  );
}