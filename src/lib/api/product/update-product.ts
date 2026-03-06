import { supabase } from "@/lib/supabase";

type UpdateProductProps = {
  id: string;
  name: string;
  description?: string;
  price: number;
  active: boolean;
};

export async function updateProduct({
  id,
  name,
  description,
  price,
  active,
}: UpdateProductProps) {
  const { error } = await supabase
    .from("product")
    .update({
      name: name.trim(),
      description: description?.trim() ? description.trim() : null,
      price,
      active,
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}
