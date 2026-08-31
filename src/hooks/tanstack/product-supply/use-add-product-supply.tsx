import { addProductSupply } from "@/lib/api/product-supply/add-product-supply";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type UseAddProductSupplyProps = {
  productId: string;
};

export function useAddProductSupply({ productId }: UseAddProductSupplyProps) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addProductSupply,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-supplies", productId] });
    },
  });
}
