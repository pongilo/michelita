import { getRecipes } from "@/lib/api/recipe/get-recipes";
import { useQuery } from "@tanstack/react-query";

type UseGetRecipesProps = {
  organizationId: string;
};

export function useGetRecipes({ organizationId }: UseGetRecipesProps) {
  return useQuery({
    queryKey: ["recipes", organizationId],
    queryFn: () => getRecipes({ organizationId }),
    enabled: !!organizationId,
  });
}
