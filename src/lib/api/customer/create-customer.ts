import { supabase } from "@/lib/supabase";

type CreateCustomerProps = {
  organizationId: string;
  name: string;
  phone?: string;
  note?: string;
};

export async function createCustomer({ organizationId, name, phone, note }: CreateCustomerProps) {
  const { error } = await supabase.from("customer").insert({
    organization_id: organizationId,
    name: name.trim(),
    phone: phone?.trim() ? phone.trim() : null,
    note: note?.trim() ? note.trim() : null,
  });

  if (error) {
    throw new Error(error.message);
  }
}
