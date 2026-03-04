import { supabase } from "@/lib/supabase";

type CreateOrganizationProps = {
  name: string;
  ownerId: string;
};

export async function createOrganization({ name, ownerId }: CreateOrganizationProps) {
  const { data, error } = await supabase.from("organization").insert({
    name: name.trim(),
    owner_id: ownerId,
  });

  if (error) {
    throw new Error(error.message)
  }

  return data
}
