import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChefHat, Plus, Trash2, Save, X, Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { FoodSearch } from './food-search';

interface Food {
  id: string;
  name: string;
  caloriesPerServing: number;
  servingSize: string;
  carbs?: number;
  protein?: number;
  fat?: number;
}

interface RecipeIngredient {
  id?: string;
  food: Food;
  quantity: number;
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
  ingredients: RecipeIngredient[];
}

interface RecipeManagerProps {
  isOpen: boolean;
  onClose: () => void;
  recipe?: Recipe | null;
  onRecipeSaved: (recipe: Recipe) => void;
}

export function RecipeManager({ isOpen, onClose, recipe, onRecipeSaved }: RecipeManagerProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [servings, setServings] = useState(1);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [showFoodSearch, setShowFoodSearch] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load recipe data when editing
  useEffect(() => {
    if (recipe) {
      setName(recipe.name);
      setDescription(recipe.description || '');
      setServings(recipe.servings);
      setIngredients(recipe.ingredients || []);
    } else {
      // Reset form for new recipe
      setName('');
      setDescription('');
      setServings(1);
      setIngredients([]);
    }
  }, [recipe, isOpen]);

  // Calculate nutritional totals
  const calculateTotals = () => {
    const totals = ingredients.reduce(
      (acc, ingredient) => {
        const multiplier = ingredient.quantity;
        acc.calories += (ingredient.food.caloriesPerServing || 0) * multiplier;
        acc.carbs += (ingredient.food.carbs || 0) * multiplier;
        acc.protein += (ingredient.food.protein || 0) * multiplier;
        acc.fat += (ingredient.food.fat || 0) * multiplier;
        return acc;
      },
      { calories: 0, carbs: 0, protein: 0, fat: 0 }
    );

    return {
      totalCalories: Math.round(totals.calories),
      totalCarbs: Math.round(totals.carbs * 10) / 10,
      totalProtein: Math.round(totals.protein * 10) / 10,
      totalFat: Math.round(totals.fat * 10) / 10,
    };
  };

  const handleAddIngredient = (food: Food, quantity: number) => {
    const newIngredient: RecipeIngredient = {
      food,
      quantity,
    };
    setIngredients([...ingredients, newIngredient]);
  };

  const handleUpdateIngredientQuantity = (index: number, quantity: number) => {
    const updatedIngredients = [...ingredients];
    updatedIngredients[index].quantity = quantity;
    setIngredients(updatedIngredients);
  };

  const handleRemoveIngredient = (index: number) => {
    const updatedIngredients = ingredients.filter((_, i) => i !== index);
    setIngredients(updatedIngredients);
  };

  const handleSaveRecipe = async () => {
    if (!name.trim()) {
      toast({
        title: 'Nome Obrigatório',
        description: 'Por favor, digite um nome para a receita.',
        variant: 'destructive',
      });
      return;
    }

    if (ingredients.length === 0) {
      toast({
        title: 'Ingredientes Obrigatórios',
        description: 'Adicione pelo menos um ingrediente à receita.',
        variant: 'destructive',
      });
      return;
    }

    const totals = calculateTotals();
    setIsLoading(true);

    try {
      const recipeData = {
        name: name.trim(),
        description: description.trim(),
        servings,
        ...totals,
      };

      const url = recipe?.id ? `/api/recipes/${recipe.id}` : '/api/recipes';
      const method = recipe?.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(recipeData),
      });

      if (response.ok) {
        const savedRecipe = await response.json();
        
        // Save ingredients if it's a new recipe
        if (!recipe?.id) {
          for (const ingredient of ingredients) {
            await fetch(`/api/recipes/${savedRecipe.id}/ingredients`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                foodId: ingredient.food.id,
                quantity: ingredient.quantity,
              }),
            });
          }
        }

        const fullRecipe: Recipe = {
          ...savedRecipe,
          ingredients,
        };

        onRecipeSaved(fullRecipe);
        toast({
          title: 'Receita Salva',
          description: `${recipe?.id ? 'Receita atualizada' : 'Nova receita criada'} com sucesso!`,
        });
        handleClose();
      } else {
        throw new Error('Failed to save recipe');
      }
    } catch (error) {
      console.error('Error saving recipe:', error);
      toast({
        title: 'Erro ao Salvar',
        description: 'Não foi possível salvar a receita.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setServings(1);
    setIngredients([]);
    onClose();
  };

  const totals = calculateTotals();
  const caloriesPerServing = servings > 0 ? Math.round(totals.totalCalories / servings) : 0;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl mx-auto max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5" />
              {recipe?.id ? 'Editar Receita' : 'Nova Receita'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 flex-1 overflow-y-auto">
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Nome da Receita</label>
                <Input
                  type="text"
                  placeholder="Ex: Lasanha de Frango"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Descrição (opcional)</label>
                <Textarea
                  placeholder="Descreva sua receita..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Quantas porções esta receita rende?</label>
                <Input
                  type="number"
                  value={servings}
                  onChange={(e) => setServings(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  className="w-32"
                />
              </div>
            </div>

            {/* Ingredients Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Ingredientes</h3>
                <Button
                  size="sm"
                  onClick={() => setShowFoodSearch(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Ingrediente
                </Button>
              </div>

              {ingredients.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">
                      Nenhum ingrediente adicionado ainda.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => setShowFoodSearch(true)}
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Buscar Ingredientes
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {ingredients.map((ingredient, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{ingredient.food.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {ingredient.food.caloriesPerServing} cal por {ingredient.food.servingSize}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={ingredient.quantity}
                              onChange={(e) => handleUpdateIngredientQuantity(
                                index, 
                                Math.max(0.1, parseFloat(e.target.value) || 1)
                              )}
                              step="0.1"
                              min="0.1"
                              className="w-20"
                            />
                            <span className="text-sm text-muted-foreground">porções</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRemoveIngredient(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Nutritional Summary */}
            {ingredients.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informações Nutricionais</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total da Receita</p>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>Calorias:</span>
                          <Badge variant="secondary">{totals.totalCalories}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Carboidratos:</span>
                          <span>{totals.totalCarbs}g</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Proteínas:</span>
                          <span>{totals.totalProtein}g</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Gorduras:</span>
                          <span>{totals.totalFat}g</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground">Por Porção ({servings} porções)</p>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>Calorias:</span>
                          <Badge>{caloriesPerServing}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Carboidratos:</span>
                          <span>{Math.round((totals.totalCarbs / servings) * 10) / 10}g</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Proteínas:</span>
                          <span>{Math.round((totals.totalProtein / servings) * 10) / 10}g</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Gorduras:</span>
                          <span>{Math.round((totals.totalFat / servings) * 10) / 10}g</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t">
            <Button 
              onClick={handleSaveRecipe} 
              disabled={isLoading || !name.trim() || ingredients.length === 0}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Salvando...' : (recipe?.id ? 'Atualizar Receita' : 'Salvar Receita')}
            </Button>
            <Button variant="outline" onClick={handleClose}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Food Search Dialog */}
      <FoodSearch
        isOpen={showFoodSearch}
        onClose={() => setShowFoodSearch(false)}
        onFoodSelected={handleAddIngredient}
      />
    </>
  );
}