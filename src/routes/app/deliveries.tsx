import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useGetProductionOrders } from "@/hooks/tanstack/order/use-get-production-orders";
import type { ProductionOrder } from "@/lib/api/order/get-production-orders";
import { currencyFormatter, dateFormatter, timeFormatter } from "@/lib/utils/formatter";

const productionColumnTitleFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "short",
});

const productionColumnDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const productionWindowFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
});

function formatProductionDateInputValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function getProductionStartDateInputValue() {
  return formatProductionDateInputValue(new Date());
}

function createProductionDate(productionDate: string) {
  return new Date(`${productionDate}T00:00:00`);
}

function getProductionBoardDates(productionStartDate: string) {
  const startDate = createProductionDate(productionStartDate);

  return Array.from({ length: 3 }, (_, index) => {
    const columnDate = new Date(startDate);
    columnDate.setDate(startDate.getDate() + index);
    return formatProductionDateInputValue(columnDate);
  });
}

function formatProductionColumnTitle(productionDate: string) {
  const formattedTitle = productionColumnTitleFormatter.format(createProductionDate(productionDate));
  return formattedTitle.charAt(0).toUpperCase() + formattedTitle.slice(1);
}

export const Route = createFileRoute("/app/deliveries")({
  component: ProductionPage,
});

function ProductionPage() {
  const { organization } = Route.useRouteContext();
  const [productionStartDate, setProductionStartDate] = useState<string>(getProductionStartDateInputValue);
  const [firstProductionDate, secondProductionDate, thirdProductionDate] = getProductionBoardDates(productionStartDate);

  const firstProductionColumn = useGetProductionOrders({
    organizationId: organization.id,
    productionDate: firstProductionDate,
  });
  const secondProductionColumn = useGetProductionOrders({
    organizationId: organization.id,
    productionDate: secondProductionDate,
  });
  const thirdProductionColumn = useGetProductionOrders({
    organizationId: organization.id,
    productionDate: thirdProductionDate,
  });

  const productionColumns = [
    { productionDate: firstProductionDate, query: firstProductionColumn },
    { productionDate: secondProductionDate, query: secondProductionColumn },
    { productionDate: thirdProductionDate, query: thirdProductionColumn },
  ];

  const isRefreshingProductionBoard = productionColumns.some((column) => column.query.isFetching);

  function handleRefreshProductionBoard() {
    void Promise.all(productionColumns.map((column) => column.query.refetch()));
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Entregas</h1>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <label className="space-y-1">
            <span className="label text-xs">Data inicial</span>
            <input
              type="date"
              className="input input-bordered input-sm"
              value={productionStartDate}
              onChange={(event) => setProductionStartDate(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={handleRefreshProductionBoard}
            disabled={isRefreshingProductionBoard}
          >
            {isRefreshingProductionBoard ? "Atualizando..." : "Atualizar"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {productionColumns.map((column) => (
          <ProductionBoardColumn key={column.productionDate} productionDate={column.productionDate} query={column.query} />
        ))}
      </div>
    </main>
  );
}

type ProductionBoardColumnProps = {
  productionDate: string;
  query: ReturnType<typeof useGetProductionOrders>;
};

function ProductionBoardColumn({ productionDate, query }: ProductionBoardColumnProps) {
  const productionOrders = query.data?.orders ?? [];
  const scheduledItems = productionOrders.reduce((totalItems, order) => totalItems + order.items.length, 0);

  return (
    <section className="flex min-h-120 flex-col overflow-hidden rounded-box border border-base-300 bg-base-200/50 shadow-sm">
      <div className="border-b border-base-300 bg-base-100/90 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">{formatProductionColumnTitle(productionDate)}</h2>
            <p className="text-xs opacity-70">{productionColumnDateFormatter.format(createProductionDate(productionDate))}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">{productionOrders.length} pedidos</p>
            <p className="text-xs opacity-70">{scheduledItems} itens</p>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-3 p-3">
        {query.isLoading ? (
          <div className="rounded-box border border-dashed border-base-300 bg-base-100 p-4 text-sm opacity-70">
            Carregando produção...
          </div>
        ) : null}

        {query.isError ? (
          <div className="rounded-box border border-error/40 bg-error/10 p-4 text-sm text-error">{query.error.message}</div>
        ) : null}

        {!query.isLoading && !query.isError && productionOrders.length === 0 ? (
          <div className="rounded-box border border-dashed border-base-300 bg-base-100 p-4 text-sm opacity-70">
            Nenhum pedido programado para este dia.
          </div>
        ) : null}

        {!query.isLoading && !query.isError
          ? productionOrders.map((order) => <ProductionOrderCard key={order.id} order={order} />)
          : null}
      </div>
    </section>
  );
}

type ProductionOrderCardProps = {
  order: ProductionOrder;
};

function ProductionOrderCard({ order }: ProductionOrderCardProps) {
  return (
    <article className="rounded-box border border-base-300 bg-base-100 shadow-sm">
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link to="/app/order/$orderId" params={{ orderId: order.id }} className="link font-medium">
              Pedido #{order.id.slice(0, 8)}
            </Link>
            <p className="text-sm opacity-70">{dateFormatter.format(new Date(order.orderedAt))}</p>
          </div>
          <span className={`badge badge-sm ${order.isPaid ? "badge-info" : "badge-warning"}`}>
            {order.isPaid ? "Pago" : "Pendente"}
          </span>
        </div>

        <div className="text-sm">
          <p className="opacity-70">Total: {currencyFormatter.format(order.itemsTotal)}</p>
          <p className="opacity-70">Observação: {order.note ?? "-"}</p>
          <p>
            Cliente:{" "}
            {order.customer ? (
              <Link to="/app/customers/$customerId" params={{ customerId: order.customer.id }} className="link">
                {order.customer.name}
              </Link>
            ) : (
              "Sem cliente"
            )}
          </p>
        </div>

        <div className="space-y-2">
          {order.items.map((item) => (
            <div key={item.id} className="rounded-box border border-base-200 bg-base-200/60 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{item.description}</p>
                  <p className="text-sm opacity-70">Qtd. {item.quantity}</p>
                </div>
                <span className="badge badge-ghost badge-sm">{timeFormatter.format(new Date(item.deliveredAt))}</span>
              </div>
              <p className="mt-2 text-sm opacity-70">{item.note ?? "Sem observação."}</p>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
