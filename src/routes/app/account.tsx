import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/auth-context";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { LogOutIcon } from "lucide-react";
import { signOut } from "@/lib/api/auth/sign-out";
import { updateUser } from "@/lib/api/auth/update-user";
import { updatePassword } from "@/lib/api/auth/update-password";
import { updateOrganization } from "@/lib/api/organization/update-organization";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { AppTitle } from "@/components/app-title";

export const Route = createFileRoute("/app/account")({
  component: AccountPage,
});

const profileSchema = z.object({
  name: z.string().trim().min(2, "Informe um nome com pelo menos 2 caracteres."),
  email: z.email("E-mail inválido."),
});

const orgSchema = z.object({
  name: z.string().trim().min(2, "Informe um nome com pelo menos 2 caracteres."),
});

const passwordSchema = z
  .object({
    password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

type ProfileValues = z.infer<typeof profileSchema>;
type OrgValues = z.infer<typeof orgSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

function AccountPage() {
  const { user, organization } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors, isSubmitting: isSubmittingProfile },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user!.user_metadata.name ?? "",
      email: user!.email ?? "",
    },
  });

  const {
    register: registerOrg,
    handleSubmit: handleSubmitOrg,
    formState: { errors: orgErrors, isSubmitting: isSubmittingOrg },
  } = useForm<OrgValues>({
    resolver: zodResolver(orgSchema),
    defaultValues: {
      name: organization!.name,
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPassword,
    formState: { errors: passwordErrors, isSubmitting: isSubmittingPassword },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function onSubmitProfile(values: ProfileValues) {
    try {
      await updateUser({ name: values.name, email: values.email });
      toast.success("Perfil atualizado com sucesso.");
      await queryClient.invalidateQueries({ queryKey: ["auth-user"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar perfil.");
    }
  }

  async function onSubmitOrg(values: OrgValues) {
    try {
      await updateOrganization({ id: organization!.id, name: values.name });
      toast.success("Configurações salvas com sucesso.");
      await queryClient.invalidateQueries({ queryKey: ["organization", user!.id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar configurações.");
    }
  }

  async function onSubmitPassword(values: PasswordValues) {
    try {
      await updatePassword({ password: values.password, confirmPassword: values.confirmPassword });
      toast.success("Senha alterada com sucesso.");
      resetPassword();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao alterar senha.");
    }
  }

  async function handleSignOut() {
    await signOut();
    queryClient.setQueryData(["auth-user"], { user: null });
    queryClient.removeQueries({ queryKey: ["organization"] });
    await navigate({ to: "/login" });
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-5">
      <div className="sticky top-[env(safe-area-inset-top)] z-20 flex flex-nowrap items-center justify-between gap-3 bg-background pt-5 mb-6 md:static md:top-auto md:z-auto md:bg-transparent">
        <AppTitle>Minha conta</AppTitle>
        <Button type="button" variant="outline" onClick={handleSignOut}>
          <LogOutIcon className="size-4" />
          Sair
        </Button>
      </div>

      {/* Perfil */}
      <section className="mb-8">
        <h2 className="text-base font-semibold mb-4">Informações pessoais</h2>

        <form onSubmit={handleSubmitProfile(onSubmitProfile)} className="space-y-4">
          <FieldGroup>
            <Field>
              <FieldLabel>Nome</FieldLabel>
              <Input type="text" {...registerProfile("name")} />
              {profileErrors.name && <FieldError>{profileErrors.name.message}</FieldError>}
            </Field>

            <Field>
              <FieldLabel>E-mail</FieldLabel>
              <Input type="email" {...registerProfile("email")} />
              {profileErrors.email && <FieldError>{profileErrors.email.message}</FieldError>}
            </Field>
          </FieldGroup>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmittingProfile}>
              {isSubmittingProfile ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </form>
      </section>

      <Separator />

      {/* Confeitaria */}
      <section className="mt-8 mb-8">
        <h2 className="text-base font-semibold mb-4">Informações da confeitaria</h2>

        <form onSubmit={handleSubmitOrg(onSubmitOrg)} className="space-y-4">
          <FieldGroup>
            <Field>
              <FieldLabel>Nome da confeitaria</FieldLabel>
              <Input type="text" {...registerOrg("name")} />
              {orgErrors.name && <FieldError>{orgErrors.name.message}</FieldError>}
            </Field>
          </FieldGroup>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmittingOrg}>
              {isSubmittingOrg ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </form>
      </section>

      <Separator />

      {/* Senha */}
      <section className="mt-8">
        <h2 className="text-base font-semibold mb-4">Alterar senha</h2>

        <form onSubmit={handleSubmitPassword(onSubmitPassword)} className="space-y-4">
          <FieldGroup>
            <Field>
              <FieldLabel>Nova senha</FieldLabel>
              <Input type="password" {...registerPassword("password")} />
              {passwordErrors.password && <FieldError>{passwordErrors.password.message}</FieldError>}
            </Field>

            <Field>
              <FieldLabel>Confirmar nova senha</FieldLabel>
              <Input type="password" {...registerPassword("confirmPassword")} />
              {passwordErrors.confirmPassword && <FieldError>{passwordErrors.confirmPassword.message}</FieldError>}
            </Field>
          </FieldGroup>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmittingPassword}>
              {isSubmittingPassword ? "Alterando..." : "Alterar senha"}
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
}
