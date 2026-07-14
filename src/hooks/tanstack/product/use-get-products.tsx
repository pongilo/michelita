import { getProducts } from "@/lib/api/product/get-products";
import { useQuery } from "@tanstack/react-query";

type UseGetProductsProps = {
  organizationId: string;
};

export function useGetProducts({ organizationId }: UseGetProductsProps) {
  return useQuery({
    queryKey: ["products", organizationId],
    queryFn: async () => getProducts({ organizationId }),
    enabled: !!organizationId,
  });
}
