import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useUpdateUserProfile } from "@/hooks/use-user-profile";
import { calculateBMR, calculateDailyCalorieGoal, calculateMacroTargets } from "@/lib/nutrition-calculator";
import { UserProfile } from "@/types/nutrition";

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
    lose: { title: "Lose Weight", description: "Create a calorie deficit" },
    maintain: { title: "Maintain Weight", description: "Keep current weight" },
    gain: { title: "Build Muscle", description: "Create a calorie surplus" },
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

            {/* Fitness Goal */}
            <div className="space-y-3">
              <Label>Fitness Goal</Label>
              <RadioGroup
                value={form.watch('fitnessGoal')}
                onValueChange={(value) => form.setValue('fitnessGoal', value as 'lose' | 'maintain' | 'gain')}
                data-testid="radio-fitness-goal"
              >
                {Object.entries(goalLabels).map(([value, { title, description }]) => (
                  <div key={value} className="flex items-center space-x-3 p-3 border border-input rounded-lg hover:bg-muted cursor-pointer">
                    <RadioGroupItem value={value} id={value} />
                    <div className="flex-1">
                      <Label htmlFor={value} className="font-medium cursor-pointer">
                        {title}
                      </Label>
                      <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
              {form.formState.errors.fitnessGoal && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.fitnessGoal.message}
                </p>
              )}
            </div>

            {/* Calculated Goals Display */}
            {calculatedValues.bmr > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-2">Your Personalized Goals</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">BMR:</span>
                      <span className="font-semibold ml-1" data-testid="text-calculated-bmr">
                        {Math.round(calculatedValues.bmr)} cal
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Daily Goal:</span>
                      <span className="font-semibold ml-1 text-primary" data-testid="text-calculated-goal">
                        {Math.round(calculatedValues.dailyGoal)} cal
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    P: {calculatedValues.macroTargets.protein}g | 
                    C: {calculatedValues.macroTargets.carbs}g | 
                    F: {calculatedValues.macroTargets.fat}g
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
