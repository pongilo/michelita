import { updateRecipe } from "@/lib/api/recipe/update-recipe";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type UseUpdateRecipeProps = {
  organizationId: string;
};

export function useUpdateRecipe({ organizationId }: UseUpdateRecipeProps) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateRecipe,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes", organizationId] });
      queryClient.invalidateQueries({ queryKey: ["product-recipes"] });
    },
  });
}
