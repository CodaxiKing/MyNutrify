import { 
  Home, 
  Utensils, 
  BookOpen, 
  Activity,
  Coffee,
  Apple,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'food', label: 'Alimentos', icon: Utensils },
    { id: 'diary', label: 'Diário', icon: BookOpen },
    { id: 'activities', label: 'Atividades', icon: Activity },
  ];

  return (
    <nav className="bg-gradient-to-r from-card via-card to-card shadow-md border-t border-border fixed bottom-0 left-0 right-0 z-50">
      <div className="flex justify-around items-center px-4 py-2 bg-card/95 backdrop-blur-sm">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <Button
              key={tab.id}
              variant="ghost"
              className={`flex-1 py-3 px-4 flex flex-col items-center gap-1.5 rounded-lg transition-all duration-200 ${
                isActive 
                  ? 'bg-primary/10 text-primary font-semibold scale-105 shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
              onClick={() => onTabChange(tab.id)}
              data-testid={`tab-${tab.id}`}
            >
              <Icon className={`${isActive ? 'h-6 w-6' : 'h-5 w-5'} transition-all`} />
              <span className={`text-xs ${isActive ? 'font-medium' : ''}`}>{tab.label}</span>
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
