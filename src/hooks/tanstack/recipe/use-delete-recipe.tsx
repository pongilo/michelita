import { deleteRecipe } from "@/lib/api/recipe/delete-recipe";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type UseDeleteRecipeProps = {
  organizationId: string;
};

export function useDeleteRecipe({ organizationId }: UseDeleteRecipeProps) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteRecipe,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes", organizationId] });
      queryClient.invalidateQueries({ queryKey: ["product-recipes"] });
    },
  });
}
