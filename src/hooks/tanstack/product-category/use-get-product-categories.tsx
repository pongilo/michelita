import { getProductCategories } from "@/lib/api/product-category/get-product-categories";
import { useQuery } from "@tanstack/react-query";

type UseGetProductCategoriesProps = {
  organizationId: string;
};

export function useGetProductCategories({ organizationId }: UseGetProductCategoriesProps) {
  return useQuery({
    queryKey: ["product-categories", organizationId],
    queryFn: async () => getProductCategories({ organizationId }),
    enabled: !!organizationId,
  });
}
