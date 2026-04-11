import { updateProduct } from "@/lib/api/product/update-product";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type UseUpdateProductProps = {
  organizationId: string;
};

export function useUpdateProduct({ organizationId }: UseUpdateProductProps) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["products", organizationId],
      });
    },
  });
}
