import { Fragment, useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useQueryState } from "nuqs";
import { useDebounce } from "@/hooks/use-debounce";
import { useGetCustomers } from "@/hooks/tanstack/customer/use-get-customers";
import { useCreateCustomer } from "@/hooks/tanstack/customer/use-create-customer";
import { customerFormSchema, type CustomerFormValues } from "@/components/customer-form-modal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemSeparator, ItemTitle } from "@/components/ui/item";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

type CustomerListContentProps = {
  organizationId: string;
  onClose: () => void;
};

export function CustomerListContent({ organizationId, onClose }: CustomerListContentProps) {
  const [search, setSearch] = useQueryState("q", { defaultValue: "" });
  const [, setCustomerId] = useQueryState("customerId");
  const [, setCustomerName] = useQueryState("customerName");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<"list" | "create">("list");

  function handleClose() {
    setTab("list");
    onClose();
  }

  const { data, isLoading, isFetching, isPlaceholderData } = useGetCustomers({
    organizationId,
    search: debouncedSearch || undefined,
    page,
    pageSize: 20,
  });

  const [loadedCustomers, setLoadedCustomers] = useState<NonNullable<typeof data>["customers"]>([]);

  useEffect(() => {
    setPage(1);
    setLoadedCustomers([]);
  }, [debouncedSearch]);

  useEffect(() => {
    if (!data || isPlaceholderData) return;
    setLoadedCustomers(prev => {
      if (page === 1) return data.customers;
      const existingIds = new Set(prev.map(c => c.id));
      return [...prev, ...data.customers.filter(c => !existingIds.has(c.id))];
    });
  }, [data, isPlaceholderData, page]);

  const hasMore = loadedCustomers.length < (data?.total ?? 0);
  const isLoadingMore = isFetching && loadedCustomers.length > 0;
  const { mutateAsync: createCustomer, isPending: isCreating } = useCreateCustomer();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: { name: "", phone: "", address: "", note: "" },
  });

  async function onCreateCustomer(values: CustomerFormValues) {
    const newCustomer = await createCustomer({ organizationId, ...values });
    setCustomerId(newCustomer.id);
    setCustomerName(newCustomer.name);
    reset();
    handleClose();
  }

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as "list" | "create")} className="px-5 max-sm:pt-5">
      <TabsList className="w-full mb-3">
        <TabsTrigger value="list" className="flex-1">Clientes</TabsTrigger>
        <TabsTrigger value="create" className="flex-1">Novo cliente</TabsTrigger>
      </TabsList>
      <TabsContent value="list" className="space-y-4">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nome, telefone ou endereço" />
        {isLoading || (isFetching && loadedCustomers.length === 0) ? (
          <LoadingState label="Carregando clientes..." />
        ) : loadedCustomers.length === 0 ? (
          <EmptyState compact>
            <EmptyState.Icon>🔍</EmptyState.Icon>
            <EmptyState.Title>
              {search ? `Nenhum resultado para "${search}"` : "Nenhum cliente encontrado"}
            </EmptyState.Title>
          </EmptyState>
        ) : (
          <ItemGroup>
            {loadedCustomers.map((customer) => (
              <Fragment key={customer.id}>
                <Item size="xs">
                  <ItemContent>
                    <ItemTitle>{customer.name}</ItemTitle>
                    {customer.phone && (
                      <ItemDescription>{customer.phone}</ItemDescription>
                    )}
                    {customer.address && (
                      <ItemDescription>{customer.address}</ItemDescription>
                    )}
                  </ItemContent>
                  <ItemActions>
                    <Button variant="outline" size="sm" onClick={() => {
                      setCustomerId(customer.id);
                      setCustomerName(customer.name);
                      handleClose();
                    }}>
                      Selecionar
                    </Button>
                  </ItemActions>
                </Item>
                <ItemSeparator />
              </Fragment>
            ))}
          </ItemGroup>
        )}
        {hasMore && (
          <div className="py-2 flex justify-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? "Carregando..." : "Carregar mais"}
            </Button>
          </div>
        )}
      </TabsContent>

      <TabsContent value="create">
        <form onSubmit={handleSubmit(onCreateCustomer)} className="space-y-3">
          <FieldGroup>
            <Field>
              <FieldLabel>Nome</FieldLabel>
              <Input type="text" placeholder="Nome" {...register("name")} />
              <FieldError>{errors.name?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel>Telefone</FieldLabel>
              <Input type="text" placeholder="Telefone (opcional)" {...register("phone")} />
              <FieldError>{errors.phone?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel>Endereço</FieldLabel>
              <textarea
                placeholder="Endereço (opcional)"
                className="w-full rounded-2xl border border-input bg-input/30 px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
                rows={3}
                {...register("address")}
              />
              <FieldError>{errors.address?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel>Observação</FieldLabel>
              <textarea
                placeholder="Observação (opcional)"
                className="w-full rounded-2xl border border-input bg-input/30 px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
                rows={3}
                {...register("note")}
              />
              <FieldError>{errors.note?.message}</FieldError>
            </Field>
          </FieldGroup>

          <div className="flex justify-end gap-2 sticky bottom-0">
            <Button type="button" variant="ghost" onClick={() => { reset(); setTab("list"); }}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? "Salvando..." : "Salvar cliente"}
            </Button>
          </div>
        </form>
      </TabsContent>
    </Tabs>
  );
}

type CustomerListModalProps = {
  organizationId: string;
};

export function CustomerListModal({ organizationId }: CustomerListModalProps) {
  const [modal, setModal] = useQueryState("modal");
  const [, setSearch] = useQueryState("q");
  const isOpen = modal === "customer";

  function onClose() {
    setModal(null);
    setSearch("");
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[80vh] flex flex-col gap-0 p-0">
        <DialogHeader className="mb-0 p-5">
          <DialogTitle>Selecionar cliente</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1">
          <CustomerListContent organizationId={organizationId} onClose={onClose} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
