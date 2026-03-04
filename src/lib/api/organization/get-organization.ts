import { supabase } from "@/lib/supabase";

export type Organization = {
  id: string;
  name: string;
  owner_id: string;
};

type getOrganization = {
  userId: string
}

export async function getOrganization({ userId }: getOrganization) {
  return await supabase
    .from("organization")
    .select("id, name, owner_id")
    .eq("owner_id", userId)
    .maybeSingle();
}
