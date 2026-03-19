import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getDailyDashboard } from "@/lib/api/dashboard/get-daily-dashboard";
import { currencyFormatter } from "@/lib/utils/formatter";

const dateRangeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
});

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeStyle: "short",
});

type DashboardPeriod = "daily" | "weekly" | "monthly";

function currentDateInputValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export const Route = createFileRoute("/app/overview")({
  component: DashboardPage,
});

function DashboardPage() {
  const { organization } = Route.useRouteContext();
  const [period, setPeriod] = useState<DashboardPeriod>("daily");
  const [referenceDate, setReferenceDate] = useState<string>(currentDateInputValue);

  const {
    data,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["dashboard", organization.id, "daily", period, referenceDate],
    queryFn: async () =>
      getDailyDashboard({
        organizationId: organization.id,
        period,
        referenceDate,
      }),
    enabled: !!organization.id,
    refetchInterval: 60_000,
  });

  const periodLabel =
    period === "daily" ? "Diario" : period === "weekly" ? "Semanal" : "Mensal";

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Visão geral</h1>
          {data ? (
            <p className="text-sm opacity-70">
              {periodLabel}: {dateRangeFormatter.format(new Date(data.rangeStart))} ate{" "}
              {dateRangeFormatter.format(new Date(data.rangeEnd))}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="space-y-1">
            <span className="label text-xs">Periodo</span>
            <select
              className="select select-bordered select-sm"
              value={period}
              onChange={(event) => setPeriod(event.target.value as DashboardPeriod)}
            >
              <option value="daily">Diario</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensal</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="label text-xs">Data de referencia</span>
            <input
              type="date"
              className="input input-bordered input-sm"
              value={referenceDate}
              onChange={(event) => setReferenceDate(event.target.value)}
            />
          </label>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? "Atualizando..." : "Atualizar"}
          </button>
        </div>
      </div>

      {isLoading ? <p>Carregando dashboard...</p> : null}
      {isError ? <p className="text-error">{error.message}</p> : null}

      {data ? (
        <div className="space-y-6">
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <MetricCard title="Vendas" value={currencyFormatter.format(data.metrics.grossRevenue)} />
            <MetricCard title="Pedidos" value={String(data.metrics.totalOrders)} />
            <MetricCard title="Ticket médio" value={currencyFormatter.format(data.metrics.averageTicket)} />
            <MetricCard title="Entradas" value={currencyFormatter.format(data.metrics.entry)} />
            <MetricCard title="Saídas" value={currencyFormatter.format(data.metrics.exit)} />
            <MetricCard title="Saldo" value={currencyFormatter.format(data.metrics.balance)} />
          </section>

          <section>
            <div className="card border border-base-300 bg-base-100 shadow-sm">
              <div className="p-4 border-b border-base-300">
                <h2 className="card-title text-base">Método de pagamento</h2>
              </div>
                <div className="space-y-2 text-sm">
                  <table className="table table-zebra">
                    <tbody>
                      <tr>
                        <td>PIX</td>
                        <td className="text-right font-semibold">{currencyFormatter.format(data.byMethod.pix)}</td>
                      </tr>
                      <tr>
                        <td>Dinheiro</td>
                        <td className="text-right font-semibold">{currencyFormatter.format(data.byMethod.cash)}</td>
                      </tr>
                      <tr>
                        <td>Cartão de crédito</td>
                        <td className="text-right font-semibold">{currencyFormatter.format(data.byMethod.creditCard)}</td>
                      </tr>
                      <tr>
                        <td>Cartão de débito</td>
                        <td className="text-right font-semibold">{currencyFormatter.format(data.byMethod.debitCard)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
            </div>
          </section>

          <section className="card border border-base-300 bg-base-100 shadow-sm">
            <div className="p-4 border-b border-base-300">
              <h2 className="card-title text-base">Pedidos recentes</h2>
            </div>
            {data.recentOrders.length === 0 ? (
              <p className="text-sm opacity-70">Nenhum pedido encontrado no periodo.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>Pedido</th>
                      <th>Cliente</th>
                      <th>Horario</th>
                      <th>Pagamento</th>
                      <th>Observacao</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentOrders.map((order) => (
                      <tr key={order.id}>
                        <td className="font-mono text-xs">
                          <Link to="/app/order/$orderId" params={{ orderId: order.id }} className="link">
                            {order.id.slice(0, 8)}
                          </Link>
                        </td>
                        <td>
                          {(order.customerName && order.customerId) ? (
                          <Link to="/app/customers/$customerId" params={{ customerId: order.customerId }} className="link">
                            {order.customerName}
                          </Link>
                        ) : "Sem cliente"}
                        </td>
                        <td>{timeFormatter.format(new Date(order.orderedAt))}</td>
                        <td>
                          <span className={`badge ${order.isPaid ? "badge-info" : "badge-warning"}`}>
                            {order.isPaid ? "Pago" : "Pendente"}
                          </span>
                        </td>
                        <td className="max-w-44 truncate" title={order.note ?? ""}>
                          {order.note ?? "-"}
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
    </main>
  );
}

type MetricCardProps = {
  title: string;
  value: string;
};

function MetricCard({ title, value }: MetricCardProps) {
  return (
    <div className="card border border-base-300 bg-base-100 shadow-sm">
      <div className="card-body gap-1 p-4">
        <p className="text-sm opacity-70">{title}</p>
        <p className="text-2xl font-semibold">{value}</p>
      </div>
    </div>
  );
}

type MethodRowProps = {
  label: string;
  value: number;
};
