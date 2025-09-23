import { Card, CardContent } from "@/components/ui/card";
import { formatCalories } from "@/lib/nutrition-calculator";

interface DailyProgressProps {
  consumed: number;
  goal: number;
  remaining?: number;
}

export function DailyProgress({ consumed, goal, remaining }: DailyProgressProps) {
  const progressPercentage = Math.min(100, (consumed / goal) * 100);
  const actualRemaining = remaining ?? Math.max(0, goal - consumed);
  
  // Calculate stroke-dasharray for the progress ring
  const circumference = 2 * Math.PI * 15.9155; // radius from SVG
  const strokeDasharray = `${(progressPercentage / 100) * circumference}, ${circumference}`;

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold mb-4">Today's Progress</h2>
        <div className="flex items-center justify-center mb-4">
          <div className="relative w-32 h-32">
            <svg className="w-32 h-32" viewBox="0 0 36 36">
              <path 
                className="text-muted stroke-current"
                strokeWidth="3"
                fill="none"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path 
                className="text-primary stroke-current transition-all duration-500 ease-in-out"
                strokeWidth="3"
                strokeDasharray={strokeDasharray}
                strokeLinecap="round"
                fill="none"
                style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary" data-testid="text-consumed-calories">
                  {formatCalories(consumed)}
                </div>
                <div className="text-xs text-muted-foreground">
                  of {formatCalories(goal)}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-sm text-muted-foreground">Remaining</div>
            <div className="font-semibold text-accent" data-testid="text-remaining-calories">
              {formatCalories(actualRemaining)}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Consumed</div>
            <div className="font-semibold" data-testid="text-total-consumed">
              {formatCalories(consumed)}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Goal</div>
            <div className="font-semibold" data-testid="text-daily-goal">
              {formatCalories(goal)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
