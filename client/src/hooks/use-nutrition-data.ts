import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { MealEntry, DailySummary, FoodAnalysis, Exercise, ActivityEntry } from "@/types/nutrition";

export function useDailySummary(date?: Date) {
  const dateParam = date ? date.toISOString().split('T')[0] : undefined;
  
  return useQuery<DailySummary>({
    queryKey: ['/api/daily-summary', dateParam],
  });
}

export function useWeeklySummary() {
  return useQuery<DailySummary[]>({
    queryKey: ['/api/weekly-summary'],
  });
}

export function useMealsForDate(date?: Date) {
  const dateParam = date ? date.toISOString().split('T')[0] : undefined;
  
  return useQuery<MealEntry[]>({
    queryKey: ['/api/meals', dateParam],
  });
}

export function useAnalyzeFood() {
  return useMutation<FoodAnalysis, Error, File>({
    mutationFn: async (imageFile: File) => {
      const formData = new FormData();
      formData.append('image', imageFile);
      
      const response = await fetch('/api/food/analyze', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to analyze food');
      }
      
      return response.json();
    },
  });
}

export function useAddMeal() {
  const queryClient = useQueryClient();
  
  return useMutation<MealEntry, Error, Omit<MealEntry, 'id' | 'userId'>>({
    mutationFn: async (meal) => {
      const response = await apiRequest('POST', '/api/meals', meal);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/daily-summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/weekly-summary'] });
    },
  });
}

export function useDeleteMeal() {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, string>({
    mutationFn: async (mealId: string) => {
      await apiRequest('DELETE', `/api/meals/${mealId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/daily-summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/weekly-summary'] });
    },
  });
}

// Activity hooks
export function useExercises(category?: string) {
  return useQuery<Exercise[]>({
    queryKey: ['/api/exercises', category],
    queryFn: async () => {
      const url = category ? `/api/exercises?category=${category}` : '/api/exercises';
      const response = await apiRequest('GET', url);
      return response.json();
    },
  });
}

export function useSearchExercises(query: string, category?: string) {
  return useQuery<Exercise[]>({
    queryKey: ['/api/exercises/search', query, category],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('q', query);
      if (category) params.append('category', category);
      
      const response = await apiRequest('GET', `/api/exercises/search?${params}`);
      return response.json();
    },
    enabled: !!query && query.length > 0,
  });
}

export function useActivitiesForDate(date?: Date) {
  const dateParam = date ? date.toISOString().split('T')[0] : undefined;
  
  return useQuery<ActivityEntry[]>({
    queryKey: ['/api/activities', dateParam],
  });
}

export function useAddActivity() {
  const queryClient = useQueryClient();
  
  return useMutation<ActivityEntry, Error, {
    exerciseId?: string;
    customExerciseName?: string;
    duration: number;
    intensity: 'light' | 'moderate' | 'vigorous';
    notes?: string;
    metValue?: number;
  }>({
    mutationFn: async (activity) => {
      const response = await apiRequest('POST', '/api/activities', activity);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/daily-summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/weekly-summary'] });
    },
  });
}

export function useDeleteActivity() {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, string>({
    mutationFn: async (activityId: string) => {
      await apiRequest('DELETE', `/api/activities/${activityId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/daily-summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/weekly-summary'] });
    },
  });
}
