import { addProductRecipe } from "@/lib/api/product-recipe/add-product-recipe";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type UseAddProductRecipeProps = {
  productId: string;
};

export function useAddProductRecipe({ productId }: UseAddProductRecipeProps) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addProductRecipe,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-recipes", productId] });
    },
  });
}
