import { removeRecipeSupply } from "@/lib/api/recipe-supply/remove-recipe-supply";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type UseRemoveRecipeSupplyProps = {
  recipeId: string;
  organizationId: string;
};

export function useRemoveRecipeSupply({ recipeId, organizationId }: UseRemoveRecipeSupplyProps) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeRecipeSupply,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipe-supplies", recipeId] });
      queryClient.invalidateQueries({ queryKey: ["recipes", organizationId] });
      queryClient.invalidateQueries({ queryKey: ["product-recipes"] });
    },
  });
}
