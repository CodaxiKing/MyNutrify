import { User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileHeaderProps {
  onProfileClick?: () => void;
}

export function MobileHeader({ onProfileClick }: MobileHeaderProps) {
  return (
    <header className="bg-primary text-primary-foreground p-4 sticky top-0 z-40">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <i className="fas fa-camera-retro text-xl"></i>
          <h1 className="text-xl font-bold">CalorieSnap</h1>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="p-2 rounded-full hover:bg-primary/80 text-primary-foreground"
          onClick={onProfileClick}
          data-testid="button-profile"
        >
          <User className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
