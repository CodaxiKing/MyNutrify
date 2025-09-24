import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, X } from 'lucide-react';
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

interface FoodSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onFoodSelected: (food: Food, quantity: number) => void;
}

export function FoodSearch({ isOpen, onClose, onFoodSelected }: FoodSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Food[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [quantity, setQuantity] = useState(1);


  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query && query.trim().length >= 2) {
        searchFoods(query);
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const searchFoods = async (searchQuery: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/food/search?q=${encodeURIComponent(searchQuery)}&limit=20`);
      if (response.ok) {
        const foods = await response.json();
        setResults(foods);
      } else {
        toast({
          title: 'Erro na Busca',
          description: 'Não foi possível buscar alimentos.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error searching foods:', error);
      toast({
        title: 'Erro na Busca',
        description: 'Erro ao conectar com o servidor.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFoodSelect = (food: Food) => {
    setSelectedFood(food);
    setQuantity(1);
  };

  const handleAddFood = () => {
    if (selectedFood) {
      onFoodSelected(selectedFood, quantity);
      setSelectedFood(null);
      setQuantity(1);
      setQuery('');
      setResults([]);
      onClose();
      toast({
        title: 'Alimento Adicionado',
        description: `${selectedFood.name} foi adicionado à refeição.`,
      });
    }
  };

  const handleClose = () => {
    setSelectedFood(null);
    setQuantity(1);
    setQuery('');
    setResults([]);
    onClose();
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg mx-auto max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscar Alimentos
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Digite o nome do alimento..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
            {isLoading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              </div>
            )}
          </div>

          {/* Food Selection Modal */}
          {selectedFood && (
            <div className="border rounded-lg p-4 bg-muted/50">
              <h3 className="font-semibold mb-2">{selectedFood.name}</h3>
              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground mb-3">
                <div>Calorias: {selectedFood.caloriesPerServing}</div>
                <div>Porção: {selectedFood.servingSize}</div>
                {selectedFood.carbs !== undefined && (
                  <div>Carboidratos: {selectedFood.carbs}g</div>
                )}
                {selectedFood.protein !== undefined && (
                  <div>Proteínas: {selectedFood.protein}g</div>
                )}
                {selectedFood.fat !== undefined && (
                  <div>Gorduras: {selectedFood.fat}g</div>
                )}
              </div>
              
              <div className="flex items-center gap-2 mb-3">
                <label className="text-sm font-medium">Quantidade:</label>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(0.1, parseFloat(e.target.value) || 1))}
                  step="0.1"
                  min="0.1"
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">porções</span>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleAddFood} className="flex-1">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar à Refeição
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedFood(null)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* Search Results */}
          {!selectedFood && (
            <div className="flex-1 overflow-y-auto">
              {query.length > 0 && query.length < 2 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Digite pelo menos 2 caracteres para buscar
                </p>
              )}

              {query.length >= 2 && results.length === 0 && !isLoading && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum alimento encontrado
                </p>
              )}

              <div className="space-y-2">
                {results.map((food) => (
                  <Card 
                    key={food.id} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleFoodSelect(food)}
                  >
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-medium text-sm">{food.name}</h3>
                        {food.source && (
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${getSourceBadgeColor(food.source)}`}
                          >
                            {getSourceLabel(food.source)}
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                        <div>{food.caloriesPerServing} cal</div>
                        <div>{food.servingSize}</div>
                        {food.carbs !== undefined && (
                          <div>C: {food.carbs}g</div>
                        )}
                        {food.protein !== undefined && (
                          <div>P: {food.protein}g</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Close Button */}
        {!selectedFood && (
          <Button variant="outline" onClick={handleClose} className="w-full">
            <X className="h-4 w-4 mr-2" />
            Fechar
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}