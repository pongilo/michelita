import { getProducts } from "@/lib/api/product/get-products";
import { useQuery } from "@tanstack/react-query";

type UseGetProductsProps = {
  organizationId: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

export function useGetProducts({ organizationId, search, page = 1, pageSize = 20 }: UseGetProductsProps) {
  return useQuery({
    queryKey: ["products", organizationId, search, page, pageSize],
    queryFn: async () => getProducts({ organizationId, search, page, pageSize }),
    enabled: !!organizationId,
    placeholderData: (prev) => prev,
  });
}
