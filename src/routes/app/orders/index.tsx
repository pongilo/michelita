import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/contexts/auth-context";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useListOrders } from "@/hooks/tanstack/order/use-list-orders";
import { formatDayLabel } from "@/lib/utils/formatter";
import { Button } from "@/components/ui/button";
import { OrderItem } from "@/components/order-item";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AppTitle } from "@/components/app-title";

function getDayPeriod(offset: number) {
  const now = new Date();
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + offset));
  return date.toISOString().slice(0, 10);
}

export const Route = createFileRoute("/app/orders/")({
  component: OrderPage,
});

function OrderPage() {
  const { organization } = useAuth();
  const [dayOffset, setDayOffset] = useState(0);
  const referenceDate = getDayPeriod(dayOffset);

  const { data, isLoading, isError, error } = useListOrders({
    organizationId: organization!.id,
    referenceDate,
  });

  const inProgressGroups = data?.groups.filter((g) => !g.items.every((i) => i.isDelivered)) ?? [];
  const finishedGroups = data?.groups.filter((g) => g.items.every((i) => i.isDelivered)) ?? [];

  return (
    <main className="bg-muted min-h-screen">
      <div className="mx-auto w-full max-w-6xl space-y-4 py-5">
        <header className="space-y-4 px-5">
          <AppTitle>Agenda de pedidos</AppTitle>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setDayOffset((o) => o - 1)}
              aria-label="Dia anterior"
              variant="ghost"
              size="icon"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm font-medium capitalize text-center text-nowrap">
              {formatDayLabel(new Date(referenceDate + "T00:00:00Z"))}
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

        {isLoading && (
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
