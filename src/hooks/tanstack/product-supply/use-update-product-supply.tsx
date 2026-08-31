import { updateProductSupply } from "@/lib/api/product-supply/update-product-supply";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type UseUpdateProductSupplyProps = {
  productId: string;
};

export function useUpdateProductSupply({ productId }: UseUpdateProductSupplyProps) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProductSupply,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-supplies", productId] });
    },
  });
}
