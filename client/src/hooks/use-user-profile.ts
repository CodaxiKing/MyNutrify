import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { UserProfile } from "@/types/nutrition";

export function useUserProfile(options: { enabled?: boolean } = {}) {
  return useQuery<UserProfile>({
    queryKey: ['/api/user/profile'],
    // O App só habilita depois de resolver a sessão: buscar o perfil sem token
    // daria 401 e derrubaria a sessão recém-criada.
    enabled: options.enabled ?? true,
  });
}

export function useUpdateUserProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      const response = await apiRequest('POST', '/api/user/profile', profile);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
    },
  });
}
