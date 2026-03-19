import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateCustomer } from "@/hooks/tanstack/customer/use-create-customer";
import { useGetCustomers } from "@/hooks/tanstack/customer/use-get-customers";

const createCustomerFormSchema = z.object({
  name: z.string().trim().min(2, "Informe ao menos 2 caracteres para o nome do cliente."),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

type CreateCustomerFormValues = z.infer<typeof createCustomerFormSchema>;

export const Route = createFileRoute("/app/customers")({
  component: CustomersPage,
});

function CustomersPage() {
  const location = useLocation();
  const { organization } = Route.useRouteContext();
  const { data: customers = [], isLoading, isError, error } = useGetCustomers({
    organizationId: organization.id,
  });
  const { mutateAsync: createCustomer, isPending: isCreatingCustomer } = useCreateCustomer();
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateCustomerFormValues>({
    resolver: zodResolver(createCustomerFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      address: "",
      note: "",
    },
  });

  const isCustomerProfileRoute =
    location.pathname.startsWith("/app/customers/") && location.pathname !== "/app/customers";

  if (isCustomerProfileRoute) {
    return <Outlet />;
  }

  async function onSubmit(values: CreateCustomerFormValues) {
    setFormError("");
    setFormSuccess("");

    try {
      const customer = await createCustomer({
        organizationId: organization.id,
        name: values.name.trim(),
        phone: values.phone?.trim() || undefined,
        address: values.address?.trim() || undefined,
        note: values.note?.trim() || undefined,
      });

      reset({
        name: "",
        phone: "",
        address: "",
        note: "",
      });
      setFormSuccess(`Cliente ${customer.name} criado com sucesso.`);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Erro ao criar cliente.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clientes</h1>
      </div>

      <section className="card border border-base-300 bg-base-100 shadow-sm">
        <div className="card-body">
          <h2 className="card-title text-base">Novo cliente</h2>
          <p className="text-sm opacity-70">Cadastro rapido para vincular clientes aos pedidos.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1">
                <input type="text" placeholder="Nome" className="input input-bordered w-full" {...register("name")} />
                {errors.name ? <span className="text-sm text-error">{errors.name.message}</span> : null}
              </label>
              <input
                type="text"
                placeholder="Telefone (opcional)"
                className="input input-bordered w-full"
                {...register("phone")}
              />
              <textarea
                placeholder="Endereco (opcional)"
                className="textarea textarea-bordered w-full md:col-span-2"
                rows={3}
                {...register("address")}
              />
              <textarea
                placeholder="Observacao (opcional)"
                className="textarea textarea-bordered w-full md:col-span-2"
                rows={3}
                {...register("note")}
              />
            </div>

            {formError ? (
              <div className="alert alert-error">
                <span>{formError}</span>
              </div>
            ) : null}

            {formSuccess ? (
              <div className="alert alert-success">
                <span>{formSuccess}</span>
              </div>
            ) : null}

            <div className="flex justify-end">
              <button type="submit" className="btn btn-primary" disabled={isCreatingCustomer}>
                {isCreatingCustomer ? "Salvando..." : "Salvar cliente"}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="card border border-base-300 bg-base-100 shadow-sm mt-4">
        <div className="card-body">
          <h2 className="card-title text-base">Lista de clientes</h2>

          {isLoading ? <p>Carregando clientes...</p> : null}
          {isError ? <p className="text-error">{error.message}</p> : null}

          {!isLoading && !isError && customers.length === 0 ? (
            <p className="text-sm opacity-70">Nenhum cliente cadastrado.</p>
          ) : null}

          {!isLoading && !isError && customers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Telefone</th>
                    <th>Endereco</th>
                    <th>Pedidos</th>
                    <th className="text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id}>
                      <td>{customer.name}</td>
                      <td>{customer.phone ?? "-"}</td>
                      <td>{customer.address ?? "-"}</td>
                      <td>{customer._count.order}</td>
                      <td>
                        <div className="flex justify-end">
                          <Link
                            to="/app/customers/$customerId"
                            params={{ customerId: customer.id }}
                            className="btn btn-xs btn-outline"
                          >
                            Ver perfil
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
