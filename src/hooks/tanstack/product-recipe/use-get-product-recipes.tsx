import { getProductRecipes } from "@/lib/api/product-recipe/get-product-recipes";
import { useQuery } from "@tanstack/react-query";

type UseGetProductRecipesProps = {
  productId: string;
};

export function useGetProductRecipes({ productId }: UseGetProductRecipesProps) {
  return useQuery({
    queryKey: ["product-recipes", productId],
    queryFn: async () => getProductRecipes({ productId }),
    enabled: !!productId,
  });
}
