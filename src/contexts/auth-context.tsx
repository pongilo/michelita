import { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { getUser } from "@/lib/api/auth/get-user";
import { getOrganization } from "@/lib/api/organization/get-organization";

export type AuthOrganization = {
  id: string;
  name: string;
  ownerId: string;
};

type AuthContextType = {
  user: User | null;
  organization: AuthOrganization | null;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: userData, isLoading: sessionLoading } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => getUser(),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const user = userData?.user ?? null;

  const { data: organization, isLoading: orgLoading } = useQuery({
    queryKey: ["organization", user?.id],
    queryFn: () => getOrganization({ ownerId: user!.id }),
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  const isLoading = sessionLoading || (!!user && orgLoading);

  return (
    <AuthContext.Provider
      value={{
        user,
        organization: organization ?? null,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return context;
}