import { 
  BarChart3, 
  Camera, 
  BookOpen, 
  Calendar,
  Coffee,
  Utensils,
  Apple,
  MapPin,
  Target
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'camera', label: 'Scan Food', icon: Camera },
    { id: 'precision', label: 'Precisão', icon: Target },
    { id: 'running', label: 'Running', icon: MapPin },
    { id: 'diary', label: 'Food Diary', icon: BookOpen },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
  ];

  return (
    <nav className="bg-card border-b border-border">
      <div className="flex justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <Button
              key={tab.id}
              variant="ghost"
              className={`flex-1 py-4 px-2 flex flex-col items-center gap-1 rounded-none border-b-2 transition-colors ${
                isActive 
                  ? 'border-primary text-primary font-medium' 
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => onTabChange(tab.id)}
              data-testid={`tab-${tab.id}`}
            >
              <Icon className="h-4 w-4" />
              <span className="text-xs">{tab.label}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}

export function getMealIcon(mealType: string) {
  switch (mealType) {
    case 'breakfast':
      return Coffee;
    case 'lunch':
      return Utensils;
    case 'dinner':
      return Utensils;
    case 'snack':
      return Apple;
    default:
      return Utensils;
  }
}
