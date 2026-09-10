import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatMacros, calculateMacroProgress } from "@/lib/nutrition-calculator";

interface MacronutrientBarsProps {
  current: {
    carbs: number;
    protein: number;
    fat: number;
  };
  targets: {
    carbs: number;
    protein: number;
    fat: number;
  };
}

export function MacronutrientBars({ current, targets }: MacronutrientBarsProps) {
  const macros = [
    {
      key: 'carbs',
      name: 'Carboidratos',
      current: current.carbs,
      target: targets.carbs,
      color: 'hsl(var(--chart-1))',
      bgColor: 'bg-chart-1',
    },
    {
      key: 'protein',
      name: 'Proteínas',
      current: current.protein,
      target: targets.protein,
      color: 'hsl(var(--chart-2))',
      bgColor: 'bg-chart-2',
    },
    {
      key: 'fat',
      name: 'Gorduras',
      current: current.fat,
      target: targets.fat,
      color: 'hsl(var(--chart-3))',
      bgColor: 'bg-chart-3',
    },
  ];

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-base font-semibold mb-4">Macronutrientes</h3>
        <div className="space-y-4">
          {macros.map((macro) => {
            const progress = calculateMacroProgress(macro.current, macro.target);
            
            return (
              <div key={macro.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 ${macro.bgColor} rounded`}></div>
                    <span>{macro.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold" data-testid={`text-${macro.key}-current`}>
                      {formatMacros(macro.current)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      / {formatMacros(macro.target)}
                    </span>
                  </div>
                </div>
                <Progress 
                  value={progress} 
                  className="h-2"
                  style={{ 
                    background: 'hsl(var(--muted))',
                  }}
                  data-testid={`progress-${macro.key}`}
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
