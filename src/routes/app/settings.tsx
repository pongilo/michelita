import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { updateOrganization } from "@/lib/api/organization/update-organization";

export const Route = createFileRoute("/app/settings")({
  component: SettingsPage,
});

const orgSchema = z.object({
  name: z.string().trim().min(2, "Informe um nome com pelo menos 2 caracteres."),
});

type OrgValues = z.infer<typeof orgSchema>;

function SettingsPage() {
  const { organization } = Route.useRouteContext();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OrgValues>({
    resolver: zodResolver(orgSchema),
    defaultValues: {
      name: organization.name,
    },
  });

  async function onSubmit(values: OrgValues) {
    try {
      await updateOrganization({ id: organization.id, name: values.name });
      toast.success("Configurações salvas com sucesso.");
      router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar configurações.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-8">
      <h1 className="text-2xl font-semibold mb-8">Configurações</h1>

      <section>
        <h2 className="text-base font-semibold mb-4">Informações da confeitaria</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">Nome da confeitaria</span>
            </div>
            <input
              type="text"
              className={`input input-bordered w-full${errors.name ? " input-error" : ""}`}
              {...register("name")}
            />
            {errors.name && (
              <div className="label">
                <span className="label-text-alt text-error">{errors.name.message}</span>
              </div>
            )}
          </label>

          <div className="flex justify-end">
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="loading loading-spinner loading-sm" />
              ) : null}
              Salvar alterações
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
