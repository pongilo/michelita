import { supabase } from "@/lib/supabase";

type GetProductsProps = {
  organizationId: string;
};

export async function getProducts({ organizationId }: GetProductsProps) {
  const { data, error } = await supabase
    .from("product")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}
