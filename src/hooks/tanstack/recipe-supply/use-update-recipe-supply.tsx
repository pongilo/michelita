import { updateRecipeSupply } from "@/lib/api/recipe-supply/update-recipe-supply";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type UseUpdateRecipeSupplyProps = {
  recipeId: string;
  organizationId: string;
};

export function useUpdateRecipeSupply({ recipeId, organizationId }: UseUpdateRecipeSupplyProps) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateRecipeSupply,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipe-supplies", recipeId] });
      queryClient.invalidateQueries({ queryKey: ["recipes", organizationId] });
      queryClient.invalidateQueries({ queryKey: ["product-recipes"] });
    },
  });
}
