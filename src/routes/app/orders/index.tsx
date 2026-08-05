import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, CopyIcon } from "lucide-react";
import { toast } from "sonner";
import { useListOrders } from "@/hooks/tanstack/order/use-list-orders";
import { toExactDatetime, formatFullDayLabel, timeFormatter, currencyFormatter } from "@/lib/utils/formatter";
import { Button } from "@/components/ui/button";
import { OrderItem } from "@/components/order-item";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

export const Route = createFileRoute("/app/orders/")({
  component: OrderPage,
});

function OrderPage() {
  const { organization } = useAuth();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  // "today" is only ever set on the client, so the reference date always reflects
  // the browser's local date instead of the server's clock/timezone during SSR.
  const [today, setToday] = useState<Date | null>(null);

  useEffect(() => {
    const now = new Date();
    setToday(now);
    setSelectedDayIndex(now.getDay());
  }, []);

  const { dateKeys: weekDateKeys, startDate, endDate } = today
    ? getWeekRange(today, weekOffset)
    : { dateKeys: [] as string[], startDate: "", endDate: "" };

  const referenceDate = selectedDayIndex !== null ? weekDateKeys[selectedDayIndex] ?? null : null;

  const { data, isLoading, isError, error } = useListOrders({
    organizationId: organization!.id,
    startDate,
    endDate,
    enabled: !!startDate && !!endDate,
  });

  const dayGroups = data?.days.find((d) => d.date === referenceDate)?.groups ?? [];
  const inProgressGroups = dayGroups.filter((g) => !g.items.every((i) => i.isDelivered));
  const finishedGroups = dayGroups.filter((g) => g.items.every((i) => i.isDelivered));

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

  return (
    <main className="bg-muted min-h-screen">
      <div className="mx-auto w-full max-w-6xl space-y-4 pb-5 pt-[calc(1.25rem+env(safe-area-inset-top))]">
        <header className="px-5 flex items-center justify-between gap-2">
          <AppTitle>Agenda</AppTitle>
          <Button
            onClick={handleCopyDeliveries}
            variant="outline"
            size="sm"
            disabled={!referenceDate || dayGroups.length === 0}
          >
            <CopyIcon />
            Copiar
          </Button>
        </header>

        {(isLoading || !referenceDate) && (
          <div className="p-5 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="animate-spin size-4 rounded-full border-2 border-current border-t-transparent" />
            Carregando pedidos...
          </div>
        )}
        {isError && (
          <p className="text-destructive text-sm p-5">{error.message}</p>
        )}

        {data && (
          <Tabs defaultValue="inProgress" className="w-full">
            {referenceDate && (
              <div className="flex items-center gap-1 px-5">
                <Button
                  onClick={() => goToAdjacentDay(-1)}
                  aria-label="Dia anterior"
                  variant="ghost"
                  size="icon-sm"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <h2 className="text-sm font-medium capitalize text-muted-foreground">
                  {formatFullDayLabel(toExactDatetime(referenceDate))}
                </h2>
                <Button
                  onClick={() => goToAdjacentDay(1)}
                  aria-label="Próximo dia"
                  variant="ghost"
                  size="icon-sm"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            )}
            <TabsList className="px-5">
              <TabsTrigger value="inProgress">
                Em andamento
                {inProgressGroups.length > 0 && (
                  <span className="ml-1.5 text-xs bg-muted rounded-full px-1.5 py-0.5">{inProgressGroups.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="isFinished">
                Finalizados
                {finishedGroups.length > 0 && (
                  <span className="ml-1.5 text-xs bg-muted rounded-full px-1.5 py-0.5">{finishedGroups.length}</span>
                )}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="inProgress" className="space-y-2 md:space-y-4 md:px-5">
              {inProgressGroups.length === 0 ? (
                <p className="text-base text-muted-foreground p-5 text-center">
                  Nenhuma entrega em andamento para este dia.
                </p>
              ) : (
                <>
                  {inProgressGroups.map((group) => (
                    <OrderItem key={group.key} group={group} organizationId={organization!.id} />
                  ))}
                </>
              )}
            </TabsContent>
            <TabsContent value="isFinished" className="space-y-2 md:space-y-4 md:px-5">
              {finishedGroups.length === 0 ? (
                <p className="text-base text-muted-foreground p-5 text-center">
                  Nenhuma entrega finalizada para este dia.
                </p>
              ) : (
                <>
                  {finishedGroups.map((group) => (
                    <OrderItem key={group.key} group={group} organizationId={organization!.id} />
                  ))}
                </>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </main>
  );
}
