import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/contexts/auth-context";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useListOrders } from "@/hooks/tanstack/order/use-list-orders";
import { timeFormatter, formatDayLabel } from "@/lib/utils/formatter";
import { LoadingState } from "@/components/ui/loading-state";
import { Badge } from "@/components/ui/badge";
import { Item, ItemActions, ItemContent, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";

function getDayPeriod(offset: number) {
  const now = new Date();
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + offset));
  return date.toISOString().slice(0, 10);
}

const dayFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export const Route = createFileRoute("/app/deliveries/")({
  component: DeliveriesPage,
});

function DeliveriesPage() {
  const { organization } = useAuth();
  const [dayOffset, setDayOffset] = useState(0);

  const referenceDate = getDayPeriod(dayOffset);
  const isToday = dayOffset === 0;
  const isTomorrow = dayOffset === 1;

  const { data, isLoading, isError, error } = useListOrders({
    organizationId: organization!.id,
    period: "daily",
    referenceDate,
  });

  const allItems = data?.itemsByDay.flatMap(day => day.groups.flatMap(g => g.items)) ?? [];
  const totalItems = data?.itemsByDay.reduce((sum, day) => sum + day.itemCount, 0) ?? 0;
  const deliveredCount = allItems.filter(i => i.isDelivered).length;

  const dayLabel = dayFormatter.format(new Date(referenceDate + "T00:00:00Z"));

  return (
    <main className="mx-auto w-full max-w-6xl p-5 space-y-8">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-2">
          <h1 className="text-2xl font-heading">Entregas</h1>
          {totalItems > 0 && (
            <p className="text-sm text-muted-foreground">
              ({deliveredCount} de {totalItems} entregues)
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDayOffset((o) => o - 1)}
            className="btn btn-ghost btn-sm btn-circle"
            aria-label="Dia anterior"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-sm font-medium capitalize min-w-48 text-center">
            {isToday ? "Hoje" : isTomorrow ? "Amanhã" : dayLabel}
          </span>
          <button
            onClick={() => setDayOffset((o) => o + 1)}
            className="btn btn-ghost btn-sm btn-circle"
            aria-label="Próximo dia"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </header>

      {isLoading && <LoadingState label="Carregando entregas..." />}
      {isError && <p className="text-destructive text-sm">{error.message}</p>}

      {data && (
        <div className="space-y-12">
          {data.itemsByDay.map((itemByDay, index) => {
            return (
              <div key={index} className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  {formatDayLabel(new Date(itemByDay.date))} - {itemByDay.itemCount} {itemByDay.itemCount === 1 ? "item" : "itens"}
                </p>
                {itemByDay.groups.length === 0 ? (
                  <Item variant="outline" className="text-muted-foreground">
                    Nenhuma entrega para este dia.
                  </Item>
                ) : (
                  <ItemGroup>
                    {itemByDay.groups.map((group) => {
                      const allDelivered = group.items.every(i => i.isDelivered);
                      return (
                        <Item
                          key={group.key}
                          variant="outline"
                          className="items-start"
                          render={
                            <Link to="/app/orders/$orderId" params={{ orderId: group.order.id }} />
                          }
                        >
                          <ItemMedia>
                            {timeFormatter.format(new Date(group.deliveredAt))}
                          </ItemMedia>
                          <ItemContent>
                            {group.items.map((item) => (
                              <div key={item.id}>
                                <ItemTitle>
                                  <span className="text-primary font-bold">{item.quantity}x</span>
                                  {item.description}
                                </ItemTitle>
                                {item.note && (
                                  <p className="text-sm text-muted-foreground italic">
                                    {item.note}
                                  </p>
                                )}
                              </div>
                            ))}
                            {group.order.customer && (
                              <p className="text-sm text-muted-foreground">
                                {group.order.customer.name}
                              </p>
                            )}
                          </ItemContent>
                          <ItemActions>
                            {allDelivered ? (
                              <Badge className="bg-green-500/15 text-green-700 border-green-200">
                                Entregue
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-400/20 text-amber-700 border-amber-300">
                                A entregar
                              </Badge>
                            )}
                            {group.order.isPaid ? (
                              <Badge className="bg-green-500/15 text-green-700 border-green-200">
                                Pago
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-400/20 text-amber-700 border-amber-300">
                                Pagamento pendente
                              </Badge>
                            )}
                          </ItemActions>
                        </Item>
                      );
                    })}
                  </ItemGroup>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
