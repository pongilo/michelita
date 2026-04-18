import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/contexts/auth-context";
import { useState } from "react";
import { ChevronLeft, ChevronRight, MapPinIcon, StickyNoteIcon, User2Icon } from "lucide-react";
import { useListOrders } from "@/hooks/tanstack/order/use-list-orders";
import { timeFormatter, shortDateFormatter, currencyFormatter } from "@/lib/utils/formatter";
import { LoadingState } from "@/components/ui/loading-state";
import { Badge } from "@/components/ui/badge";
import { Item } from "@/components/ui/item";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

function getDayPeriod(offset: number) {
  const now = new Date();
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + offset));
  return date.toISOString().slice(0, 10);
}

export const Route = createFileRoute("/app/orders/")({
  component: DeliveriesPage,
});

function DeliveriesPage() {
  const { organization } = useAuth();
  const [dayOffset, setDayOffset] = useState(0);
  const [activeTab, setActiveTab] = useState<"em-andamento" | "finalizados">("em-andamento");

  const referenceDate = getDayPeriod(dayOffset);
  const isToday = dayOffset === 0;
  const isTomorrow = dayOffset === 1;

  const { data, isLoading, isError, error } = useListOrders({
    organizationId: organization!.id,
    referenceDate,
  });

  const allItems = data?.groups.flatMap(g => g.items) ?? [];
  const totalItems = data?.itemCount ?? 0;
  const deliveredCount = allItems.filter(i => i.isDelivered).length;

  const inProgressGroups = data?.groups.filter(g => !g.items.every(i => i.isDelivered)) ?? [];
  const finishedGroups = data?.groups.filter(g => g.items.every(i => i.isDelivered)) ?? [];
  const visibleGroups = activeTab === "em-andamento" ? inProgressGroups : finishedGroups;

  const dayLabel = shortDateFormatter.format(new Date(referenceDate + "T00:00:00Z"));

  return (
    <main className="bg-muted min-h-screen">
      <div className="mx-auto w-full max-w-6xl p-5 space-y-4">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-heading">
            Pedidos{` `}
            {totalItems > 0 && (
              <span className="text-sm text-muted-foreground">({deliveredCount} de {totalItems})</span>
            )}
          </h1>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setDayOffset((o) => o - 1)}
              aria-label="Dia anterior"
              variant="ghost"
              size="icon"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm font-medium capitalize text-center">
              {isToday ? "Hoje" : isTomorrow ? "Amanhã" : dayLabel}
            </span>
            <Button
              onClick={() => setDayOffset((o) => o + 1)}
              aria-label="Próximo dia"
              variant="ghost"
              size="icon"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </header>

        {isLoading && <LoadingState label="Carregando entregas..." />}
        {isError && <p className="text-destructive text-sm">{error.message}</p>}

        {data && (
          <div className="space-y-4">
            <div className="flex">
              <button
                onClick={() => setActiveTab("em-andamento")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "em-andamento" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                Em andamento
                {inProgressGroups.length > 0 && (
                  <span className="ml-1.5 text-xs bg-muted rounded-full px-1.5 py-0.5">{inProgressGroups.length}</span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("finalizados")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "finalizados" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                Finalizados
                {finishedGroups.length > 0 && (
                  <span className="ml-1.5 text-xs bg-muted rounded-full px-1.5 py-0.5">{finishedGroups.length}</span>
                )}
              </button>
            </div>

            {visibleGroups.length === 0 ? (
              <Item variant="outline" className="text-muted-foreground">
                {activeTab === "em-andamento" ? "Nenhuma entrega em andamento para este dia." : "Nenhuma entrega finalizada para este dia."}
              </Item>
            ) : (
              <>
                {visibleGroups.map((group) => {
                  const allDelivered = group.items.every(i => i.isDelivered);
                  const total = group.items.reduce((sum, item) => sum + item.total, 0)

                  return (
                    <Link key={group.key} to="/app/orders/$orderId" params={{ orderId: group.order.id }} className="block rounded-md bg-background shadow p-5 space-y-2 hover:ring hover:ring-primary">
                      <div>
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-muted-foreground uppercase font-medium">
                            {allDelivered ? 'Entregue às ' : 'Entregar às '}
                            {timeFormatter.format(new Date(group.deliveredAt))} • {currencyFormatter.format(total)}
                          </p>
                          {group.order.isPaid ? (
                            <Badge className="bg-green-500/15 text-green-700 border-green-200">
                              Pago
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-400/20 text-amber-700 border-amber-300">
                              Pendente
                            </Badge>
                          )}
                        </div>
                        {group.order.note && (
                          <p className="text-sm text-muted-foreground italic">
                            Obs.: {group.order.note}
                          </p>
                        )}
                      </div>
                      {group.items.map((item) => (
                        <div key={item.id}>
                          <p className="text-base text-foreground">
                            {item.quantity > 1 && (
                              <span className="text-primary font-bold">{item.quantity}x </span>
                            )}
                            {item.description}
                          </p>
                          {item.note && (
                            <p className="text-base text-muted-foreground italic">
                              Obs.: {item.note}
                            </p>
                          )}
                        </div>
                      ))}
                      <Separator />
                      <div className="space-y-1">
                        {group.order.customer?.name && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <User2Icon className="size-4" />
                            {group.order.customer?.name}
                          </p>
                        )}
                        {group.order.customer?.address && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPinIcon className="size-4" />
                            {group.order.customer?.address}
                          </p>
                        )}
                        {group.order.customer?.note && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <StickyNoteIcon className="size-4" />
                            {group.order.customer?.note}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
