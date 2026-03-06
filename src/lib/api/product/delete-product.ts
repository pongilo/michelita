import { supabase } from "@/lib/supabase";

type DeleteProductProps = {
  id: string;
};

export async function deleteProduct({ id }: DeleteProductProps) {
  const { error } = await supabase.from("product").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}
