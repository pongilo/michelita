import { supabase } from "@/lib/supabase";

type CreateProductProps = {
  organizationId: string;
  name: string;
  description?: string;
  price: number;
  active: boolean;
};

export async function createProduct({
  organizationId,
  name,
  description,
  price,
  active,
}: CreateProductProps) {
  const { error } = await supabase.from("product").insert({
    organization_id: organizationId,
    name: name.trim(),
    description: description?.trim() ? description.trim() : null,
    price,
    active,
  });

  if (error) {
    throw new Error(error.message);
  }
}
