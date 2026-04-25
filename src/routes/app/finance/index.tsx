import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TRANSACTION_TYPES } from "@/components/transaction-form-modal";
import { useAuth } from "@/contexts/auth-context";
import { useGetTransactionsDashboard } from "@/hooks/tanstack/transaction/use-get-transactions-dashboard";
import { LoadingState } from "@/components/ui/loading-state";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { currencyFormatter } from "@/lib/utils/formatter";

export const Route = createFileRoute("/app/finance/")({
  component: FinancePage,
});

type PeriodType = "day" | "week" | "month";

const shortDayFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});
const shortRangeFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});
const monthFmt = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function getPeriodRange(
  period: PeriodType,
  offset: number,
): { start: Date; end: Date; label: string } {
  const now = new Date();

  if (period === "day") {
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset),
    );
    const end = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset + 1),
    );
    const label = shortDayFmt.format(start);
    return { start, end, label: label.charAt(0).toUpperCase() + label.slice(1) };
  }

  if (period === "week") {
    const day = now.getUTCDay();
    const daysToMon = day === 0 ? -6 : 1 - day;
    const monday = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + daysToMon + offset * 7,
      ),
    );
    const sunday = new Date(
      Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + 6),
    );
    const nextMonday = new Date(
      Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + 7),
    );
    const label = `${shortRangeFmt.format(monday)} – ${shortRangeFmt.format(sunday)}`;
    return { start: monday, end: nextMonday, label };
  }

  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset + 1, 1));
  const label = monthFmt.format(start);
  return { start, end, label: label.charAt(0).toUpperCase() + label.slice(1) };
}

const PERIOD_LABELS: Record<PeriodType, string> = {
  day: "Hoje",
  week: "Semana",
  month: "Mês",
};

function FinancePage() {
  const { organization } = useAuth();
  const [period, setPeriod] = useState<PeriodType>("day");
  const [offset, setOffset] = useState(0);

  const { start, end, label } = getPeriodRange(period, offset);

  const { data, isLoading, isError, error } = useGetTransactionsDashboard({
    organizationId: organization!.id,
    startAt: start,
    endAt: end,
  });

  function handlePeriodChange(newPeriod: PeriodType) {
    setPeriod(newPeriod);
    setOffset(0);
  }

  const atCurrent = offset === 0;

  return (
    <main className="mx-auto w-full max-w-4xl p-5 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-heading">Financeiro</h1>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted p-1">
          {(["day", "week", "month"] as PeriodType[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => handlePeriodChange(p)}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                period === p
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </header>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOffset((o) => o - 1)}
          aria-label="Período anterior"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm font-medium capitalize min-w-32 text-center">{label}</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOffset((o) => o + 1)}
          disabled={atCurrent}
          aria-label="Próximo período"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {isLoading && <LoadingState label="Carregando financeiro..." />}
      {isError && <p className="text-destructive text-sm">{error.message}</p>}

      {data && (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card size="sm">
              <CardHeader>
                <CardDescription>Entradas</CardDescription>
                <CardTitle className="text-2xl text-green-600">
                  {currencyFormatter.format(data.income)}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card size="sm">
              <CardHeader>
                <CardDescription>Saídas</CardDescription>
                <CardTitle className="text-2xl text-destructive">
                  {currencyFormatter.format(data.expense)}
                </CardTitle>
                {data.spentPercent !== null && (
                  <p className="text-xs text-muted-foreground">
                    {data.spentPercent.toFixed(1)}% das entradas
                  </p>
                )}
              </CardHeader>
            </Card>

            <Card size="sm">
              <CardHeader>
                <CardDescription>Saldo</CardDescription>
                <CardTitle
                  className={`text-2xl ${data.balance >= 0 ? "text-green-600" : "text-destructive"}`}
                >
                  {currencyFormatter.format(data.balance)}
                </CardTitle>
              </CardHeader>
            </Card>
          </section>

          {data.categories.length > 0 && (
            <Card size="sm">
              <CardHeader>
                <CardDescription>Por categoria</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="divide-y divide-border">
                  {data.categories.map((cat) => (
                    <li key={cat.id ?? "__none__"} className="py-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium">{cat.name}</span>
                        <div className="flex flex-col items-end gap-0.5 text-sm tabular-nums">
                          {cat.income > 0 && (
                            <span className="text-green-600">
                              +{currencyFormatter.format(cat.income)}
                              {data.income > 0 && (
                                <span className="text-xs text-green-600/70 ml-1">
                                  ({cat.percentOfIncome.toFixed(1)}% das entradas)
                                </span>
                              )}
                            </span>
                          )}
                          {cat.expense > 0 && (
                            <span className="text-destructive">
                              -{currencyFormatter.format(cat.expense)}
                              {data.expense > 0 && (
                                <span className="text-xs text-destructive/70 ml-1">
                                  ({cat.percentOfExpense.toFixed(1)}% das saídas)
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {(cat.income > 0 || cat.expense > 0) && (
                        <div className="space-y-1">
                          {cat.income > 0 && data.income > 0 && (
                            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-green-500/70"
                                style={{ width: `${cat.percentOfIncome}%` }}
                              />
                            </div>
                          )}
                          {cat.expense > 0 && data.expense > 0 && (
                            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-destructive/60"
                                style={{ width: `${cat.percentOfExpense}%` }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {data.paymentMethods.length > 0 && (
            <Card size="sm">
              <CardHeader>
                <CardDescription>Por método de pagamento</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="divide-y divide-border">
                  <div className="grid grid-cols-3 pb-2 text-xs font-medium text-muted-foreground">
                    <span>Método</span>
                    <span className="text-center">Entradas</span>
                    <span className="text-center">Saídas</span>
                  </div>
                  {TRANSACTION_TYPES.filter((t) =>
                    data.paymentMethods.some((p) => p.type === t.value),
                  ).map((t) => {
                    const row = data.paymentMethods.find((p) => p.type === t.value)!;
                    return (
                      <div key={t.value} className="grid grid-cols-3 items-center py-3 text-sm">
                        <span className="font-medium">{t.label}</span>
                        <span className="text-center text-green-600 tabular-nums">
                          {row.income > 0 ? currencyFormatter.format(row.income) : "—"}
                        </span>
                        <span className="text-center text-destructive tabular-nums">
                          {row.expense > 0 ? currencyFormatter.format(row.expense) : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {data.categories.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              Nenhuma transação neste período.
            </p>
          )}
        </>
      )}
    </main>
  );
}
