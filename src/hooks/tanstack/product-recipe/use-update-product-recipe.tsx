import { updateProductRecipe } from "@/lib/api/product-recipe/update-product-recipe";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type UseUpdateProductRecipeProps = {
  productId: string;
};

export function useUpdateProductRecipe({ productId }: UseUpdateProductRecipeProps) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProductRecipe,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-recipes", productId] });
    },
  });
}
