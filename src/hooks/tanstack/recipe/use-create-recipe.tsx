import { createRecipe } from "@/lib/api/recipe/create-recipe";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useCreateRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createRecipe,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["recipes", variables.organizationId],
      });
    },
  });
}
