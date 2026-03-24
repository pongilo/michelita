import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getDailyDashboard } from "@/lib/api/dashboard/get-daily-dashboard";
import { currencyFormatter } from "@/lib/utils/formatter";

const dateRangeFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

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

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ["dashboard", organization.id, "daily", period, referenceDate],
    queryFn: async () =>
      getDailyDashboard({ organizationId: organization.id, period, referenceDate }),
    enabled: !!organization.id,
    refetchInterval: 60_000,
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Visão geral</h1>
          {data ? (
            <p className="text-sm opacity-60 mt-0.5">
              {dateRangeFormatter.format(new Date(data.rangeStart))} —{" "}
              {dateRangeFormatter.format(new Date(data.rangeEnd))}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="space-y-1">
            <span className="label text-xs">Período</span>
            <select
              className="select select-bordered select-sm"
              value={period}
              onChange={(e) => setPeriod(e.target.value as DashboardPeriod)}
            >
              <option value="daily">Diário</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensal</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="label text-xs">Data de referência</span>
            <input
              type="date"
              className="input input-bordered input-sm"
              value={referenceDate}
              onChange={(e) => setReferenceDate(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? <span className="loading loading-spinner loading-xs" /> : null}
            {isFetching ? "Atualizando..." : "Atualizar"}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm opacity-60">
          <span className="loading loading-spinner loading-sm" />
          Carregando dados...
        </div>
      ) : null}
      {isError ? <p className="text-error text-sm">{error.message}</p> : null}

      {data ? (
        <div className="space-y-6">

          {/* Métricas financeiras */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard
              label="Vendas"
              value={currencyFormatter.format(data.metrics.grossRevenue)}
            />
            <MetricCard
              label="Entradas"
              value={currencyFormatter.format(data.metrics.entry)}
              valueClassName="text-success"
            />
            <MetricCard
              label="Saídas"
              value={currencyFormatter.format(data.metrics.exit)}
              valueClassName="text-error"
            />
            <MetricCard
              label="Saldo"
              value={currencyFormatter.format(data.metrics.balance)}
              valueClassName={data.metrics.balance >= 0 ? "text-success" : "text-error"}
            />
          </section>

          {/* Métricas de pedidos */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MetricCard label="Pedidos" value={String(data.metrics.totalOrders)} />
            <MetricCard
              label="Pendentes"
              value={String(data.metrics.pendingOrders)}
              valueClassName={data.metrics.pendingOrders > 0 ? "text-warning" : undefined}
            />
            <MetricCard
              label="Ticket médio"
              value={currencyFormatter.format(data.metrics.averageTicket)}
            />
          </section>

          {/* Por método de pagamento */}
          <section>
            <h2 className="font-semibold mb-3">Por método de pagamento</h2>
            <div className="flex flex-col divide-y divide-base-200 border border-base-300 rounded-box overflow-hidden">
              {[
                { label: "PIX", icon: "⚡", value: data.byMethod.pix },
                { label: "Dinheiro", icon: "💵", value: data.byMethod.cash },
                { label: "Cartão de crédito", icon: "💳", value: data.byMethod.creditCard },
                { label: "Cartão de débito", icon: "💳", value: data.byMethod.debitCard },
              ].map(({ label, icon, value }) => (
                <div key={label} className="flex items-center gap-3 px-4 py-3 bg-base-100">
                  <div className="w-9 h-9 rounded-full bg-base-200 flex items-center justify-center shrink-0 text-base">
                    {icon}
                  </div>
                  <span className="flex-1 text-sm">{label}</span>
                  <span className={`text-sm font-semibold tabular-nums ${value > 0 ? "" : "opacity-40"}`}>
                    {currencyFormatter.format(value)}
                  </span>
                </div>
              ))}
            </div>
          </section>

        </div>
      ) : null}
    </main>
  );
}

type MetricCardProps = {
  label: string;
  value: string;
  valueClassName?: string;
};

function MetricCard({ label, value, valueClassName }: MetricCardProps) {
  return (
    <div className="rounded-box border border-base-300 bg-base-100 px-4 py-4">
      <p className="text-xs opacity-60 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-xl font-bold ${valueClassName ?? ""}`}>{value}</p>
    </div>
  );
}
