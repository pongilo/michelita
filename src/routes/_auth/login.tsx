import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useSignIn } from "@/hooks/tanstack/auth/use-sign-in";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_auth/login")({
  component: LoginPage,
});

const loginSchema = z.object({
  email: z.email("Informe um e-mail valido."),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { mutateAsync: signIn } = useSignIn()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit({ email, password }: LoginFormValues) {
    await signIn({ email, password }, {
      onSuccess: async () => {
        await queryClient.refetchQueries({ queryKey: ["auth-user"] });
        await navigate({ to: "/app/orders" });
      },
      onError: (error) => {
        toast.error(error.message);
      }
    })
  }

  return (
    <main className="max-w-md mx-auto px-5 py-20">
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle>Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FieldGroup>
              <Field>
                <FieldLabel>E-mail</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                />
                {errors.email && (
                  <FieldError>{errors.email.message}</FieldError>
                )}
              </Field>

              <Field>
                <FieldLabel>Senha</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  {...register("password")}
                />
                {errors.password && (
                  <FieldError>{errors.password.message}</FieldError>
                )}
              </Field>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full"
                size="lg"
              >
                {isSubmitting ? "Entrando..." : "Entrar"}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
