import { removeProductSupply } from "@/lib/api/product-supply/remove-product-supply";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type UseRemoveProductSupplyProps = {
  productId: string;
};

export function useRemoveProductSupply({ productId }: UseRemoveProductSupplyProps) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeProductSupply,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-supplies", productId] });
    },
  });
}
