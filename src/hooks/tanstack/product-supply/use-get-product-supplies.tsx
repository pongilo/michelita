import { getProductSupplies } from "@/lib/api/product-supply/get-product-supplies";
import { useQuery } from "@tanstack/react-query";

type UseGetProductSuppliesProps = {
  productId: string;
};

export function useGetProductSupplies({ productId }: UseGetProductSuppliesProps) {
  return useQuery({
    queryKey: ["product-supplies", productId],
    queryFn: async () => getProductSupplies({ productId }),
    enabled: !!productId,
  });
}
