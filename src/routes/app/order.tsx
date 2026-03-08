import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { OrderFormModal } from "@/components/order-form-modal";
import { useGetUser } from "@/hooks/tanstack/auth/use-get-user";
import { useGetCustomers } from "@/hooks/tanstack/customer/use-get-customers";
import { useGetOrganization } from "@/hooks/tanstack/organization/use-get-organization";
import { useDeleteOrder } from "@/hooks/tanstack/order/use-delete-order";
import { useGetOrders } from "@/hooks/tanstack/order/use-get-orders";
import { useGetProducts } from "@/hooks/tanstack/product/use-get-products";
import type { OrderStatus, OrderType, OrderWithDetails } from "@/lib/api/order/types";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const ORDER_STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "pending", label: "Pendente" },
  { value: "confirmed", label: "Confirmado" },
  { value: "preparing", label: "Preparando" },
  { value: "ready", label: "Pronto" },
  { value: "delivered", label: "Entregue" },
  { value: "cancelled", label: "Cancelado" },
];

const ORDER_TYPE_OPTIONS: { value: OrderType; label: string }[] = [
  { value: "sale", label: "Venda" },
  { value: "order", label: "Pedido" },
];

function orderStatusLabel(status: OrderStatus) {
  return ORDER_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

function orderTypeLabel(type: OrderType) {
  return ORDER_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}

function orderStatusBadgeClass(status: OrderStatus) {
  switch (status) {
    case "pending":
      return "badge-warning";
    case "confirmed":
      return "badge-info";
    case "preparing":
      return "badge-accent";
    case "ready":
      return "badge-success";
    case "delivered":
      return "badge-success";
    case "cancelled":
      return "badge-error";
    default:
      return "badge-ghost";
  }
}

export const Route = createFileRoute("/app/order")({
  component: OrderPage,
});

function OrderPage() {
  const navigate = useNavigate();
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [orderQueryParams, setOrderQueryParams] = useQueryStates({
    modal: parseAsStringLiteral(["new", "edit"]),
    orderId: parseAsString,
    q: parseAsString,
    status: parseAsStringLiteral([
      "all",
      "pending",
      "confirmed",
      "preparing",
      "ready",
      "delivered",
      "cancelled",
    ]),
    type: parseAsStringLiteral(["all", "sale", "order"]),
    delivery: parseAsStringLiteral(["all", "dueToday"]),
  });

  const { data: userData, error: userError, isLoading: isLoadingUser } = useGetUser();
  const userId = userData?.user?.id ?? "";

  const {
    data: organization,
    error: organizationError,
    isLoading: isLoadingOrganization,
  } = useGetOrganization({ userId });
  const organizationId = organization?.id ?? "";

  const {
    data: orders = [],
    error: ordersError,
    isLoading: isLoadingOrders,
  } = useGetOrders({ organizationId });

  const { data: customers = [] } = useGetCustomers({ organizationId });
  const { data: products = [] } = useGetProducts({ organizationId });

  const { mutateAsync: deleteOrder, isPending: isDeleting } = useDeleteOrder({ organizationId });
  const isEditModalRequested = orderQueryParams.modal === "edit";
  const editingOrderId = isEditModalRequested ? orderQueryParams.orderId ?? null : null;
  const searchQuery = orderQueryParams.q ?? "";
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const statusFilter = orderQueryParams.status ?? "all";
  const typeFilter = orderQueryParams.type ?? "all";
  const deliveryFilter = orderQueryParams.delivery ?? "all";

  useEffect(() => {
    if (!isLoadingUser && !userId) {
      navigate({ to: "/login" });
    }
  }, [isLoadingUser, userId, navigate]);

  useEffect(() => {
    if (!isLoadingUser && userId && !isLoadingOrganization && !organization) {
      navigate({ to: "/organization/new" });
    }
  }, [isLoadingUser, userId, isLoadingOrganization, organization, navigate]);

  function handleOpenCreateModal() {
    setFeedbackError("");
    setSuccessMessage("");
    setOrderQueryParams({
      modal: "new",
      orderId: null,
    });
  }

  function handleEdit(order: OrderWithDetails) {
    setFeedbackError("");
    setSuccessMessage("");
    setOrderQueryParams({
      modal: "edit",
      orderId: order.id,
    });
  }

  function handleCloseFormModal() {
    setOrderQueryParams({
      modal: null,
      orderId: null,
    });
    setFeedbackError("");
  }

  async function handleDelete(order: OrderWithDetails) {
    const shouldDelete = window.confirm(`Deseja excluir o pedido ${order.id}?`);
    if (!shouldDelete) {
      return;
    }

    setFeedbackError("");
    setSuccessMessage("");
    setDeletingOrderId(order.id);

    try {
      await deleteOrder({ id: order.id });

      if (editingOrderId === order.id) {
        handleCloseFormModal();
      }

      setSuccessMessage("Pedido excluido com sucesso.");
    } catch (error) {
      setFeedbackError(error instanceof Error ? error.message : "Erro ao excluir pedido.");
    } finally {
      setDeletingOrderId(null);
    }
  }

  const isLoadingPage = isLoadingUser || isLoadingOrganization || isLoadingOrders;
  const baseError = userError?.message || organizationError?.message || ordersError?.message || "";
  const errorMessage = feedbackError || baseError;
  const orderToEdit = orders.find((order) => order.id === editingOrderId) ?? null;
  const isFormModalOpen = orderQueryParams.modal === "new" || (isEditModalRequested && !!orderToEdit);
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(todayStart.getDate() + 1);
  const filteredOrders = orders.filter((order) => {
    const matchesSearch = normalizedSearchQuery
      ? `${order.id} ${order.customer_name ?? ""} ${order.status} ${order.type}`
          .toLowerCase()
          .includes(normalizedSearchQuery)
      : true;

    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesType = typeFilter === "all" || order.type === typeFilter;
    const deliveryDate = order.delivery_datetime ? new Date(order.delivery_datetime) : null;
    const isDeliveryScheduledForToday = deliveryDate
      ? deliveryDate >= todayStart && deliveryDate < tomorrowStart
      : false;
    const needsDelivery = order.type === "order" && order.status !== "delivered" && order.status !== "cancelled";
    const matchesDelivery = deliveryFilter === "all" || (needsDelivery && isDeliveryScheduledForToday);

    return matchesSearch && matchesStatus && matchesType && matchesDelivery;
  });

  useEffect(() => {
    if (isLoadingOrders) {
      return;
    }

    if (isEditModalRequested && editingOrderId && !orderToEdit) {
      setOrderQueryParams({
        modal: null,
        orderId: null,
      });
      setFeedbackError("Pedido nao encontrado para edicao.");
    }
  }, [isLoadingOrders, isEditModalRequested, editingOrderId, orderToEdit, setOrderQueryParams]);

  return (
    <main className="p-5 lg:p-8 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Pedidos</h1>
        <button type="button" className="btn btn-primary" onClick={handleOpenCreateModal}>
          Novo pedido
        </button>
      </header>

      <p className="opacity-80">Gerencie pedidos, itens e pagamentos da sua organizacao.</p>

      {errorMessage ? (
        <div className="alert alert-error">
          <span>{errorMessage}</span>
        </div>
      ) : null}

      {successMessage ? (
        <div className="alert alert-success">
          <span>{successMessage}</span>
        </div>
      ) : null}

      <section className="card bg-base-100 shadow-xs">
        <div className="card-body">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="card-title">Lista de pedidos</h2>
            <div className="flex w-full max-w-4xl flex-wrap gap-2">
              <input
                type="search"
                value={searchQuery}
                onChange={(event) =>
                  setOrderQueryParams({
                    q: event.target.value.trim() ? event.target.value : null,
                  })
                }
                placeholder="Buscar por ID, cliente, tipo ou status..."
                className="input input-bordered flex-1 min-w-56"
              />
              <select
                className="select select-bordered"
                value={statusFilter}
                onChange={(event) =>
                  setOrderQueryParams({
                    status: event.target.value as
                      | "all"
                      | "pending"
                      | "confirmed"
                      | "preparing"
                      | "ready"
                      | "delivered"
                      | "cancelled",
                  })
                }
              >
                <option value="all">Todos os status</option>
                {ORDER_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                className="select select-bordered"
                value={typeFilter}
                onChange={(event) =>
                  setOrderQueryParams({
                    type: event.target.value as "all" | "sale" | "order",
                  })
                }
              >
                <option value="all">Todos os tipos</option>
                {ORDER_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                className="select select-bordered"
                value={deliveryFilter}
                onChange={(event) =>
                  setOrderQueryParams({
                    delivery: event.target.value as "all" | "dueToday",
                  })
                }
              >
                <option value="all">Todas as entregas</option>
                <option value="dueToday">A entregar hoje</option>
              </select>
            </div>
          </div>

          {isLoadingPage ? <span className="loading loading-spinner loading-md" /> : null}

          {!isLoadingPage && filteredOrders.length === 0 ? (
            <p className="opacity-75">Nenhum pedido encontrado.</p>
          ) : null}

          {!isLoadingPage && filteredOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Cliente</th>
                    <th>Tipo</th>
                    <th>Status</th>
                    <th>Itens</th>
                    <th>Total</th>
                    <th>Entrega</th>
                    <th className="text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="font-mono text-xs">{order.id.slice(0, 8)}</td>
                      <td>{order.customer_name ?? "-"}</td>
                      <td>{orderTypeLabel(order.type)}</td>
                      <td>
                        <span className={`badge ${orderStatusBadgeClass(order.status)}`}>
                          {orderStatusLabel(order.status)}
                        </span>
                      </td>
                      <td>{order.items.length}</td>
                      <td>{currencyFormatter.format(order.total)}</td>
                      <td>
                        {order.delivery_datetime
                          ? new Date(order.delivery_datetime).toLocaleString("pt-BR")
                          : "-"}
                      </td>
                      <td className="text-right">
                        <div className="inline-flex gap-2">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => handleEdit(order)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-error btn-outline"
                            onClick={() => handleDelete(order)}
                            disabled={isDeleting && deletingOrderId === order.id}
                          >
                            {isDeleting && deletingOrderId === order.id ? "Excluindo..." : "Excluir"}
                          </button>
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

      <OrderFormModal
        isOpen={isFormModalOpen}
        organizationId={organizationId}
        customers={customers}
        products={products}
        orderToEdit={orderToEdit}
        onSuccess={setSuccessMessage}
        onClose={handleCloseFormModal}
      />
    </main>
  );
}
