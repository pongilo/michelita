import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ListOrderedIcon, PackageIcon, UsersRoundIcon } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useGetDashboardSummary } from "@/hooks/tanstack/dashboard/use-get-dashboard-summary";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { AppTitle } from "@/components/app-title";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/")({
  component: HomePage,
});

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function HomePage() {
  const { organization } = useAuth();
  // "today" is only ever set on the client, so it reflects the browser's local
  // date instead of the server's clock/timezone during SSR.
  const [today, setToday] = useState<string | null>(null);

  useEffect(() => {
    setToday(toDateKey(new Date()));
  }, []);

  const { data, isLoading, isError, error } = useGetDashboardSummary({
    organizationId: organization!.id,
    date: today ?? "",
    enabled: !!today,
  });

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 pb-24 md:pb-5">
      <header className="px-5 pt-5">
        <AppTitle>Início</AppTitle>
      </header>

      <div className="px-5">
        {(isLoading || !today) && <LoadingState label="Carregando painel..." />}
        {isError && <p className="text-destructive text-sm">{error.message}</p>}

        {data && (
          <div className="grid gap-4 md:grid-cols-2 md:grid-rows-2">
            <Card className="md:row-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ListOrderedIcon className="size-5" />
                  Pedidos
                </CardTitle>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col justify-between gap-6">
                <div className="space-y-6">
                  <div>
                    <p className="text-4xl font-heading">{data.ordersDeliveredToday}</p>
                    <p className="text-sm text-muted-foreground">
                      {data.ordersDeliveredToday === 1 ? "pedido entregue hoje" : "pedidos entregues hoje"}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Mais pedidos no mês
                    </p>
                    {data.topProducts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum pedido este mês ainda.</p>
                    ) : (
                      <ol className="space-y-2">
                        {data.topProducts.map((product, index) => (
                          <li key={product.description} className="flex items-center gap-3 text-sm">
                            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                              {index + 1}
                            </span>
                            <span className="flex-1 truncate">{product.description}</span>
                            <span className="text-muted-foreground">{product.quantity}x</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                </div>
              </CardContent>

              <CardFooter>
                <Link to="/app/orders" className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
                  Ver pedidos
                </Link>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <UsersRoundIcon className="size-5" />
                  Clientes
                </CardTitle>
              </CardHeader>

              <CardContent>
                <p className="text-4xl font-heading">{data.customersCount}</p>
                <p className="text-sm text-muted-foreground">
                  {data.customersCount === 1 ? "cliente" : "clientes"}
                </p>
              </CardContent>

              <CardFooter>
                <Link to="/app/customers" className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
                  Ver clientes
                </Link>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <PackageIcon className="size-5" />
                  Produtos
                </CardTitle>
              </CardHeader>

              <CardContent>
                <p className="text-4xl font-heading">{data.productsCount}</p>
                <p className="text-sm text-muted-foreground">
                  {data.productsCount === 1 ? "produto" : "produtos"}
                </p>
              </CardContent>

              <CardFooter>
                <Link to="/app/products" className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
                  Ver produtos
                </Link>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
