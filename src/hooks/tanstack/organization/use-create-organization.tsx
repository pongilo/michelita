import { createOrganization } from "@/lib/api/organization/create-organization";
import { useMutation } from "@tanstack/react-query";

export function useCreateOrganization() {
  return useMutation({
    mutationFn: createOrganization,
  });
}
