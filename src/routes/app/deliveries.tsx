import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useGetProductionOrders } from "@/hooks/tanstack/order/use-get-production-orders";
import type { ProductionOrder, ProductionOrderItem } from "@/lib/api/order/get-production-orders";
import { dateFormatter, timeFormatter } from "@/lib/utils/formatter";

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

function formatProductionColumnTitle(productionDate: string) {
  const formattedTitle = productionColumnTitleFormatter.format(createProductionDate(productionDate));
  return formattedTitle.charAt(0).toUpperCase() + formattedTitle.slice(1);
}

type FlatItem = ProductionOrderItem & {
  order: Pick<ProductionOrder, "id" | "isPaid" | "orderedAt" | "note" | "customer">;
};

function flattenAndSort(orders: ProductionOrder[]): FlatItem[] {
  return orders
    .flatMap((order) =>
      order.items
        .map((item) => ({
          ...item,
          order: {
            id: order.id,
            isPaid: order.isPaid,
            orderedAt: order.orderedAt,
            note: order.note,
            customer: order.customer,
          },
        }))
    )
    .sort((a, b) => new Date(a.deliveredAt).getTime() - new Date(b.deliveredAt).getTime());
}

export const Route = createFileRoute("/app/deliveries")({
  component: ProductionPage,
});

function ProductionPage() {
  const { organization } = Route.useRouteContext();
  const [productionStartDate, setProductionStartDate] = useState<string>(getProductionStartDateInputValue);

  const productionQuery = useGetProductionOrders({
    organizationId: organization.id,
    productionDate: productionStartDate,
  });

  function handleRefreshProductionBoard() {
    void productionQuery.refetch();
  }

  return (
    <main className="mx-auto w-full max-w-7xl py-4">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold px-4">Entregas</h1>

        <div className="flex flex-wrap items-end gap-2">
          <label className="space-y-1">
            <span className="label text-xs">Data</span>
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
            disabled={productionQuery.isFetching}
          >
            {productionQuery.isFetching ? "Atualizando..." : "Atualizar"}
          </button>
        </div>
      </div>

      <ProductionBoardColumn productionDate={productionStartDate} query={productionQuery} />

    </main>
  );
}

type ProductionBoardColumnProps = {
  productionDate: string;
  query: ReturnType<typeof useGetProductionOrders>;
};

function ProductionBoardColumn({ productionDate, query }: ProductionBoardColumnProps) {
  const productionOrders = query.data?.orders ?? [];
  const flatItems = flattenAndSort(productionOrders);

  return (
    <section className="flex min-h-120 flex-col overflow-hidden rounded-box">
      <div className="flex items-start justify-between gap-3 px-4">
        <div>
          <h2 className="text-base font-semibold">{formatProductionColumnTitle(productionDate)}</h2>
          <p className="text-xs opacity-70">{productionColumnDateFormatter.format(createProductionDate(productionDate))}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">{flatItems.length} itens</p>
          <p className="text-xs opacity-70">{productionOrders.length} pedidos</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 p-4 divide-y divide-base-300">
        {query.isLoading ? (
          <div className="rounded-box border border-dashed border-base-300 bg-base-100 p-4 text-sm opacity-70">
            Carregando produção...
          </div>
        ) : null}

        {query.isError ? (
          <div className="rounded-box border border-error/40 bg-error/10 p-4 text-sm text-error">{query.error.message}</div>
        ) : null}

        {!query.isLoading && !query.isError && flatItems.length === 0 ? (
          <div className="rounded-box border border-dashed border-base-300 bg-base-100 p-4 text-sm opacity-70">
            Nenhum item programado para este dia.
          </div>
        ) : null}

        {!query.isLoading && !query.isError
          ? flatItems.map((item) => <ProductionItemCard key={item.id} item={item} />)
          : null}
      </div>
    </section>
  );
}

type ProductionItemCardProps = {
  item: FlatItem;
};

function ProductionItemCard({ item }: ProductionItemCardProps) {
  const { order } = item;

  return (
    <Link
      to="/app/order/$orderId"
      params={{ orderId: order.id }}
      className="transition-all block"
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            {order.customer ? (
              <p className="font-semibold leading-tight">{order.customer.name}</p>
            ) : (
              <p className="opacity-40 text-sm">Sem cliente</p>
            )}
          </div>
          <span className={`badge badge-sm shrink-0 ${order.isPaid ? "badge-info" : "badge-warning"}`}>
            {order.isPaid ? "Pago" : "Pendente"}
          </span>
        </div>

        <div>
          <p className="text-sm">
            <span className="mr-1.5 text-xs opacity-50">
              {timeFormatter.format(new Date(item.deliveredAt))} · 
            </span>
            <span className="font-bold text-primary">{item.quantity}x</span>{" "}
            {item.description}
          </p>
          {item.note && (
            <p className="text-xs opacity-50 mt-0.5">{item.note}</p>
          )}
        </div>

        {order.note && (
          <p className="text-xs opacity-50 italic border-t border-base-300 pt-2">{order.note}</p>
        )}
      </div>
    </Link>
  );
}
