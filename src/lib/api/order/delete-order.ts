import { supabase } from "@/lib/supabase";

type DeleteOrderProps = {
  id: string;
};

export async function deleteOrder({ id }: DeleteOrderProps) {
  const { error } = await supabase.from("order").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}
