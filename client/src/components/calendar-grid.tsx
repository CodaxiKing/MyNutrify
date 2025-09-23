import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";
import { CalendarDay } from "@/types/nutrition";

interface CalendarGridProps {
  data?: CalendarDay[];
  onDateSelect?: (date: Date) => void;
  selectedDate?: Date;
}

export function CalendarGrid({ data = [], onDateSelect, selectedDate }: CalendarGridProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { monthName, year, calendarDays } = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long' });
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday
    
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Generate 42 days (6 weeks)
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dayData = data.find(d => 
        d.date.toDateString() === date.toDateString()
      );
      
      const isCurrentMonth = date.getMonth() === month;
      const isToday = date.toDateString() === today.toDateString();
      const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
      
      days.push({
        date: new Date(date),
        dayNumber: date.getDate(),
        isCurrentMonth,
        isToday,
        isSelected,
        calories: dayData?.calories,
        status: dayData?.status || 'none',
      });
    }
    
    return { monthName, year, calendarDays: days };
  }, [currentMonth, data, selectedDate]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'under': return 'bg-chart-1';
      case 'target': return 'bg-chart-2';
      case 'over': return 'bg-chart-3';
      default: return 'bg-muted';
    }
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Card>
      <CardContent className="p-4">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('prev')}
            data-testid="button-prev-month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold" data-testid="text-current-month">
            {monthName} {year}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('next')}
            data-testid="button-next-month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Week Header */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {weekDays.map(day => (
            <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => (
            <Button
              key={index}
              variant="ghost"
              className={`
                aspect-square p-1 h-auto flex flex-col items-center justify-center relative
                ${!day.isCurrentMonth ? 'text-muted-foreground' : ''}
                ${day.isToday ? 'bg-primary text-primary-foreground font-semibold' : ''}
                ${day.isSelected ? 'ring-2 ring-primary' : ''}
                hover:bg-muted
              `}
              onClick={() => onDateSelect?.(day.date)}
              data-testid={`button-calendar-day-${day.dayNumber}`}
            >
              <span className="text-sm">{day.dayNumber}</span>
              {day.status !== 'none' && (
                <div className={`w-1 h-1 rounded-full mt-1 ${getStatusColor(day.status)}`} />
              )}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
