import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Plus, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

import type { Food } from "@/types/nutrition";
import { apiFetch } from "@/lib/api-url";

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
    const controller = new AbortController();
    const term = query.trim();
    setResults([]);
    setIsLoading(isOpen && term.length >= 2);
    const timeoutId = setTimeout(() => {
      if (isOpen && term.length >= 2) void searchFoods(term, controller.signal);
    }, 300);

    return () => { clearTimeout(timeoutId); controller.abort(); };
  }, [query, isOpen]);

  const searchFoods = async (searchQuery: string, signal: AbortSignal) => {
    setIsLoading(true);
    try {
      const response = await apiFetch(`/api/food/search?q=${encodeURIComponent(searchQuery)}&limit=20`, { signal });
      if (response.ok) {
        const foods = await response.json();
        if (!signal.aborted) setResults(foods);
      } else {
        toast({
          title: 'Erro na Busca',
          description: 'Não foi possível buscar alimentos.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      if (signal.aborted) return;
      console.error('Error searching foods:', error);
      toast({
        title: 'Erro na Busca',
        description: 'Erro ao conectar com o servidor.',
        variant: 'destructive',
      });
    } finally {
      if (!signal.aborted) setIsLoading(false);
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
    }
  };

  const handleClose = () => {
    setSelectedFood(null);
    setQuantity(1);
    setQuery('');
    setResults([]);
    onClose();
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
              placeholder="Ex.: arroz cozido, feijão, frango..."
              aria-label="Pesquisar alimento em português"
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

          {!selectedFood && !query && <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Pesquise em português, com ou sem acentos.</p>
            <div className="flex flex-wrap gap-2">
              {["Arroz cozido", "Feijão carioca", "Peito de frango", "Pão francês", "Banana"].map(food => (
                <Button key={food} variant="outline" size="sm" onClick={() => setQuery(food)}>{food}</Button>
              ))}
            </div>
          </div>}

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
                  Nenhum alimento encontrado. Tente um nome mais simples, como “arroz” ou “frango”.
                </p>
              )}

              <div className="space-y-2">
                {results.map((food) => (
                  <Card 
                    key={food.id} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleFoodSelect(food)}
                  >
                    {/* De onde o dado vem (TACO, OpenFoodFacts, USDA) e detalhe
                        de implementacao: so polui a escolha de quem esta
                        registrando o que comeu. */}
                    <CardContent className="p-3">
                      <h3 className="text-sm font-medium capitalize">{food.name}</h3>

                      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">
                          {Math.round(food.caloriesPerServing)} kcal
                        </span>
                        <span>{food.servingSize}</span>

                        {food.protein != null && <span>P {Math.round(food.protein)}g</span>}
                        {food.carbs != null && <span>C {Math.round(food.carbs)}g</span>}
                        {food.fat != null && <span>G {Math.round(food.fat)}g</span>}
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
