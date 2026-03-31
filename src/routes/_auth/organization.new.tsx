import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { signOut } from "@/lib/api/auth/sign-out";
import { useCreateOrganization } from "@/hooks/tanstack/organization/use-create-organization";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

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
  const { mutateAsync: createOrganization } = useCreateOrganization();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateOrganizationFormValues>({
    resolver: zodResolver(createOrganizationSchema),
  });

  async function onSubmit(values: CreateOrganizationFormValues) {
    await createOrganization(
      { name: values.name, ownerId: userId },
      {
        onSuccess: async () => {
          await navigate({ to: "/app/deliveries" });
        },
        onError: (error) => {
          toast.error(error.message);
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
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle>Criar organizacao</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm opacity-80 mb-4">
            Voce precisa criar uma organizacao para acessar o dashboard.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FieldGroup>
              <Field>
                <FieldLabel>Nome da organizacao</FieldLabel>
                <Input id="name" type="text" {...register("name")} />
                <FieldError>{errors.name?.message}</FieldError>
              </Field>

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Criando..." : "Criar organizacao"}
              </Button>
            </FieldGroup>
          </form>

          <Button type="button" variant="ghost" onClick={handleSignOut} className="mt-2 w-full">
            Sair
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
