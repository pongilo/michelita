import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, CopyIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { useListOrders } from "@/hooks/tanstack/order/use-list-orders";
import {
  toExactDatetime,
  formatFullDayLabel,
  formatDayLabel,
  formatMonthYearLabel,
  formatWeekRangeLabel,
  timeFormatter,
  currencyFormatter,
} from "@/lib/utils/formatter";
import { Button } from "@/components/ui/button";
import { OrderItem } from "@/components/order-item";
import { PeriodFilter } from "@/components/ui/period-filter";
import { AppTitle } from "@/components/app-title";

type DayGroups = NonNullable<ReturnType<typeof useListOrders>["data"]>["days"][number]["groups"];

// Builds a WhatsApp-friendly (asterisk/underscore markdown) summary of a day's deliveries.
function buildDeliveriesText(referenceDate: string, groups: DayGroups) {
  const header = `*Agenda de pedidos*\n_${formatFullDayLabel(toExactDatetime(referenceDate))}_`;

  if (groups.length === 0) return header;

  const body = groups
    .map((group) => {
      const time = timeFormatter.format(toExactDatetime(group.deliveredAt));
      const status = group.order.isPaid ? "Pago" : "Pendente";
      const deliveredTag = group.items.every((i) => i.isDelivered) ? " (Entregue)" : "";
      const lines = [
        `*${time} • ${currencyFormatter.format(group.order.total)} (${status})${deliveredTag}*`,
      ];

      if (group.order.note) {
        lines.push(`Obs.: ${group.order.note}`);
      }

      for (const item of group.items) {
        const qty = item.quantity > 1 ? `${item.quantity}x ` : "";
        lines.push(`- ${qty}${item.description}`);
        if (item.note) {
          lines.push(`  Obs.: ${item.note}`);
        }
      }

      if (group.order.customer?.name) {
        lines.push(`*Cliente:* ${group.order.customer.name}`);
      }
      
      if (group.order.customer?.note) {
        lines.push(`_Obs.: ${group.order.customer.note}_`);
      }

      if (group.order.customer?.address) {
        lines.push(`*Endereço:* ${group.order.customer.address}`);
      }

      return lines.join("\n");
    })
    .join("\n\n");

  return `${header}\n\n${body}`;
}

function normalizeDate(date: Date) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

function addDaysUTC(date: Date, days: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

// Builds the Sun-Sat week (as YYYY-MM-DD keys) containing `today`, shifted by `weekOffset` weeks.
function getWeekRange(today: Date, weekOffset: number) {
  const anchor = addDaysUTC(normalizeDate(today), weekOffset * 7);
  const weekStart = addDaysUTC(anchor, -anchor.getUTCDay());
  const dateKeys = Array.from({ length: 7 }, (_, i) => toDateKey(addDaysUTC(weekStart, i)));
  return {
    dateKeys,
    startDate: dateKeys[0],
    endDate: toDateKey(addDaysUTC(weekStart, 7)),
  };
}

// Builds the calendar month containing `today`, shifted by `monthOffset` months.
function getMonthRange(today: Date, monthOffset: number) {
  const start = new Date(Date.UTC(today.getFullYear(), today.getMonth() + monthOffset, 1));
  const end = new Date(Date.UTC(today.getFullYear(), today.getMonth() + monthOffset + 1, 1));
  return { startDate: toDateKey(start), endDate: toDateKey(end) };
}

// Every date key (YYYY-MM-DD) from `startDateKey` up to, but excluding, `endDateKeyExclusive`.
function getDateKeysInRange(startDateKey: string, endDateKeyExclusive: string) {
  const dateKeys: string[] = [];
  let cursor = new Date(`${startDateKey}T00:00:00Z`);
  const end = new Date(`${endDateKeyExclusive}T00:00:00Z`);
  while (cursor < end) {
    dateKeys.push(toDateKey(cursor));
    cursor = addDaysUTC(cursor, 1);
  }
  return dateKeys;
}

type ViewMode = "day" | "week" | "month";
type DisplayDay = { date: string; groups: DayGroups };

const VIEW_MODE_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: "day", label: "Dia" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
];

type StatusFilter = "inProgress" | "finished" | "all";

export const Route = createFileRoute("/app/orders/")({
  component: OrderPage,
});

function OrderPage() {
  const { organization } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("inProgress");
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  // "today" is only ever set on the client, so the reference date always reflects
  // the browser's local date instead of the server's clock/timezone during SSR.
  const [today, setToday] = useState<Date | null>(null);

  useEffect(() => {
    const now = new Date();
    setToday(now);
    setSelectedDayIndex(now.getDay());
  }, []);

  const { dateKeys: weekDateKeys, startDate: weekStartDate, endDate: weekEndDate } = today
    ? getWeekRange(today, weekOffset)
    : { dateKeys: [] as string[], startDate: "", endDate: "" };

  const { startDate: monthStartDate, endDate: monthEndDate } = today
    ? getMonthRange(today, monthOffset)
    : { startDate: "", endDate: "" };

  const { startDate, endDate } = viewMode === "month"
    ? { startDate: monthStartDate, endDate: monthEndDate }
    : { startDate: weekStartDate, endDate: weekEndDate };

  const referenceDate = selectedDayIndex !== null ? weekDateKeys[selectedDayIndex] ?? null : null;

  const { data, isLoading, isError, error } = useListOrders({
    organizationId: organization!.id,
    startDate,
    endDate,
    enabled: !!startDate && !!endDate,
  });

  const dayGroups = data?.days.find((d) => d.date === referenceDate)?.groups ?? [];

  // Week/month views list every day in the period, even ones with no orders,
  // so the schedule reads as a complete calendar instead of skipping gaps.
  const periodDateKeys = viewMode === "week"
    ? weekDateKeys
    : viewMode === "month"
      ? getDateKeysInRange(monthStartDate, monthEndDate)
      : [];

  const displayDays: DisplayDay[] = viewMode === "day"
    ? (referenceDate ? [{ date: referenceDate, groups: dayGroups }] : [])
    : periodDateKeys.map((date) => ({ date, groups: data?.days.find((d) => d.date === date)?.groups ?? [] }));

  const inProgressDays = displayDays.map((d) => ({
    date: d.date,
    groups: d.groups.filter((g) => !g.items.every((i) => i.isDelivered)),
  }));
  const finishedDays = displayDays.map((d) => ({
    date: d.date,
    groups: d.groups.filter((g) => g.items.every((i) => i.isDelivered)),
  }));

  const inProgressCount = inProgressDays.reduce((sum, d) => sum + d.groups.length, 0);
  const finishedCount = finishedDays.reduce((sum, d) => sum + d.groups.length, 0);

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "Todos" },
    { value: "inProgress", label: inProgressCount > 0 ? `Em andamento (${inProgressCount})` : "Em andamento" },
    { value: "finished", label: finishedCount > 0 ? `Entregue (${finishedCount})` : "Entregue" },
  ];

  const visibleDays = statusFilter === "inProgress"
    ? inProgressDays
    : statusFilter === "finished"
      ? finishedDays
      : displayDays;

  const emptyDayMessage = statusFilter === "inProgress"
    ? "Nenhuma entrega em andamento."
    : statusFilter === "finished"
      ? "Nenhum pedido entregue."
      : "Nenhum pedido.";

  const periodLabel = viewMode === "day"
    ? (referenceDate ? formatFullDayLabel(toExactDatetime(referenceDate)) : "")
    : viewMode === "week"
      ? (weekStartDate ? formatWeekRangeLabel(weekStartDate, weekEndDate) : "")
      : (monthStartDate ? formatMonthYearLabel(toExactDatetime(monthStartDate)) : "");

  const periodNoun = viewMode === "day" ? "este dia" : viewMode === "week" ? "esta semana" : "este mês";
  const emptyPeriodMessage = `${emptyDayMessage.slice(0, -1)} para ${periodNoun}.`;

  const handleCopyDeliveries = () => {
    if (!referenceDate) return;
    navigator.clipboard.writeText(buildDeliveriesText(referenceDate, dayGroups));
    toast.success("Entregas copiadas.");
  };

  const goToAdjacentDay = (delta: number) => {
    setSelectedDayIndex((prevIndex) => {
      if (prevIndex === null) return prevIndex;
      const newIndex = prevIndex + delta;
      if (newIndex < 0) {
        setWeekOffset((w) => w - 1);
        return newIndex + 7;
      }
      if (newIndex > 6) {
        setWeekOffset((w) => w + 1);
        return newIndex - 7;
      }
      return newIndex;
    });
  };

  const goToPreviousPeriod = () => {
    if (viewMode === "day") goToAdjacentDay(-1);
    else if (viewMode === "week") setWeekOffset((w) => w - 1);
    else setMonthOffset((m) => m - 1);
  };

  const goToNextPeriod = () => {
    if (viewMode === "day") goToAdjacentDay(1);
    else if (viewMode === "week") setWeekOffset((w) => w + 1);
    else setMonthOffset((m) => m + 1);
  };

  return (
    <>
      <div className="mx-auto w-full max-w-6xl space-y-4 py-5">
        <header className="px-5 flex flex-wrap items-center gap-2">
          <AppTitle>Pedidos</AppTitle>

          <div className="ml-auto flex items-center gap-2">
            {viewMode === "day" && (
              <Button
                onClick={handleCopyDeliveries}
                variant="outline"
                size="sm"
                disabled={!referenceDate || dayGroups.length === 0}
              >
                <CopyIcon />
                Copiar
              </Button>
            )}
            <Button size="icon-sm" className="md:hidden" nativeButton={false} render={<Link to="/app/orders/form" />}>
              <PlusIcon />
            </Button>
          </div>
        </header>

        <div className="px-5 flex flex-wrap items-center gap-2">
          {periodLabel && (
            <div className="flex items-center gap-1">
              <Button
                onClick={goToPreviousPeriod}
                aria-label="Período anterior"
                variant="ghost"
                size="icon-sm"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <h2 className="text-sm font-medium capitalize text-muted-foreground whitespace-nowrap">
                {periodLabel}
              </h2>
              <Button
                onClick={goToNextPeriod}
                aria-label="Próximo período"
                variant="ghost"
                size="icon-sm"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}

          <PeriodFilter.Select
            value={viewMode}
            onChange={(value) => setViewMode(value as ViewMode)}
            options={VIEW_MODE_OPTIONS}
          />
          <PeriodFilter.Select
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as StatusFilter)}
            options={statusOptions}
          />
        </div>

        {(isLoading || !startDate) && (
          <div className="p-5 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="animate-spin size-4 rounded-full border-2 border-current border-t-transparent" />
            Carregando pedidos...
          </div>
        )}
        {isError && (
          <p className="text-destructive text-sm p-5">{error.message}</p>
        )}

        {data && (
          <div className="md:px-5">
            {visibleDays.length === 0 ? (
              <p className="text-base text-muted-foreground p-5 text-center">
                {emptyPeriodMessage}
              </p>
            ) : (
              visibleDays.map((day) => (
                <div key={day.date}>
                  {viewMode !== "day" && (
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-5 md:pt-5 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-2 md:px-0 max-md:bg-border bg-white sticky md:top-14 top-0 z-10">
                      {formatDayLabel(toExactDatetime(day.date))}
                    </p>
                  )}
                  {day.groups.length === 0 ? (
                    <p className={viewMode === "day" ? "text-base text-muted-foreground p-2 max-md:p-4 text-center" : "text-sm text-muted-foreground p-2 max-md:p-4"}>
                      {viewMode === "day" ? emptyPeriodMessage : emptyDayMessage}
                    </p>
                  ) : (
                    <div className="md:space-y-2">
                      {day.groups.map((group) => (
                        <OrderItem key={group.key} group={group} organizationId={organization!.id} />
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
}
