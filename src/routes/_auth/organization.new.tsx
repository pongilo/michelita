import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { supabase } from "@/lib/supabase";

const createOrganizationSchema = z.object({
  name: z.string().min(2, "Informe um nome com pelo menos 2 caracteres."),
});

type CreateOrganizationFormValues = z.infer<typeof createOrganizationSchema>;

export const Route = createFileRoute("/_auth/organization/new")({
  component: CreateOrganizationPage,
});

function CreateOrganizationPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateOrganizationFormValues>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: {
      name: "",
    },
  });

  async function onSubmit(values: CreateOrganizationFormValues) {
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError(userError?.message ?? "Usuario nao autenticado.");
      return;
    }

    const { error: insertError } = await supabase.from("organization").insert({
      name: values.name.trim(),
      owner_id: user.id,
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    await navigate({ to: "/app/dashboard" });
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    await navigate({ to: "/login" });
  }

  return (
    <main className="max-w-md mx-auto px-5 py-20">
      <div className="card shadow-xs card-lg bg-base-100">
        <div className="card-body">
          <h1 className="card-title">Criar organizacao</h1>
          <p className="text-sm opacity-80">
            Voce precisa criar uma organizacao para acessar o dashboard.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-4 flex flex-col gap-4">
            <label className="space-y-1">
              <span className="label">Nome da organizacao</span>
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

            {error ? (
              <div className="alert alert-error">
                <span>{error}</span>
              </div>
            ) : null}

            <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full">
              {isSubmitting ? "Criando..." : "Criar organizacao"}
            </button>
          </form>

          <button type="button" onClick={handleSignOut} className="btn btn-ghost mt-2 w-full">
            Sair
          </button>
        </div>
      </div>
    </main>
  );
}
