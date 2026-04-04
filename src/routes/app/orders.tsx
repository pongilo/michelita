import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useGetOrders } from "@/hooks/tanstack/order/use-get-orders";
import { currencyFormatter, timeFormatter, shortDateFormatter, formatFullDate } from "@/lib/utils/formatter";
import { OrderAction } from "@/components/order-action";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Item, ItemGroup, ItemContent, ItemTitle, ItemDescription, ItemActions } from "@/components/ui/item";
import { LoadingState } from "@/components/ui/loading-state";

const PAYMENT_FILTER = [
  { value: "all", label: "Todos" },
  { value: "paid", label: "Pagos" },
  { value: "pending", label: "Pendentes" },
];

type QuickFilter = "today" | "week" | "month" | "custom";

const QUICK_FILTERS: { key: QuickFilter; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "week", label: "Esta semana" },
  { key: "month", label: "Este mês" },
  { key: "custom", label: "Escolher data" },
];

function currentMonthInputValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 7);
}

function quickFilterToPeriod(filter: QuickFilter, customDate: string, customMonth: string): { period: OrdersPeriod; referenceDate: string } {
  switch (filter) {
    case "today":
      return { period: "daily", referenceDate: currentDateInputValue() };
    case "week":
      return { period: "weekly", referenceDate: currentDateInputValue() };
    case "month":
      return { period: "monthly", referenceDate: `${customMonth}-01` };
    case "custom":
      return { period: "daily", referenceDate: customDate };
  }
}

function formatDelivery(deliveredAt: Date | string | null, orderedAt: Date | string) {
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

type OrdersPeriod = "daily" | "weekly" | "monthly";

function currentDateInputValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function parseOrdersReferenceDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function getOrdersPeriodBounds(period: OrdersPeriod, baseDate: Date) {
  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);

  if (period === "daily") {
    end.setDate(end.getDate() + 1);
    return {
      start,
      end,
    };
  }

  if (period === "weekly") {
    const weekDay = start.getDay();
    const diffToMonday = (weekDay + 6) % 7;
    start.setDate(start.getDate() - diffToMonday);

    end.setTime(start.getTime());
    end.setDate(end.getDate() + 7);

    return {
      start,
      end,
    };
  }

  start.setDate(1);
  end.setTime(start.getTime());
  end.setMonth(end.getMonth() + 1);

  return {
    start,
    end,
  };
}

export const Route = createFileRoute("/app/orders")({
  component: OrdersPage,
});

function OrdersPage() {
  const { organization } = Route.useRouteContext();
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("today");
  const [customDate, setCustomDate] = useState<string>(currentDateInputValue);
  const [customMonth, setCustomMonth] = useState<string>(currentMonthInputValue);
  const [paymentFilter, setPaymentFilter] = useState<"all" | "paid" | "pending">("all");

  const { period, referenceDate } = quickFilterToPeriod(quickFilter, customDate, customMonth);
  const { start, end } = getOrdersPeriodBounds(period, parseOrdersReferenceDate(referenceDate));
  const rangeEnd = new Date(end.getTime() - 1);

  const isPaidFilter = paymentFilter === "all" ? undefined : paymentFilter === "paid";
  const { data: orders = [], isLoading, isError, error } = useGetOrders({
    organizationId: organization.id,
    period,
    referenceDate,
    isPaid: isPaidFilter,
  });

  return (
    <main className="mx-auto w-full max-w-6xl p-5">
      <header className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-baseline gap-2">
            <h1 className="text-2xl font-heading">Pedidos</h1>
            <p className="text-sm text-muted-foreground">
              ({shortDateFormatter.format(start)} até {shortDateFormatter.format(rangeEnd)})
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap mb-5">
          {QUICK_FILTERS.map(({ key, label }) => (
            <Button
              key={key}
              onClick={() => setQuickFilter(key)}
              variant={quickFilter === key ? "default" : "outline"}
            >
              {label}
            </Button>
          ))}
          {quickFilter === "custom" && (
            <Input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="w-36"
            />
          )}
          {quickFilter === "month" && (
            <Input
              type="month"
              value={customMonth}
              onChange={(e) => setCustomMonth(e.target.value)}
            />
          )}
          <Select value={paymentFilter} onValueChange={(v) => v && setPaymentFilter(v)}>
            <SelectTrigger>
              <SelectValue>{PAYMENT_FILTER.find((o) => o.value === paymentFilter)?.label}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_FILTER.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>


      {isLoading && <LoadingState label="Carregando pedidos..." />}
      {isError ? <p className="text-error">{error.message}</p> : null}

      {!isLoading && !isError && orders.length === 0 ? (
        <p className="text-sm opacity-70">Nenhum pedido encontrado no periodo.</p>
      ) : null}

      {!isLoading && !isError && orders.length > 0 ? (
        <ItemGroup>
          {orders.map((order) => (
            <Item key={order.id} variant="outline" className="flex-wrap items-start">
              <ItemContent>
                <Link to="/app/order/$orderId" params={{ orderId: order.id }}>
                  <ItemTitle>
                    {order.customer?.name ?? "Sem cliente"}
                  </ItemTitle>
                  <ItemDescription>{formatFullDate(new Date(order.orderedAt))}</ItemDescription>
                  <ItemDescription>{order.transactionTotal} {order.transactionTotal === 1 ? "transação" : "transações"}</ItemDescription>
                </Link>
              </ItemContent>
              <ItemActions>
                <Badge className={order.isPaid ? "bg-blue-500/15 text-blue-700 border-blue-200" : "bg-amber-400/20 text-amber-700 border-amber-300"}>
                  {order.isPaid ? "Pago" : "Pendente"}
                </Badge>
                <OrderAction orderId={order.id} organizationId={organization.id}>
                  <OrderAction.Trigger />
                  <OrderAction.Content>
                    {order.isPaid ? (
                      <OrderAction.UnmarkAsPaid />
                    ) : (
                      <OrderAction.MarkAsPaid />
                    )}
                  </OrderAction.Content>
                </OrderAction>
              </ItemActions>

              <ul className="basis-full space-y-2 border-t border-border pt-3">
                {order.item.map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-2">
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
                      {item.note && <p className="mt-0.5 text-xs opacity-50">{item.note}</p>}
                    </div>
                    <span className="mt-0.5 shrink-0 text-xs opacity-60">{currencyFormatter.format(item.total)}</span>
                  </li>
                ))}
              </ul>

              <div className="basis-full flex flex-col gap-1 border-t border-border pt-2">
                {order.note && <p className="text-xs italic opacity-50">{order.note}</p>}
                {(order.shippingFee || order.discount) ? (
                  <div className="flex flex-col gap-0.5 text-xs opacity-50">
                    {order.shippingFee ? (
                      <div className="flex justify-between">
                        <span>+ Frete</span>
                        <span>{currencyFormatter.format(order.shippingFee)}</span>
                      </div>
                    ) : null}
                    {order.discount ? (
                      <div className="flex justify-between">
                        <span>− Desconto</span>
                        <span>{currencyFormatter.format(order.discount)}</span>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <div className="flex items-center justify-end">
                  <span className="text-sm font-bold">{currencyFormatter.format(order.total)}</span>
                </div>
              </div>
            </Item>
          ))}
        </ItemGroup>
      ) : null}
    </main>
  );
}
