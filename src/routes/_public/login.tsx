import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { getSupabaseClient } from '@/lib/supabase';

export const Route = createFileRoute("/_public/login")({
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
  component: LoginPage,
});

const loginSchema = z.object({
  email: z.email("Informe um e-mail valido."),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginFormValues) {
    setError("");

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError(
        "Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.local."
      );
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (signInError) {
      setError(signInError.message);
      return;
    }

    await navigate({ to: "/dashboard" });
  }

  return (
    <main className="max-w-md mx-auto px-5 py-20">
      <div className="card card-border card-lg">
        <div className="card-body">
          <h1 className="card-title">Login</h1>

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

            {error ? (
              <div className="alert alert-error">
                <span>{error}</span>
              </div>
            ) : null}
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary w-full"
            >
              {isSubmitting ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
