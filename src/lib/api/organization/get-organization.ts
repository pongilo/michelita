import { supabase } from "@/lib/supabase";

export type Organization = {
  id: string;
  name: string;
  owner_id: string;
};

type GetOrganizationProps = {
  userId: string
}

export async function getOrganization({ userId }: GetOrganizationProps) {
  const { data, error } = await supabase
    .from("organization")
    .select("id, name, owner_id")
    .eq("owner_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message)
  }

  return data
}
