import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { TransactionFormModal, type TransactionFormValues } from "@/components/transaction-form-modal";
import { useGetOrder } from "@/hooks/tanstack/order/use-get-order";
import { useLinkOrderTransaction } from "@/hooks/tanstack/order/use-link-order-transaction";
import { useCreateTransaction } from "@/hooks/tanstack/transaction/use-create-transaction";
import { useGetTransactions } from "@/hooks/tanstack/transaction/use-get-transactions";
import { currencyFormatter, dateFormatter as datetimeFormatter } from "@/lib/utils/formatter";

const methodLabel: Record<string, string> = {
  PIX: "PIX",
  CASH: "Dinheiro",
  CREDIT_CARD: "Cartao de credito",
  DEBIT_CARD: "Cartao de debito",
};

function localDatetimeNow() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function currentDateInputValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export const Route = createFileRoute("/app/order/$orderId")({
  component: OrderDetailsPage,
});

function OrderDetailsPage() {
  const { organization } = Route.useRouteContext();
  const { orderId } = Route.useParams();
  const { data: order, isLoading, isError, error } = useGetOrder({
    organizationId: organization.id,
    orderId,
  });

  // Transações do período atual para vincular existente
  const { data: allTransactions = [] } = useGetTransactions({
    organizationId: organization.id,
    period: "monthly",
    referenceDate: currentDateInputValue(),
  });

  const { mutateAsync: createTransaction, isPending: isCreatingTransaction } = useCreateTransaction({
    organizationId: organization.id,
  });
  const { link, unlink } = useLinkOrderTransaction({ organizationId: organization.id, orderId });

  const [isNewTransactionModalOpen, setIsNewTransactionModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState("");
  const [formError, setFormError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Transações já vinculadas ao pedido (para evitar duplicatas no picker)
  const linkedTransactionIds = useMemo(
    () => new Set(order?.transactions.map((t) => t.id) ?? []),
    [order?.transactions],
  );

  const availableToLink = allTransactions.filter((t) => !linkedTransactionIds.has(t.id));

  async function handleCreateTransaction(values: TransactionFormValues) {
    setFormError("");
    try {
      await createTransaction({
        organizationId: organization.id,
        type: values.type,
        amount: values.amount,
        method: values.method,
        madeAt: values.madeAt,
        linkedOrderId: orderId,
        linkedCustomerId: values.linkedCustomerId || undefined,
        description: values.description,
      });
      setIsNewTransactionModalOpen(false);
      setActionSuccess("Transacao criada e vinculada ao pedido.");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao criar transacao.");
    }
  }

  async function handleLinkTransaction() {
    if (!selectedTransactionId) return;
    setActionError("");
    try {
      await link.mutateAsync({
        organizationId: organization.id,
        orderId,
        transactionId: selectedTransactionId,
      });
      setIsLinkModalOpen(false);
      setSelectedTransactionId("");
      setActionSuccess("Transacao vinculada ao pedido.");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erro ao vincular transacao.");
    }
  }

  async function handleUnlinkTransaction(transactionId: string) {
    setActionError("");
    const confirmed = window.confirm("Deseja desvincular esta transacao do pedido?");
    if (!confirmed) return;
    try {
      await unlink.mutateAsync({
        organizationId: organization.id,
        orderId,
        transactionId,
      });
      setActionSuccess("Transacao desvinculada do pedido.");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erro ao desvincular transacao.");
    }
  }

  const fixedLinkedOrder = order
    ? {
        id: order.id,
        label: `#${order.id.slice(0, 8)}${order.customer ? ` – ${order.customer.name}` : ""}`,
      }
    : undefined;

  const fixedLinkedCustomer =
    order?.customer
      ? { id: order.customer.id, name: order.customer.name }
      : undefined;

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-2 items-center">
          <h1 className="text-2xl font-semibold">Pedido #{order?.id.slice(0, 8)}</h1>
          {order && (
            <span className={`badge ${order.isPaid ? "badge-info" : "badge-warning"}`}>
              {order.isPaid ? "Pago" : "Pendente"}
            </span>
          )}
        </div>
        {order ? (
          <Link to="/app/order/edit/$orderId" params={{ orderId: order.id }} className="btn btn-sm btn-primary">
            Editar pedido
          </Link>
        ) : null}
      </div>

      {isLoading ? <p>Carregando pedido...</p> : null}
      {isError ? <p className="text-error">{error.message}</p> : null}

      {order ? (
        <div className="space-y-4">
          {actionSuccess ? (
            <div className="alert alert-success">
              <span>{actionSuccess}</span>
            </div>
          ) : null}
          {actionError ? (
            <div className="alert alert-error">
              <span>{actionError}</span>
            </div>
          ) : null}

          <section className="card border border-base-300 bg-base-100 shadow-sm">
            <div className="card-body">
              <p>
                <strong>Data:</strong> {datetimeFormatter.format(new Date(order.orderedAt))}
              </p>
              <p>
                <strong>Total do pedido:</strong> {currencyFormatter.format(order.itemTotal)}
              </p>
            </div>
          </section>

          <section className="card border border-base-300 bg-base-100 shadow-sm">
            {order.customer ? (
              <>
                <div className="p-4 border-b border-base-300">
                  <h2 className="card-title text-base">Cliente</h2>
                </div>
                <div className="card-body">
                  <p>
                    <strong>Nome:</strong>{' '}
                    <Link to="/app/customers/$customerId" params={{ customerId: order.customer.id }} className="link">
                      {order.customer.name}
                    </Link>
                  </p>
                  <p><strong>Telefone:</strong> {order.customer?.phone ?? "-"}</p>
                  <p><strong>Endereço:</strong> {order.customer?.address ?? "-"}</p>
                  <p><strong>Observação:</strong> {order.note ?? "-"}</p>
                </div>
              </>
            ) : (
              <h2 className="p-4 card-title text-base">Sem cliente</h2>
            )}
          </section>

          <section className="card border border-base-300 bg-base-100 shadow-sm">
            <div className="p-4 border-b border-base-300">
              <h2 className="card-title text-base">Itens do pedido</h2>
            </div>

            {order.item.length === 0 ? (
              <p className="text-sm opacity-70 p-4">Nenhum item cadastrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Descrição</th>
                      <th>Qtd.</th>
                      <th>Preço</th>
                      <th>Total</th>
                      <th>Entrega</th>
                      <th>Observação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.item.map((item) => (
                      <tr key={item.id}>
                        <td>{item.description}</td>
                        <td>{item.quantity}</td>
                        <td>{currencyFormatter.format(item.unitPrice)}</td>
                        <td>{currencyFormatter.format(item.total)}</td>
                        <td>{datetimeFormatter.format(new Date(item.deliveredAt))}</td>
                        <td>{item.note ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card border border-base-300 bg-base-100 shadow-sm">
            <div className="p-4 border-b border-base-300 flex items-center justify-between gap-2">
              <h2 className="card-title text-base">Transações vinculadas</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => {
                    setActionError("");
                    setActionSuccess("");
                    setSelectedTransactionId("");
                    setIsLinkModalOpen(true);
                  }}
                >
                  Vincular existente
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => {
                    setFormError("");
                    setActionSuccess("");
                    setIsNewTransactionModalOpen(true);
                  }}
                >
                  Nova transação
                </button>
              </div>
            </div>

            {order.transactions.length === 0 ? (
              <p className="text-sm opacity-70 p-4">Nenhuma transacao vinculada.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Tipo</th>
                      <th>Método</th>
                      <th>Descrição</th>
                      <th>Valor</th>
                      <th>Clientes</th>
                      <th className="text-right">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.transactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td>{datetimeFormatter.format(new Date(transaction.madeAt))}</td>
                        <td>
                          <span className={`badge ${transaction.type === "entry" ? "badge-success" : "badge-warning"}`}>
                            {transaction.type === "entry" ? "Entrada" : "Saida"}
                          </span>
                        </td>
                        <td>{methodLabel[transaction.method] ?? transaction.method}</td>
                        <td>{transaction.description || "-"}</td>
                        <td>{currencyFormatter.format(Math.abs(transaction.amount))}</td>
                        <td>
                          {transaction.linkedCustomers.length === 0 ? (
                            "-"
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {transaction.linkedCustomers.map((customer) => (
                                <Link
                                  key={customer.id}
                                  to="/app/customers/$customerId"
                                  params={{ customerId: customer.id }}
                                  className="link"
                                >
                                  {customer.name}
                                </Link>
                              ))}
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="flex justify-end">
                            <button
                              type="button"
                              className="btn btn-xs btn-outline btn-error"
                              disabled={unlink.isPending}
                              onClick={() => handleUnlinkTransaction(transaction.id)}
                            >
                              Desvincular
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {/* Modal: Nova transação vinculada ao pedido */}
      {order ? (
        <TransactionFormModal
          isOpen={isNewTransactionModalOpen}
          mode="create"
          isSubmitting={isCreatingTransaction}
          customers={[]}
          fixedLinkedOrder={fixedLinkedOrder}
          fixedLinkedCustomer={fixedLinkedCustomer}
          errorMessage={formError}
          successMessage=""
          initialValues={{
            madeAt: localDatetimeNow(),
          }}
          onClose={() => setIsNewTransactionModalOpen(false)}
          onSubmit={handleCreateTransaction}
        />
      ) : null}

      {/* Modal: Vincular transação existente */}
      {isLinkModalOpen ? (
        <div className="modal modal-open">
          <div className="modal-box max-w-lg">
            <h3 className="font-bold text-lg mb-4">Vincular transação existente</h3>

            {availableToLink.length === 0 ? (
              <p className="text-sm opacity-70">Nenhuma transacao disponivel para vincular no periodo atual.</p>
            ) : (
              <label className="space-y-1">
                <span className="label">Selecione a transacao</span>
                <select
                  className="select select-bordered w-full"
                  value={selectedTransactionId}
                  onChange={(e) => setSelectedTransactionId(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {availableToLink.map((t) => (
                    <option key={t.id} value={t.id}>
                      #{t.id.slice(0, 8)} – {t.type === "entry" ? "Entrada" : "Saida"} {currencyFormatter.format(Math.abs(t.amount))} – {datetimeFormatter.format(new Date(t.madeAt))}{t.description ? ` – ${t.description}` : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {actionError ? (
              <div className="alert alert-error mt-3">
                <span>{actionError}</span>
              </div>
            ) : null}

            <div className="modal-action">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setIsLinkModalOpen(false);
                  setSelectedTransactionId("");
                  setActionError("");
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!selectedTransactionId || link.isPending}
                onClick={handleLinkTransaction}
              >
                {link.isPending ? "Vinculando..." : "Vincular"}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setIsLinkModalOpen(false)} />
        </div>
      ) : null}
    </main>
  );
}
