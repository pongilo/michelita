export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      customer: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          note: string | null;
          organization_id: string;
          phone: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          note?: string | null;
          organization_id: string;
          phone?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          note?: string | null;
          organization_id?: string;
          phone?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "customer_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organization";
            referencedColumns: ["id"];
          },
        ];
      };
      order: {
        Row: {
          customer_id: string;
          delivery_address: string | null;
          delivery_datetime: string | null;
          delivery_fee: number;
          id: string;
          organization_id: string;
          status: "pending" | "confirmed" | "preparing" | "ready" | "delivered" | "cancelled";
          subtotal: number;
          total: number;
          type: "sale" | "order";
        };
        Insert: {
          customer_id: string;
          delivery_address?: string | null;
          delivery_datetime?: string | null;
          delivery_fee?: number;
          id?: string;
          organization_id: string;
          status: "pending" | "confirmed" | "preparing" | "ready" | "delivered" | "cancelled";
          subtotal?: number;
          total?: number;
          type: "sale" | "order";
        };
        Update: {
          customer_id?: string;
          delivery_address?: string | null;
          delivery_datetime?: string | null;
          delivery_fee?: number;
          id?: string;
          organization_id?: string;
          status?: "pending" | "confirmed" | "preparing" | "ready" | "delivered" | "cancelled";
          subtotal?: number;
          total?: number;
          type?: "sale" | "order";
        };
        Relationships: [
          {
            foreignKeyName: "order_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customer";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organization";
            referencedColumns: ["id"];
          },
        ];
      };
      order_item: {
        Row: {
          delivery_type: "pickup" | "delivery";
          id: string;
          note: string | null;
          order_id: string;
          product_id: string;
          product_name: string;
          quantity: number;
          total: number;
          unit_price: number;
        };
        Insert: {
          delivery_type: "pickup" | "delivery";
          id?: string;
          note?: string | null;
          order_id: string;
          product_id: string;
          product_name: string;
          quantity: number;
          total: number;
          unit_price: number;
        };
        Update: {
          delivery_type?: "pickup" | "delivery";
          id?: string;
          note?: string | null;
          order_id?: string;
          product_id?: string;
          product_name?: string;
          quantity?: number;
          total?: number;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_item_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "order";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_item_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "product";
            referencedColumns: ["id"];
          },
        ];
      };
      order_item_customization: {
        Row: {
          id: string;
          name: string;
          order_item_id: string;
          value: string;
        };
        Insert: {
          id?: string;
          name: string;
          order_item_id: string;
          value: string;
        };
        Update: {
          id?: string;
          name?: string;
          order_item_id?: string;
          value?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_item_customization_order_item_id_fkey";
            columns: ["order_item_id"];
            isOneToOne: false;
            referencedRelation: "order_item";
            referencedColumns: ["id"];
          },
        ];
      };
      order_payments: {
        Row: {
          amount: number;
          created_at: string;
          id: string;
          method: "pix" | "cash" | "credit_card" | "debit_card" | "transfer";
          note: string | null;
          order_id: string;
          paid_at: string | null;
          status: "pending" | "paid" | "failed" | "refunded";
        };
        Insert: {
          amount: number;
          created_at?: string;
          id?: string;
          method: "pix" | "cash" | "credit_card" | "debit_card" | "transfer";
          note?: string | null;
          order_id: string;
          paid_at?: string | null;
          status: "pending" | "paid" | "failed" | "refunded";
        };
        Update: {
          amount?: number;
          created_at?: string;
          id?: string;
          method?: "pix" | "cash" | "credit_card" | "debit_card" | "transfer";
          note?: string | null;
          order_id?: string;
          paid_at?: string | null;
          status?: "pending" | "paid" | "failed" | "refunded";
        };
        Relationships: [
          {
            foreignKeyName: "order_payments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "order";
            referencedColumns: ["id"];
          },
        ];
      };
      product: {
        Row: {
          active: boolean;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          organization_id: string;
          price: number;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          organization_id: string;
          price: number;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          organization_id?: string;
          price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "product_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organization";
            referencedColumns: ["id"];
          },
        ];
      };
      organization: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          owner_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          owner_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          owner_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
