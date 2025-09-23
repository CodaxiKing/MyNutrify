import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Timer, Flame, Trash2 } from "lucide-react";
import { ActivityEntry } from "@/types/nutrition";
import { formatCalories } from "@/lib/nutrition-calculator";

interface ActivityCardProps {
  activityEntry: ActivityEntry;
  onDelete?: (activityId: string) => void;
}

export function ActivityCard({ activityEntry, onDelete }: ActivityCardProps) {
  const intensityColors = {
    light: 'bg-green-100 text-green-800 border-green-200',
    moderate: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
    vigorous: 'bg-red-100 text-red-800 border-red-200',
  };

  const exerciseName = activityEntry.exercise?.name || 
                      activityEntry.customExerciseName || 
                      'Exercício';

  const timeAgo = new Date().getTime() - new Date(activityEntry.date).getTime();
  const hoursAgo = Math.floor(timeAgo / (1000 * 60 * 60));
  const minutesAgo = Math.floor(timeAgo / (1000 * 60));

  const timeDisplay = hoursAgo > 0 ? `${hoursAgo}h atrás` : `${minutesAgo}min atrás`;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-medium">{exerciseName}</h4>
              <Badge 
                variant="outline" 
                className={`text-xs ${intensityColors[activityEntry.intensity]}`}
              >
                {activityEntry.intensity === 'light' ? 'Leve' : 
                 activityEntry.intensity === 'moderate' ? 'Moderada' : 'Intensa'}
              </Badge>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Timer className="h-3 w-3" />
                <span>{activityEntry.duration} min</span>
              </div>
              <div className="flex items-center gap-1">
                <Flame className="h-3 w-3" />
                <span>{formatCalories(activityEntry.caloriesBurned)} cal</span>
              </div>
              <span>{timeDisplay}</span>
            </div>

            {activityEntry.notes && (
              <p className="text-sm text-muted-foreground mt-2">
                {activityEntry.notes}
              </p>
            )}
          </div>

          {onDelete && activityEntry.id && (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={() => onDelete(activityEntry.id!)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}