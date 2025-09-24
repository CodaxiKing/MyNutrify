import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useUpdateUserProfile } from "@/hooks/use-user-profile";
import { calculateBMR, calculateDailyCalorieGoal, calculateMacroTargets } from "@/lib/nutrition-calculator";
import { UserProfile } from "@/types/nutrition";
import { TrendingDown, Target, TrendingUp, Activity, Zap } from "lucide-react";

const profileSchema = z.object({
  height: z.number().min(100, "Height must be at least 100cm").max(250, "Height must be less than 250cm"),
  weight: z.number().min(30, "Weight must be at least 30kg").max(300, "Weight must be less than 300kg"),
  age: z.number().min(13, "Age must be at least 13").max(120, "Age must be less than 120"),
  gender: z.enum(['male', 'female'], { required_error: "Please select your gender" }),
  fitnessGoal: z.enum(['lose', 'maintain', 'gain'], { required_error: "Please select your fitness goal" }),
});

type ProfileForm = z.infer<typeof profileSchema>;

interface ProfileSetupProps {
  onComplete: (profile: UserProfile) => void;
  existingProfile?: Partial<UserProfile>;
}

export default function ProfileSetup({ onComplete, existingProfile }: ProfileSetupProps) {
  const { toast } = useToast();
  const updateProfile = useUpdateUserProfile();
  
  const [calculatedValues, setCalculatedValues] = useState({
    bmr: 0,
    dailyGoal: 0,
    macroTargets: { protein: 0, carbs: 0, fat: 0 }
  });

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      height: existingProfile?.height || undefined,
      weight: existingProfile?.weight || undefined,
      age: existingProfile?.age || undefined,
      gender: existingProfile?.gender || undefined,
      fitnessGoal: existingProfile?.fitnessGoal || undefined,
    },
  });

  const watchedValues = form.watch();

  // Calculate values whenever form changes
  useEffect(() => {
    const { height, weight, age, gender, fitnessGoal } = watchedValues;
    
    if (height && weight && age && gender && fitnessGoal) {
      const bmr = calculateBMR({ height, weight, age, gender });
      const dailyGoal = calculateDailyCalorieGoal({ height, weight, age, gender, fitnessGoal });
      const macroTargets = calculateMacroTargets(dailyGoal, fitnessGoal);
      
      setCalculatedValues({ bmr, dailyGoal, macroTargets });
    }
  }, [watchedValues]);

  const onSubmit = async (data: ProfileForm) => {
    try {
      const profileData: UserProfile = {
        ...data,
        bmr: calculatedValues.bmr,
        dailyCalorieGoal: calculatedValues.dailyGoal,
      };

      await updateProfile.mutateAsync(profileData);
      
      toast({
        title: "Profile Updated",
        description: "Your personalized nutrition goals have been calculated.",
      });
      
      onComplete(profileData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  const goalLabels = {
    lose: { 
      title: "Lose Weight", 
      description: "Create a calorie deficit", 
      icon: TrendingDown,
      color: "text-red-500",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      detail: "Eat 500 cal below maintenance to lose ~0.5kg per week"
    },
    maintain: { 
      title: "Maintain Weight", 
      description: "Keep current weight", 
      icon: Target,
      color: "text-blue-500",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      detail: "Eat at maintenance level to keep your current weight"
    },
    gain: { 
      title: "Build Muscle", 
      description: "Create a calorie surplus", 
      icon: TrendingUp,
      color: "text-green-500",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      detail: "Eat 300-500 cal above maintenance for lean muscle gain"
    },
  };

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Welcome to CalorieSnap</h1>
            <p className="text-muted-foreground">
              Let's set up your profile for personalized calorie goals
            </p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Basic Measurements */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="height">Height (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  placeholder="175"
                  {...form.register('height', { valueAsNumber: true })}
                  data-testid="input-height"
                />
                {form.formState.errors.height && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.height.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  placeholder="70"
                  {...form.register('weight', { valueAsNumber: true })}
                  data-testid="input-weight"
                />
                {form.formState.errors.weight && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.weight.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="28"
                  {...form.register('age', { valueAsNumber: true })}
                  data-testid="input-age"
                />
                {form.formState.errors.age && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.age.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select onValueChange={(value) => form.setValue('gender', value as 'male' | 'female')}>
                  <SelectTrigger data-testid="select-gender">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.gender && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.gender.message}
                  </p>
                )}
              </div>
            </div>

            {/* Fitness Goal Tabs */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Choose Your Fitness Goal
              </Label>
              
              <Tabs 
                value={form.watch('fitnessGoal') || ''} 
                onValueChange={(value) => form.setValue('fitnessGoal', value as 'lose' | 'maintain' | 'gain')}
                className="w-full"
              >
                <TabsList className="grid grid-cols-3 w-full h-auto p-1">
                  {Object.entries(goalLabels).map(([value, { title, icon: Icon, color }]) => (
                    <TabsTrigger
                      key={value}
                      value={value}
                      className="flex flex-col gap-1 px-3 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                      data-testid={`tab-${value}`}
                    >
                      <Icon className={`h-5 w-5 ${color}`} />
                      <span className="text-xs font-medium">{title}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              {/* Goal Description Card */}
              {form.watch('fitnessGoal') && (
                <Card className={`${goalLabels[form.watch('fitnessGoal')!].bgColor} ${goalLabels[form.watch('fitnessGoal')!].borderColor} border-2 transition-all duration-200`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg bg-white ${goalLabels[form.watch('fitnessGoal')!].borderColor} border`}>
                        {(() => {
                          const Icon = goalLabels[form.watch('fitnessGoal')!].icon;
                          return <Icon className={`h-5 w-5 ${goalLabels[form.watch('fitnessGoal')!].color}`} />;
                        })()}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm mb-1">
                          {goalLabels[form.watch('fitnessGoal')!].title}
                        </h4>
                        <p className="text-xs text-muted-foreground mb-2">
                          {goalLabels[form.watch('fitnessGoal')!].description}
                        </p>
                        <p className="text-xs font-medium">
                          {goalLabels[form.watch('fitnessGoal')!].detail}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {form.formState.errors.fitnessGoal && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.fitnessGoal.message}
                </p>
              )}
            </div>

            {/* Enhanced Calculated Goals Display */}
            {calculatedValues.bmr > 0 && (
              <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold">Your Personalized Goals</h4>
                  </div>
                  
                  {/* Main Calorie Display */}
                  <div className="text-center mb-4 p-4 bg-background/50 rounded-lg border">
                    <div className="text-sm text-muted-foreground mb-1">Daily Calorie Target</div>
                    <div className="text-3xl font-bold text-primary" data-testid="text-calculated-goal">
                      {Math.round(calculatedValues.dailyGoal)}
                    </div>
                    <div className="text-sm font-medium">calories</div>
                    {form.watch('fitnessGoal') && (
                      <div className={`text-xs mt-1 ${goalLabels[form.watch('fitnessGoal')!].color} font-medium`}>
                        {goalLabels[form.watch('fitnessGoal')!].title} Goal
                      </div>
                    )}
                  </div>

                  {/* Detailed Breakdown */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="text-center p-3 bg-background/30 rounded-lg">
                      <div className="text-xs text-muted-foreground">Base Metabolic Rate</div>
                      <div className="text-lg font-semibold" data-testid="text-calculated-bmr">
                        {Math.round(calculatedValues.bmr)}
                      </div>
                      <div className="text-xs">cal/day</div>
                    </div>
                    <div className="text-center p-3 bg-background/30 rounded-lg">
                      <div className="text-xs text-muted-foreground">Activity Level</div>
                      <div className="text-lg font-semibold">
                        {Math.round(calculatedValues.dailyGoal - calculatedValues.bmr)}
                      </div>
                      <div className="text-xs">cal/day</div>
                    </div>
                  </div>

                  {/* Macronutrient Targets */}
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground mb-2">Daily Macronutrient Targets</div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center p-2 bg-red-50 border border-red-200 rounded-md">
                        <div className="text-xs font-medium text-red-700">Protein</div>
                        <div className="text-sm font-bold text-red-600">
                          {calculatedValues.macroTargets.protein}g
                        </div>
                      </div>
                      <div className="text-center p-2 bg-blue-50 border border-blue-200 rounded-md">
                        <div className="text-xs font-medium text-blue-700">Carbs</div>
                        <div className="text-sm font-bold text-blue-600">
                          {calculatedValues.macroTargets.carbs}g
                        </div>
                      </div>
                      <div className="text-center p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                        <div className="text-xs font-medium text-yellow-700">Fat</div>
                        <div className="text-sm font-bold text-yellow-600">
                          {calculatedValues.macroTargets.fat}g
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Button 
              type="submit" 
              className="w-full"
              disabled={updateProfile.isPending || !form.formState.isValid}
              data-testid="button-complete-setup"
            >
              {updateProfile.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Setting up...
                </>
              ) : (
                'Complete Setup'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
