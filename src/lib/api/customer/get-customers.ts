import { supabase } from "@/lib/supabase";

type GetCustomersProps = {
  organizationId: string;
};

export async function getCustomers({ organizationId }: GetCustomersProps) {
  const { data, error } = await supabase
    .from("customer")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}
