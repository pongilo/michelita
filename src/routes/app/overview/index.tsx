import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/contexts/auth-context";
import { useGetOrdersOverview } from "@/hooks/tanstack/order/use-get-orders-overview";
import { LoadingState } from "@/components/ui/loading-state";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { currencyFormatter } from "@/lib/utils/formatter";

export const Route = createFileRoute("/app/overview/")({
  component: OverviewPage,
});

function getToday() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const end = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  return { start, end };
}

function OverviewPage() {
  const { organization } = useAuth();
  const { start, end } = getToday();
  console.log({ start, end })

  const { data, isLoading, isError, error } = useGetOrdersOverview({
    organizationId: organization!.id,
    startAt: start,
    endAt: end,
  });

  console.log(data)

  return (
    <main className="mx-auto w-full max-w-6xl p-5 space-y-8">
      <header className="space-y-4">
        <h1 className="text-2xl font-heading">Visão geral</h1>
      </header>

      {isLoading && <LoadingState label="Carregando visão geral..." />}
      {isError && <p className="text-destructive text-sm">{error.message}</p>}

      {data && (
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card size="sm">
            <CardHeader>
              <CardDescription>Total faturado</CardDescription>
              <CardTitle className="text-2xl">
                {currencyFormatter.format(data.stats.totalRevenue)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card size="sm">
            <CardHeader>
              <CardDescription>Pedidos realizados</CardDescription>
              <CardTitle className="text-2xl">
                {data.stats.orderCount}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card size="sm">
            <CardHeader>
              <CardDescription>Ticket médio</CardDescription>
              <CardTitle className="text-2xl">
                {data.stats.orderCount > 0
                  ? currencyFormatter.format(data.stats.averageTicket)
                  : "—"}
              </CardTitle>
            </CardHeader>
          </Card>
        </section>
      )}
    </main>
  );
}
