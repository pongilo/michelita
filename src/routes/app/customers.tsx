import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { useCreateCustomer } from "@/hooks/tanstack/customer/use-create-customer";
import { useGetCustomers } from "@/hooks/tanstack/customer/use-get-customers";

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
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const isCustomerProfileRoute =
    location.pathname.startsWith("/app/customers/") && location.pathname !== "/app/customers";

  if (isCustomerProfileRoute) {
    return <Outlet />;
  }

  async function handleCreateCustomer() {
    setFormError("");
    setFormSuccess("");

    if (name.trim().length < 2) {
      setFormError("Informe ao menos 2 caracteres para o nome do cliente.");
      return;
    }

    try {
      const customer = await createCustomer({
        organizationId: organization.id,
        name: name.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        note: note.trim() || undefined,
      });

      setName("");
      setPhone("");
      setAddress("");
      setNote("");
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

          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nome"
              className="input input-bordered w-full"
            />
            <input
              type="text"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Telefone (opcional)"
              className="input input-bordered w-full"
            />
            <input
              type="text"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Endereco (opcional)"
              className="input input-bordered w-full md:col-span-2"
            />
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Observacao (opcional)"
              className="textarea textarea-bordered w-full md:col-span-2"
              rows={3}
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
            <button type="button" className="btn btn-primary" onClick={handleCreateCustomer} disabled={isCreatingCustomer}>
              {isCreatingCustomer ? "Salvando..." : "Salvar cliente"}
            </button>
          </div>
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
