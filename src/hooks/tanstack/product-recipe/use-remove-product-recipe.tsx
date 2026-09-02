import { removeProductRecipe } from "@/lib/api/product-recipe/remove-product-recipe";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type UseRemoveProductRecipeProps = {
  productId: string;
};

export function useRemoveProductRecipe({ productId }: UseRemoveProductRecipeProps) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeProductRecipe,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-recipes", productId] });
    },
  });
}
