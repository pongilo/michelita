import { supabase } from "@/lib/supabase";

type UpdateCustomerProps = {
  id: string;
  name: string;
  phone?: string;
  note?: string;
};

export async function updateCustomer({ id, name, phone, note }: UpdateCustomerProps) {
  const { error } = await supabase
    .from("customer")
    .update({
      name: name.trim(),
      phone: phone?.trim() ? phone.trim() : null,
      note: note?.trim() ? note.trim() : null,
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}
