import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/contexts/auth-context";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { updateOrganization } from "@/lib/api/organization/update-organization";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/app/settings")({
  component: SettingsPage,
});

const orgSchema = z.object({
  name: z.string().trim().min(2, "Informe um nome com pelo menos 2 caracteres."),
});

type OrgValues = z.infer<typeof orgSchema>;

function SettingsPage() {
  const { user, organization } = useAuth();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OrgValues>({
    resolver: zodResolver(orgSchema),
    defaultValues: {
      name: organization!.name,
    },
  });

  async function onSubmit(values: OrgValues) {
    try {
      await updateOrganization({ id: organization!.id, name: values.name });
      toast.success("Configurações salvas com sucesso.");
      await queryClient.invalidateQueries({ queryKey: ["organization", user!.id] });
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
          <FieldGroup>
            <Field>
              <FieldLabel>Nome da confeitaria</FieldLabel>
              <Input type="text" {...register("name")} />
              {errors.name && <FieldError>{errors.name.message}</FieldError>}
            </Field>
          </FieldGroup>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
}
