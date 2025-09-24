import { useState } from "react";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlanBadge } from "@/components/plan-badge";
import { UpgradeModal } from "@/components/upgrade-modal";
import { useUserProfile } from "@/hooks/use-user-profile";

interface MobileHeaderProps {
  onProfileClick?: () => void;
}

export function MobileHeader({ onProfileClick }: MobileHeaderProps) {
  const { data: userProfile } = useUserProfile();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  return (
    <>
      <header className="bg-primary text-primary-foreground p-4 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <i className="fas fa-camera-retro text-xl"></i>
            <h1 className="text-xl font-bold">MyNutrify</h1>
          </div>
          <div className="flex items-center gap-2">
            <PlanBadge 
              plan={userProfile?.plan}
              onClick={() => setShowUpgradeModal(true)}
            />
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
        </div>
      </header>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentPlan={userProfile?.plan}
      />
    </>
  );
}
