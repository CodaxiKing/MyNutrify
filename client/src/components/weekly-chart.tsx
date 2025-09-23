import { Card, CardContent } from "@/components/ui/card";
import { useMemo } from "react";
import { formatCalories } from "@/lib/nutrition-calculator";

interface WeeklyChartProps {
  data?: Array<{
    date: Date;
    totalCalories: number;
  }>;
}

export function WeeklyChart({ data = [] }: WeeklyChartProps) {
  const chartData = useMemo(() => {
    const today = new Date();
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekData = [];
    
    // Generate the last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const dayData = data.find(d => 
        new Date(d.date).toDateString() === date.toDateString()
      );
      
      weekData.push({
        day: daysOfWeek[date.getDay()],
        calories: dayData?.totalCalories || 0,
        isToday: date.toDateString() === today.toDateString(),
        date: date,
      });
    }
    
    return weekData;
  }, [data]);

  const maxCalories = Math.max(...chartData.map(d => d.calories), 2000);
  const averageCalories = chartData.reduce((sum, d) => sum + d.calories, 0) / chartData.length;

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-4">This Week</h3>
        <div className="flex items-end justify-between h-32 space-x-2 mb-4">
          {chartData.map((day, index) => {
            const height = maxCalories > 0 ? (day.calories / maxCalories) * 100 : 0;
            const isToday = day.isToday;
            
            return (
              <div key={day.day + index} className="flex-1 flex flex-col items-center">
                <div 
                  className={`w-full rounded-t transition-all duration-300 ${
                    isToday ? 'bg-accent' : 'bg-primary'
                  } mb-2`}
                  style={{ height: `${Math.max(5, height)}%` }}
                  title={`${day.day}: ${formatCalories(day.calories)} cal`}
                  data-testid={`bar-${day.day.toLowerCase()}`}
                />
                <span className={`text-xs ${
                  isToday ? 'text-primary font-medium' : 'text-muted-foreground'
                }`}>
                  {day.day}
                </span>
              </div>
            );
          })}
        </div>
        
        <div className="text-center">
          <span className="text-sm text-muted-foreground">Average: </span>
          <span className="font-semibold" data-testid="text-weekly-average">
            {formatCalories(averageCalories)} cal
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
