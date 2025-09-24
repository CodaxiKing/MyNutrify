import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";

// Components
import { MobileHeader } from "@/components/mobile-header";
import { TabNavigation } from "@/components/tab-navigation";

// Pages
import Dashboard from "@/pages/dashboard";
import CameraPage from "@/pages/camera";
import RunningPage from "@/pages/running";
import Diary from "@/pages/diary";
import CalendarPage from "@/pages/calendar";
import ProfileSetup from "@/pages/profile-setup";
import Precision from "@/pages/precision";

// Hooks
import { useUserProfile } from "@/hooks/use-user-profile";

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const { data: profile, isLoading } = useUserProfile();

  // Check if profile is complete
  const isProfileComplete = profile && profile.height && profile.weight && profile.age && profile.gender && profile.fitnessGoal;

  const handleProfileComplete = () => {
    setShowProfileSetup(false);
  };

  const handleQuickCapture = () => {
    setActiveTab('camera');
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'camera':
        return <CameraPage />;
      case 'precision':
        return <Precision />;
      case 'running':
        return <RunningPage />;
      case 'diary':
        return <Diary />;
      case 'calendar':
        return <CalendarPage />;
      default:
        return <Dashboard />;
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="mobile-container max-w-md mx-auto bg-background min-h-screen shadow-2xl flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show profile setup if incomplete
  if (showProfileSetup || !isProfileComplete) {
    return (
      <ProfileSetup 
        onComplete={handleProfileComplete}
        existingProfile={profile}
      />
    );
  }

  return (
    <div className="mobile-container max-w-md mx-auto bg-background min-h-screen shadow-2xl relative">
      <MobileHeader onProfileClick={() => setShowProfileSetup(true)} />
      
      <TabNavigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
      />
      
      <main className="min-h-screen">
        {renderActiveTab()}
      </main>

      {/* Floating Action Button */}
      <Button
        size="lg"
        className="fixed bottom-4 right-4 w-14 h-14 rounded-full shadow-lg z-50 bg-accent hover:bg-accent/90"
        onClick={handleQuickCapture}
        data-testid="button-quick-capture"
      >
        <Camera className="h-6 w-6" />
      </Button>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
