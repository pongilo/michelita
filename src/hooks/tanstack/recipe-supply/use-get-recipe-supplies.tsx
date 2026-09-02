import { getRecipeSupplies } from "@/lib/api/recipe-supply/get-recipe-supplies";
import { useQuery } from "@tanstack/react-query";

type UseGetRecipeSuppliesProps = {
  recipeId: string;
};

export function useGetRecipeSupplies({ recipeId }: UseGetRecipeSuppliesProps) {
  return useQuery({
    queryKey: ["recipe-supplies", recipeId],
    queryFn: async () => getRecipeSupplies({ recipeId }),
    enabled: !!recipeId,
  });
}
