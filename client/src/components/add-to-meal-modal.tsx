import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Food {
  id: string;
  name: string;
  caloriesPerServing: number;
  servingSize: string;
  carbs?: number | null;
  protein?: number | null;
  fat?: number | null;
  source?: string | null;
  createdAt?: Date | null;
  imageUrl?: string | null;
  confidence?: number | null;
  barcode?: string | null;
}

interface AddToMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  food: Food | null;
  onFoodAdded: () => void;
}

export function AddToMealModal({ isOpen, onClose, food, onFoodAdded }: AddToMealModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [mealType, setMealType] = useState('breakfast');
  const [isLoading, setIsLoading] = useState(false);

  const handleAddToMeal = async () => {
    if (!food) return;

    setIsLoading(true);
    try {
      const totalCalories = Math.round(food.caloriesPerServing * quantity);
      const totalCarbs = Math.round((food.carbs || 0) * quantity * 10) / 10;
      const totalProtein = Math.round((food.protein || 0) * quantity * 10) / 10;
      const totalFat = Math.round((food.fat || 0) * quantity * 10) / 10;

      const mealData = {
        mealType,
        date: new Date().toISOString(),
        quantity,
        totalCalories,
        totalCarbs,
        totalProtein,
        totalFat,
        foodId: food.id,
      };

      const response = await fetch('/api/meals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mealData),
      });

      if (response.ok) {
        toast({
          title: 'Alimento Adicionado!',
          description: `${food.name} foi adicionado ao seu ${getMealTypeName(mealType)}.`,
        });
        onFoodAdded();
        handleClose();
      } else {
        throw new Error('Failed to add food to meal');
      }
    } catch (error) {
      console.error('Error adding food to meal:', error);
      toast({
        title: 'Erro ao Adicionar',
        description: 'Não foi possível adicionar o alimento à refeição.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setQuantity(1);
    setMealType('breakfast');
    onClose();
  };

  const getMealTypeName = (type: string) => {
    switch (type) {
      case 'breakfast':
        return 'café da manhã';
      case 'lunch':
        return 'almoço';
      case 'dinner':
        return 'jantar';
      case 'snack':
        return 'lanche';
      default:
        return 'refeição';
    }
  };

  const getSourceBadgeColor = (source: string) => {
    switch (source) {
      case 'openfoodfacts':
        return 'bg-green-100 text-green-800';
      case 'ai':
        return 'bg-blue-100 text-blue-800';
      case 'manual':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'openfoodfacts':
        return 'OpenFoodFacts';
      case 'ai':
        return 'IA';
      case 'manual':
        return 'Manual';
      default:
        return 'Banco de Dados';
    }
  };

  if (!food) return null;

  const totalCalories = Math.round(food.caloriesPerServing * quantity);
  const totalCarbs = Math.round((food.carbs || 0) * quantity * 10) / 10;
  const totalProtein = Math.round((food.protein || 0) * quantity * 10) / 10;
  const totalFat = Math.round((food.fat || 0) * quantity * 10) / 10;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Adicionar à Refeição
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Food Information */}
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-lg">{food.name}</h3>
                {food.source && (
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${getSourceBadgeColor(food.source)}`}
                  >
                    {getSourceLabel(food.source)}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground mb-4">
                <div><strong>Porção:</strong> {food.servingSize}</div>
                <div><strong>Calorias:</strong> {food.caloriesPerServing} cal</div>
                {food.carbs !== undefined && (
                  <div><strong>Carboidratos:</strong> {food.carbs}g</div>
                )}
                {food.protein !== undefined && (
                  <div><strong>Proteínas:</strong> {food.protein}g</div>
                )}
                {food.fat !== undefined && (
                  <div><strong>Gorduras:</strong> {food.fat}g</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Meal Configuration */}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Tipo de Refeição</label>
              <Select value={mealType} onValueChange={setMealType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="breakfast">☕ Café da Manhã</SelectItem>
                  <SelectItem value="lunch">🍽️ Almoço</SelectItem>
                  <SelectItem value="dinner">🌙 Jantar</SelectItem>
                  <SelectItem value="snack">🍪 Lanche</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Quantidade (porções)</label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(0.1, parseFloat(e.target.value) || 1))}
                step="0.1"
                min="0.1"
                className="w-full"
              />
            </div>
          </div>

          {/* Calculated Totals */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <h4 className="font-medium mb-2">Total da Sua Porção:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span>Calorias:</span>
                  <Badge variant="secondary">{totalCalories} cal</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Quantidade:</span>
                  <span>{quantity} porções</span>
                </div>
                {food.carbs !== undefined && (
                  <div className="flex justify-between">
                    <span>Carboidratos:</span>
                    <span>{totalCarbs}g</span>
                  </div>
                )}
                {food.protein !== undefined && (
                  <div className="flex justify-between">
                    <span>Proteínas:</span>
                    <span>{totalProtein}g</span>
                  </div>
                )}
                {food.fat !== undefined && (
                  <div className="flex justify-between">
                    <span>Gorduras:</span>
                    <span>{totalFat}g</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              onClick={handleAddToMeal} 
              disabled={isLoading}
              className="flex-1"
            >
              <Plus className="h-4 w-4 mr-2" />
              {isLoading ? 'Adicionando...' : `Adicionar ao ${getMealTypeName(mealType)}`}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleClose}
              disabled={isLoading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}