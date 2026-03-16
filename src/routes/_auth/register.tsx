import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useSignUp } from "@/hooks/tanstack/auth/use-sign-up";

export const Route = createFileRoute("/_auth/register")({
  component: RegisterPage,
});

const registerSchema = z
  .object({
    name: z.string().trim().min(1, "Informe seu nome."),
    email: z.email("Informe um e-mail valido."),
    password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "As senhas nao conferem.",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

function RegisterPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const { mutateAsync: signUp } = useSignUp();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit({ name, email, password }: RegisterFormValues) {
    setError("");

    await signUp(
      { name, email, password },
      {
        onSuccess: async ({ session }) => {
          if (!session) {
            await navigate({ to: "/login" });
            return;
          }

          await navigate({ to: "/app/dashboard" });
        },
        onError: (error) => {
          setError(error.message);
        }
      }
    );
  }

  return (
    <main className="max-w-md mx-auto px-5 py-20">
      <div className="card shadow-xs card-lg bg-base-100">
        <div className="card-body">
          <h1 className="card-title">Criar conta</h1>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <label className="space-y-1">
              <span className="label">Nome</span>
              <input
                id="name"
                type="text"
                {...register("name")}
                className="input input-bordered w-full"
              />
              {errors.name ? (
                <span className="text-error-content text-sm">{errors.name.message}</span>
              ) : null}
            </label>

            <label className="space-y-1">
              <span className="label">E-mail</span>
              <input
                id="email"
                type="email"
                {...register("email")}
                className="input input-bordered w-full"
              />
              {errors.email ? (
                <span className="text-error-content text-sm">{errors.email.message}</span>
              ) : null}
            </label>

            <label className="space-y-1">
              <span className="label">Senha</span>
              <input
                id="password"
                type="password"
                {...register("password")}
                className="input input-bordered w-full"
              />
              {errors.password ? (
                <span className="text-error-content text-sm">{errors.password.message}</span>
              ) : null}
            </label>

            <label className="space-y-1">
              <span className="label">Confirmar senha</span>
              <input
                id="confirmPassword"
                type="password"
                {...register("confirmPassword")}
                className="input input-bordered w-full"
              />
              {errors.confirmPassword ? (
                <span className="text-error-content text-sm">
                  {errors.confirmPassword.message}
                </span>
              ) : null}
            </label>

            {error && (
              <div className="alert alert-error">
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary w-full"
            >
              {isSubmitting ? "Criando conta..." : "Criar conta"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
