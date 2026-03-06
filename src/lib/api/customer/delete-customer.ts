import { supabase } from "@/lib/supabase";

type DeleteCustomerProps = {
  id: string;
};

export async function deleteCustomer({ id }: DeleteCustomerProps) {
  const { data, error } = await supabase.from("customer").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
