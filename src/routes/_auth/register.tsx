import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { signUp } from "@/lib/api/auth/sign-up";
import { getOrganization } from "@/lib/api/organization/get-organization";

export const Route = createFileRoute("/_auth/register")({
  component: RegisterPage,
});

const registerSchema = z
  .object({
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

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit({ email, password }: RegisterFormValues) {
    setError("");

    const { data: signUpData, error: signUpError } = await signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (!signUpData.user?.id) {
      return
    }
    
    const { data, error } = await getOrganization({ userId: signUpData.user.id });

    if (error) {
      setError(error.message);
      return;
    }

    const to = data ? "/app/dashboard" : "/organization/new";
    await navigate({ to });
  }

  return (
    <main className="max-w-md mx-auto px-5 py-20">
      <div className="card shadow-xs card-lg bg-base-100">
        <div className="card-body">
          <h1 className="card-title">Criar conta</h1>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
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
