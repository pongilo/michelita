import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

export const Route = createFileRoute("/_public/register")({
  beforeLoad: async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: RegisterPage,
});

const registerSchema = z
  .object({
    email: z.string().email("Informe um e-mail valido."),
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
  const [success, setSuccess] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function handleRegister(values: RegisterFormValues) {
    setError("");
    setSuccess("");

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError(
        "Supabase nao configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.local."
      );
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
    });

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.session) {
      await navigate({ to: "/dashboard" });
      return;
    }

    setSuccess(
      "Cadastro realizado. Verifique seu e-mail para confirmar a conta antes de fazer login."
    );
  }

  return (
    <main className="max-w-md mx-auto px-5 py-20">
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h1 className="card-title text-3xl">Criar conta</h1>

          <form onSubmit={handleSubmit(handleRegister)} className="space-y-4">
            {!isSupabaseConfigured ? (
              <div className="alert alert-error">
                <span>
                  Supabase nao configurado. Defina VITE_SUPABASE_URL e
                  VITE_SUPABASE_ANON_KEY no .env.local.
                </span>
              </div>
            ) : null}

            <label className="form-control w-full gap-2">
              <span className="label-text">E-mail</span>
              <input
                id="email"
                type="email"
                {...register("email")}
                className="input input-bordered w-full"
              />
              {errors.email ? (
                <span className="text-error text-sm">{errors.email.message}</span>
              ) : null}
            </label>

            <label className="form-control w-full gap-2">
              <span className="label-text">Senha</span>
              <input
                id="password"
                type="password"
                {...register("password")}
                className="input input-bordered w-full"
              />
              {errors.password ? (
                <span className="text-error text-sm">{errors.password.message}</span>
              ) : null}
            </label>

            <label className="form-control w-full gap-2">
              <span className="label-text">Confirmar senha</span>
              <input
                id="confirmPassword"
                type="password"
                {...register("confirmPassword")}
                className="input input-bordered w-full"
              />
              {errors.confirmPassword ? (
                <span className="text-error text-sm">
                  {errors.confirmPassword.message}
                </span>
              ) : null}
            </label>

            {error ? (
              <div className="alert alert-error">
                <span>{error}</span>
              </div>
            ) : null}
            {success ? (
              <div className="alert alert-success">
                <span>{success}</span>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting || !isSupabaseConfigured}
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
