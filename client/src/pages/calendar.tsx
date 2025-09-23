import { useState } from "react";
import { CalendarGrid } from "@/components/calendar-grid";
import { Card, CardContent } from "@/components/ui/card";
import { useWeeklySummary } from "@/hooks/use-nutrition-data";
import { useUserProfile } from "@/hooks/use-user-profile";
import { CalendarDay } from "@/types/nutrition";
import { formatCalories } from "@/lib/nutrition-calculator";

export default function Calendar() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { data: weeklySummary = [] } = useWeeklySummary();
  const { data: profile } = useUserProfile();

  // Convert weekly summary to calendar format
  const calendarData: CalendarDay[] = weeklySummary.map(summary => {
    const calories = summary.totalCalories || 0;
    const goal = profile?.dailyCalorieGoal || 2000;
    
    let status: CalendarDay['status'] = 'none';
    if (calories > 0) {
      const percentage = calories / goal;
      if (percentage < 0.8) {
        status = 'under';
      } else if (percentage <= 1.2) {
        status = 'target';
      } else {
        status = 'over';
      }
    }

    return {
      date: new Date(summary.date),
      calories,
      status,
    };
  });

  // Find selected day data
  const selectedDayData = weeklySummary.find(s => 
    new Date(s.date).toDateString() === selectedDate.toDateString()
  );

  const goalPercentage = selectedDayData && profile?.dailyCalorieGoal
    ? Math.round((selectedDayData.totalCalories / profile.dailyCalorieGoal) * 100)
    : 0;

  return (
    <div className="p-4 space-y-4 pb-20">
      {/* Calendar Grid */}
      <CalendarGrid 
        data={calendarData}
        onDateSelect={setSelectedDate}
        selectedDate={selectedDate}
      />

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3">Legend</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-chart-1 rounded-full"></div>
              <span>Under goal</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-chart-2 rounded-full"></div>
              <span>On target</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-chart-3 rounded-full"></div>
              <span>Over goal</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-muted rounded-full"></div>
              <span>No data</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Day Details */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3" data-testid="text-selected-date">
            {selectedDate.toLocaleDateString('en-US', { 
              weekday: 'long',
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h3>
          
          {selectedDayData ? (
            <>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary" data-testid="text-selected-day-calories">
                    {formatCalories(selectedDayData.totalCalories)}
                  </div>
                  <div className="text-sm text-muted-foreground">Calories consumed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold" data-testid="text-selected-day-percentage">
                    {goalPercentage}%
                  </div>
                  <div className="text-sm text-muted-foreground">of daily goal</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Carbs</span>
                  <span className="font-medium" data-testid="text-selected-day-carbs">
                    {Math.round(selectedDayData.totalCarbs)}g
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Protein</span>
                  <span className="font-medium" data-testid="text-selected-day-protein">
                    {Math.round(selectedDayData.totalProtein)}g
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Fat</span>
                  <span className="font-medium" data-testid="text-selected-day-fat">
                    {Math.round(selectedDayData.totalFat)}g
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Meals Logged</span>
                  <span className="font-medium" data-testid="text-selected-day-meals">
                    {selectedDayData.mealCount} meals
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No data available for this date</p>
              <p className="text-sm mt-1">Start logging meals to see your progress!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
