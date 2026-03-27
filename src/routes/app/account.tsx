import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { updateUser } from "@/lib/api/auth/update-user";
import { updatePassword } from "@/lib/api/auth/update-password";

export const Route = createFileRoute("/app/account")({
  component: AccountPage,
});

const profileSchema = z.object({
  name: z.string().trim().min(2, "Informe um nome com pelo menos 2 caracteres."),
  email: z.email("E-mail inválido."),
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
type PasswordValues = z.infer<typeof passwordSchema>;

function AccountPage() {
  const { user } = Route.useRouteContext();
  const router = useRouter();

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors, isSubmitting: isSubmittingProfile },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.user_metadata.name ?? "",
      email: user.email ?? "",
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
      router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar perfil.");
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

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-8">
      <h1 className="text-2xl font-semibold mb-8">Minha conta</h1>

      {/* Perfil */}
      <section className="mb-8">
        <h2 className="text-base font-semibold mb-4">Informações pessoais</h2>

        <form onSubmit={handleSubmitProfile(onSubmitProfile)} className="space-y-4">
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">Nome</span>
            </div>
            <input
              type="text"
              className={`input input-bordered w-full${profileErrors.name ? " input-error" : ""}`}
              {...registerProfile("name")}
            />
            {profileErrors.name && (
              <div className="label">
                <span className="label-text-alt text-error">{profileErrors.name.message}</span>
              </div>
            )}
          </label>

          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">E-mail</span>
            </div>
            <input
              type="email"
              className={`input input-bordered w-full${profileErrors.email ? " input-error" : ""}`}
              {...registerProfile("email")}
            />
            {profileErrors.email && (
              <div className="label">
                <span className="label-text-alt text-error">{profileErrors.email.message}</span>
              </div>
            )}
          </label>

          <div className="flex justify-end">
            <button type="submit" className="btn btn-primary" disabled={isSubmittingProfile}>
              {isSubmittingProfile ? (
                <span className="loading loading-spinner loading-sm" />
              ) : null}
              Salvar alterações
            </button>
          </div>
        </form>
      </section>

      <div className="divider" />

      {/* Senha */}
      <section>
        <h2 className="text-base font-semibold mb-4">Alterar senha</h2>

        <form onSubmit={handleSubmitPassword(onSubmitPassword)} className="space-y-4">
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">Nova senha</span>
            </div>
            <input
              type="password"
              className={`input input-bordered w-full${passwordErrors.password ? " input-error" : ""}`}
              {...registerPassword("password")}
            />
            {passwordErrors.password && (
              <div className="label">
                <span className="label-text-alt text-error">{passwordErrors.password.message}</span>
              </div>
            )}
          </label>

          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">Confirmar nova senha</span>
            </div>
            <input
              type="password"
              className={`input input-bordered w-full${passwordErrors.confirmPassword ? " input-error" : ""}`}
              {...registerPassword("confirmPassword")}
            />
            {passwordErrors.confirmPassword && (
              <div className="label">
                <span className="label-text-alt text-error">{passwordErrors.confirmPassword.message}</span>
              </div>
            )}
          </label>

          <div className="flex justify-end">
            <button type="submit" className="btn btn-primary" disabled={isSubmittingPassword}>
              {isSubmittingPassword ? (
                <span className="loading loading-spinner loading-sm" />
              ) : null}
              Alterar senha
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
