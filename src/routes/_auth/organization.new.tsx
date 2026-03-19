import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { signOut } from "@/lib/api/auth/sign-out";
import { useCreateOrganization } from "@/hooks/tanstack/organization/use-create-organization";

const createOrganizationSchema = z.object({
  name: z.string().min(2, "Informe um nome com pelo menos 2 caracteres."),
});

type CreateOrganizationFormValues = z.infer<typeof createOrganizationSchema>;

export const Route = createFileRoute("/_auth/organization/new")({
  component: CreateOrganizationPage,
  beforeLoad({ context }) {
    return {
      userId: context.userId
    }
  },
});

function CreateOrganizationPage() {
  const navigate = useNavigate();
  const { userId } = Route.useRouteContext();
  
  const [error, setError] = useState("");
  const { mutateAsync: createOrganization } = useCreateOrganization();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateOrganizationFormValues>({
    resolver: zodResolver(createOrganizationSchema),
  });

  async function onSubmit(values: CreateOrganizationFormValues) {
    setError("");

    await createOrganization(
      { name: values.name, ownerId: userId },
      {
        onSuccess: async () => {
          await navigate({ to: "/app/overview" });
        },
        onError: (error) => {
          setError(error.message);
        }
      }
    );
  }

  async function handleSignOut() {
    await signOut();
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
