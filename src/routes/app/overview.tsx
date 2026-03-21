import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getDailyDashboard } from "@/lib/api/dashboard/get-daily-dashboard";
import { currencyFormatter, dateFormatter } from "@/lib/utils/formatter";

const dateRangeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
});

const timeFormatter = new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" });
const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

function formatDelivery(deliveredAt: string | null, orderedAt: string | Date) {
  if (!deliveredAt) return null;
  const d = new Date(deliveredAt);
  const o = new Date(orderedAt);
  if (d.getTime() === o.getTime()) return null;
  const sameDay =
    d.getFullYear() === o.getFullYear() &&
    d.getMonth() === o.getMonth() &&
    d.getDate() === o.getDate();
  return sameDay
    ? timeFormatter.format(d)
    : `${shortDateFormatter.format(d)} ${timeFormatter.format(d)}`;
}

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

          <section>
            <div className="mb-3">
              <h2 className="text-base font-semibold">Pedidos recentes</h2>
            </div>
            {data.recentOrders.length === 0 ? (
              <p className="text-sm opacity-70">Nenhum pedido encontrado no periodo.</p>
            ) : (
              <div className="space-y-3">
                {data.recentOrders.map((order) => (
                  <Link
                    key={order.id}
                    to="/app/order/$orderId"
                    params={{ orderId: order.id }}
                    className="card border border-base-300 bg-base-100 shadow-sm hover:border-primary/40 hover:shadow-md transition-all"
                  >
                    <div className="card-body gap-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          {(order.customerName && order.customerId) ? (
                            <p className="font-semibold leading-tight">{order.customerName}</p>
                          ) : (
                            <p className="opacity-40 text-sm">Sem cliente</p>
                          )}
                          <p className="text-xs opacity-50 mt-0.5">{dateFormatter.format(new Date(order.orderedAt))}</p>
                        </div>
                        <span className={`badge badge-sm shrink-0 ${order.isPaid ? "badge-info" : "badge-warning"}`}>
                          {order.isPaid ? "Pago" : "Pendente"}
                        </span>
                      </div>

                      <ul className="space-y-2">
                        {order.items.map((item, i) => (
                          <li key={i} className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-sm">
                                <span className="font-bold text-primary">{item.quantity}x</span>{" "}
                                {item.description}
                                {formatDelivery(item.deliveredAt, order.orderedAt) && (
                                  <span className="ml-1.5 text-xs opacity-50">
                                    · {formatDelivery(item.deliveredAt, order.orderedAt)}
                                  </span>
                                )}
                              </span>
                              {item.note && (
                                <p className="text-xs opacity-50 mt-0.5">{item.note}</p>
                              )}
                            </div>
                            <span className="text-xs opacity-60 shrink-0 mt-0.5">{currencyFormatter.format(item.total)}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="border-t border-base-300 pt-2 flex items-center justify-between gap-2">
                        {order.note
                          ? <p className="text-xs opacity-50 italic">{order.note}</p>
                          : <span />
                        }
                        <span className="text-sm font-bold">{currencyFormatter.format(order.total)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
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
