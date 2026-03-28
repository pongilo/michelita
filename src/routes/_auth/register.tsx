import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useSignUp } from "@/hooks/tanstack/auth/use-sign-up";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

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
  const { mutateAsync: signUp } = useSignUp();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit({ name, email, password }: RegisterFormValues) {
    await signUp(
      { name, email, password },
      {
        onSuccess: async ({ session }) => {
          if (!session) {
            await navigate({ to: "/login" });
            return;
          }

          await navigate({ to: "/app/overview" });
        },
        onError: (error) => {
          toast.error(error.message);
        }
      }
    );
  }

  return (
    <main className="max-w-md mx-auto px-5 py-20">
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle>Criar conta</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FieldGroup>
              <Field>
                <FieldLabel>Nome</FieldLabel>
                <Input id="name" type="text" {...register("name")} />
                <FieldError>{errors.name?.message}</FieldError>
              </Field>

              <Field>
                <FieldLabel>E-mail</FieldLabel>
                <Input id="email" type="email" {...register("email")} />
                <FieldError>{errors.email?.message}</FieldError>
              </Field>

              <Field>
                <FieldLabel>Senha</FieldLabel>
                <Input id="password" type="password" {...register("password")} />
                <FieldError>{errors.password?.message}</FieldError>
              </Field>

              <Field>
                <FieldLabel>Confirmar senha</FieldLabel>
                <Input id="confirmPassword" type="password" {...register("confirmPassword")} />
                <FieldError>{errors.confirmPassword?.message}</FieldError>
              </Field>

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Criando conta..." : "Criar conta"}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
