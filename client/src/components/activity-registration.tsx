import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Dumbbell, Timer, Zap } from "lucide-react";
import { useExercises, useSearchExercises, useAddActivity } from "@/hooks/use-nutrition-data";
import { useToast } from "@/hooks/use-toast";
import { Exercise } from "@/types/nutrition";

interface ActivityRegistrationProps {
  onActivityAdded?: () => void;
}

export function ActivityRegistration({ onActivityAdded }: ActivityRegistrationProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [duration, setDuration] = useState("");
  const [intensity, setIntensity] = useState<'light' | 'moderate' | 'vigorous'>('moderate');
  const [customExerciseName, setCustomExerciseName] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const { data: allExercises = [] } = useExercises();
  const { data: searchResults = [] } = useSearchExercises(searchQuery, selectedCategory);
  const addActivity = useAddActivity();

  const categories = [
    { value: "all", label: "Todas as categorias" },
    { value: "cardio", label: "Cardio" },
    { value: "strength", label: "Musculação" },
    { value: "sports", label: "Esportes" },
    { value: "flexibility", label: "Flexibilidade" },
  ];

  const intensityOptions = [
    { value: 'light', label: 'Leve', color: 'text-green-600' },
    { value: 'moderate', label: 'Moderada', color: 'text-yellow-600' },
    { value: 'vigorous', label: 'Intensa', color: 'text-red-600' },
  ];

  const displayExercises = searchQuery.length > 0 ? searchResults : 
    selectedCategory && selectedCategory !== "all" ? allExercises.filter(ex => ex.category === selectedCategory) : 
    allExercises.slice(0, 8); // Show top 8 popular exercises

  const handleExerciseSelect = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setCustomExerciseName("");
    setShowSearch(false);
  };

  const handleRegisterActivity = async () => {
    if (!selectedExercise && !customExerciseName.trim()) {
      toast({
        title: "Exercício obrigatório",
        description: "Selecione um exercício ou digite um exercício personalizado.",
        variant: "destructive",
      });
      return;
    }

    if (!duration || parseInt(duration) <= 0) {
      toast({
        title: "Duração obrigatória",
        description: "Digite uma duração válida em minutos.",
        variant: "destructive",
      });
      return;
    }

    try {
      await addActivity.mutateAsync({
        exerciseId: selectedExercise?.id,
        customExerciseName: customExerciseName.trim() || undefined,
        duration: parseInt(duration),
        intensity,
        metValue: selectedExercise?.metValue,
      });

      toast({
        title: "Atividade registrada!",
        description: `${selectedExercise?.name || customExerciseName} foi adicionada ao seu diário.`,
      });

      // Reset form
      setSelectedExercise(null);
      setCustomExerciseName("");
      setDuration("");
      setIntensity('moderate');
      setSearchQuery("");
      setSelectedCategory("all");
      setShowSearch(false);
      
      onActivityAdded?.();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao registrar atividade. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Dumbbell className="h-5 w-5" />
          Registrar Atividade Física
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Exercise Selection */}
        {!selectedExercise && !customExerciseName && (
          <div className="space-y-3">
            {!showSearch ? (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setShowSearch(true)}
              >
                <Search className="h-4 w-4 mr-2" />
                Buscar Exercício
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: corrida, musculação..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1"
                  />
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {showSearch && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {displayExercises.map((exercise) => (
                  <Button
                    key={exercise.id}
                    variant="ghost"
                    className="w-full justify-start h-auto p-3"
                    onClick={() => handleExerciseSelect(exercise)}
                  >
                    <div className="text-left">
                      <div className="font-medium">{exercise.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {exercise.description} • MET: {exercise.metValue}
                      </div>
                    </div>
                  </Button>
                ))}
                
                {showSearch && displayExercises.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    <p>Nenhum exercício encontrado</p>
                    <Button 
                      variant="link" 
                      className="mt-2"
                      onClick={() => setCustomExerciseName(searchQuery)}
                    >
                      Criar exercício personalizado: "{searchQuery}"
                    </Button>
                  </div>
                )}
              </div>
            )}

            {showSearch && (
              <div className="space-y-2">
                <Label>Ou digite um exercício personalizado:</Label>
                <Input
                  placeholder="Ex: Caminhada no parque"
                  value={customExerciseName}
                  onChange={(e) => setCustomExerciseName(e.target.value)}
                />
              </div>
            )}
          </div>
        )}

        {/* Selected Exercise Display */}
        {(selectedExercise || customExerciseName) && (
          <div className="bg-muted p-3 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium">
                  {selectedExercise?.name || customExerciseName}
                </div>
                {selectedExercise && (
                  <div className="text-sm text-muted-foreground">
                    {selectedExercise.description} • MET: {selectedExercise.metValue}
                  </div>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setSelectedExercise(null);
                  setCustomExerciseName("");
                  setShowSearch(false);
                }}
              >
                Alterar
              </Button>
            </div>
          </div>
        )}

        {/* Duration Input */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Timer className="h-4 w-4" />
            Duração (minutos)
          </Label>
          <Input
            type="number"
            placeholder="30"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            min="1"
            max="1440"
          />
        </div>

        {/* Intensity Selection */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Intensidade
          </Label>
          <Select value={intensity} onValueChange={(value: 'light' | 'moderate' | 'vigorous') => setIntensity(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {intensityOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <span className={option.color}>{option.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Register Button */}
        <Button 
          className="w-full"
          onClick={handleRegisterActivity}
          disabled={addActivity.isPending || (!selectedExercise && !customExerciseName)}
        >
          {addActivity.isPending ? "Registrando..." : "Registrar Atividade"}
        </Button>
      </CardContent>
    </Card>
  );
}