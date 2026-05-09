import { Fragment, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFormContext } from "react-hook-form";
import { useQueryState } from "nuqs";
import type { CreateOrderInput } from "@/lib/api/order/create-order";
import { normalize } from "@/lib/utils";
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
  const [tab, setTab] = useState<"list" | "create">("list");
  const { setValue } = useFormContext<CreateOrderInput>();

  function handleClose() {
    setTab("list");
    onClose();
  }

  const { data, isLoading } = useGetCustomers({ organizationId });
  const customers = data?.customers ?? [];
  const { mutateAsync: createCustomer, isPending: isCreating } = useCreateCustomer();

  const filteredCustomers = customers.filter((c) => {
    const q = normalize(search);
    return (
      normalize(c.name).includes(q) ||
      (c.phone ?? "").toLowerCase().includes(q) ||
      normalize(c.address ?? "").includes(q)
    );
  });

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
    setValue("customerId", newCustomer.id, { shouldValidate: true });
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
        {isLoading ? (
          <LoadingState label="Carregando clientes..." />
        ) : filteredCustomers.length === 0 ? (
          <EmptyState compact>
            <EmptyState.Icon>🔍</EmptyState.Icon>
            <EmptyState.Title>
              {search ? `Nenhum resultado para "${search}"` : "Nenhum cliente encontrado"}
            </EmptyState.Title>
          </EmptyState>
        ) : (
          <ItemGroup>
            {filteredCustomers.map((customer) => (
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
                      setValue("customerId", customer.id, { shouldValidate: true });
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
