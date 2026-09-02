import { addRecipeSupply } from "@/lib/api/recipe-supply/add-recipe-supply";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type UseAddRecipeSupplyProps = {
  recipeId: string;
  organizationId: string;
};

export function useAddRecipeSupply({ recipeId, organizationId }: UseAddRecipeSupplyProps) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addRecipeSupply,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipe-supplies", recipeId] });
      queryClient.invalidateQueries({ queryKey: ["recipes", organizationId] });
      queryClient.invalidateQueries({ queryKey: ["product-recipes"] });
    },
  });
}
