export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      cash_operations: {
        Row: {
          account_type: string | null
          amount: number
          created_at: string | null
          date: string
          from_account: string | null
          id: string
          notes: string | null
          operation_type: string
          reference: string | null
          to_account: string | null
        }
        Insert: {
          account_type?: string | null
          amount: number
          created_at?: string | null
          date?: string
          from_account?: string | null
          id?: string
          notes?: string | null
          operation_type: string
          reference?: string | null
          to_account?: string | null
        }
        Update: {
          account_type?: string | null
          amount?: number
          created_at?: string | null
          date?: string
          from_account?: string | null
          id?: string
          notes?: string | null
          operation_type?: string
          reference?: string | null
          to_account?: string | null
        }
        Relationships: []
      }
      financial_balance: {
        Row: {
          bank_balance: number
          cash_balance: number
          id: string
          last_updated: string | null
        }
        Insert: {
          bank_balance?: number
          cash_balance?: number
          id?: string
          last_updated?: string | null
        }
        Update: {
          bank_balance?: number
          cash_balance?: number
          id?: string
          last_updated?: string | null
        }
        Relationships: []
      }
      financial_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          type: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          type: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          type?: string
        }
        Relationships: []
      }
      financial_transactions: {
        Row: {
          amount: number
          category_id: string
          created_at: string | null
          date: string
          id: string
          notes: string | null
          payment_method: string
          reference_id: string | null
          reference_type: string | null
          type: string
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string | null
          date?: string
          id?: string
          notes?: string | null
          payment_method: string
          reference_id?: string | null
          reference_type?: string | null
          type: string
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string | null
          date?: string
          id?: string
          notes?: string | null
          payment_method?: string
          reference_id?: string | null
          reference_type?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      finished_product_packaging: {
        Row: {
          created_at: string | null
          finished_product_id: number
          id: number
          packaging_material_id: number
          quantity: number
        }
        Insert: {
          created_at?: string | null
          finished_product_id: number
          id?: number
          packaging_material_id: number
          quantity?: number
        }
        Update: {
          created_at?: string | null
          finished_product_id?: number
          id?: number
          packaging_material_id?: number
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "finished_product_packaging_finished_product_id_fkey"
            columns: ["finished_product_id"]
            isOneToOne: false
            referencedRelation: "finished_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finished_product_packaging_packaging_material_id_fkey"
            columns: ["packaging_material_id"]
            isOneToOne: false
            referencedRelation: "packaging_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      finished_products: {
        Row: {
          code: string
          created_at: string | null
          id: number
          min_stock: number
          name: string
          quantity: number
          sales_price: number | null
          semi_finished_id: number
          semi_finished_quantity: number
          unit: string
          unit_cost: number
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: number
          min_stock?: number
          name: string
          quantity?: number
          sales_price?: number | null
          semi_finished_id: number
          semi_finished_quantity?: number
          unit: string
          unit_cost?: number
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: number
          min_stock?: number
          name?: string
          quantity?: number
          sales_price?: number | null
          semi_finished_id?: number
          semi_finished_quantity?: number
          unit?: string
          unit_cost?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finished_products_semi_finished_id_fkey"
            columns: ["semi_finished_id"]
            isOneToOne: false
            referencedRelation: "semi_finished_products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          balance_after: number
          created_at: string | null
          id: string
          item_id: string
          item_type: string
          movement_type: string
          quantity: number
          reason: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          balance_after: number
          created_at?: string | null
          id?: string
          item_id: string
          item_type: string
          movement_type: string
          quantity: number
          reason?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          balance_after?: number
          created_at?: string | null
          id?: string
          item_id?: string
          item_type?: string
          movement_type?: string
          quantity?: number
          reason?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          created_at: string | null
          id: string
          invoice_id: string | null
          item_id: number | null
          item_name: string
          item_type: string
          quantity: number
          total: number | null
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          invoice_id?: string | null
          item_id?: number | null
          item_name: string
          item_type: string
          quantity: number
          total?: number | null
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          invoice_id?: string | null
          item_id?: number | null
          item_name?: string
          item_type?: string
          quantity?: number
          total?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string | null
          date: string
          id: string
          invoice_type: string
          notes: string | null
          party_id: string | null
          payment_status: string
          status: string
          total_amount: number | null
        }
        Insert: {
          created_at?: string | null
          date?: string
          id?: string
          invoice_type: string
          notes?: string | null
          party_id?: string | null
          payment_status?: string
          status: string
          total_amount?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          invoice_type?: string
          notes?: string | null
          party_id?: string | null
          payment_status?: string
          status?: string
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger: {
        Row: {
          balance_after: number
          created_at: string | null
          credit: number | null
          date: string
          debit: number | null
          description: string | null
          id: string
          party_id: string | null
          transaction_id: string
          transaction_type: string
        }
        Insert: {
          balance_after: number
          created_at?: string | null
          credit?: number | null
          date?: string
          debit?: number | null
          description?: string | null
          id?: string
          party_id?: string | null
          transaction_id: string
          transaction_type: string
        }
        Update: {
          balance_after?: number
          created_at?: string | null
          credit?: number | null
          date?: string
          debit?: number | null
          description?: string | null
          id?: string
          party_id?: string | null
          transaction_id?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      packaging_materials: {
        Row: {
          code: string
          created_at: string | null
          id: number
          importance: number | null
          min_stock: number
          name: string
          quantity: number
          sales_price: number | null
          unit: string
          unit_cost: number
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: number
          importance?: number | null
          min_stock?: number
          name: string
          quantity?: number
          sales_price?: number | null
          unit: string
          unit_cost?: number
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: number
          importance?: number | null
          min_stock?: number
          name?: string
          quantity?: number
          sales_price?: number | null
          unit?: string
          unit_cost?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      packaging_order_materials: {
        Row: {
          created_at: string | null
          id: number
          packaging_material_code: string
          packaging_material_name: string
          packaging_order_id: number
          required_quantity: number
        }
        Insert: {
          created_at?: string | null
          id?: number
          packaging_material_code: string
          packaging_material_name: string
          packaging_order_id: number
          required_quantity: number
        }
        Update: {
          created_at?: string | null
          id?: number
          packaging_material_code?: string
          packaging_material_name?: string
          packaging_order_id?: number
          required_quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "packaging_order_materials_packaging_order_id_fkey"
            columns: ["packaging_order_id"]
            isOneToOne: false
            referencedRelation: "packaging_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      packaging_orders: {
        Row: {
          code: string
          created_at: string | null
          date: string
          id: number
          product_code: string
          product_name: string
          quantity: number
          semi_finished_code: string
          semi_finished_name: string
          semi_finished_quantity: number
          status: string
          total_cost: number
          unit: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          date: string
          id?: number
          product_code: string
          product_name: string
          quantity: number
          semi_finished_code: string
          semi_finished_name: string
          semi_finished_quantity: number
          status: string
          total_cost?: number
          unit: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          date?: string
          id?: number
          product_code?: string
          product_name?: string
          quantity?: number
          semi_finished_code?: string
          semi_finished_name?: string
          semi_finished_quantity?: number
          status?: string
          total_cost?: number
          unit?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      parties: {
        Row: {
          address: string | null
          balance_type: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          opening_balance: number | null
          phone: string | null
          type: string
        }
        Insert: {
          address?: string | null
          balance_type?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          opening_balance?: number | null
          phone?: string | null
          type: string
        }
        Update: {
          address?: string | null
          balance_type?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          opening_balance?: number | null
          phone?: string | null
          type?: string
        }
        Relationships: []
      }
      party_balances: {
        Row: {
          balance: number | null
          id: string
          last_updated: string | null
          party_id: string | null
        }
        Insert: {
          balance?: number | null
          id?: string
          last_updated?: string | null
          party_id?: string | null
        }
        Update: {
          balance?: number | null
          id?: string
          last_updated?: string | null
          party_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "party_balances_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          date: string
          id: string
          method: string
          notes: string | null
          party_id: string | null
          payment_status: string
          payment_type: string
          related_invoice_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          date?: string
          id?: string
          method?: string
          notes?: string | null
          party_id?: string | null
          payment_status?: string
          payment_type: string
          related_invoice_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          date?: string
          id?: string
          method?: string
          notes?: string | null
          party_id?: string | null
          payment_status?: string
          payment_type?: string
          related_invoice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_related_invoice_id_fkey"
            columns: ["related_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      production_order_ingredients: {
        Row: {
          created_at: string | null
          id: number
          production_order_id: number
          raw_material_code: string
          raw_material_name: string
          required_quantity: number
        }
        Insert: {
          created_at?: string | null
          id?: number
          production_order_id: number
          raw_material_code: string
          raw_material_name: string
          required_quantity: number
        }
        Update: {
          created_at?: string | null
          id?: number
          production_order_id?: number
          raw_material_code?: string
          raw_material_name?: string
          required_quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "production_order_ingredients_production_order_id_fkey"
            columns: ["production_order_id"]
            isOneToOne: false
            referencedRelation: "production_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      production_orders: {
        Row: {
          code: string
          created_at: string | null
          date: string
          id: number
          product_code: string
          product_name: string
          quantity: number
          status: string
          total_cost: number
          unit: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          date: string
          id?: number
          product_code: string
          product_name: string
          quantity: number
          status: string
          total_cost?: number
          unit: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          date?: string
          id?: number
          product_code?: string
          product_name?: string
          quantity?: number
          status?: string
          total_cost?: number
          unit?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profits: {
        Row: {
          created_at: string
          id: string
          invoice_date: string
          invoice_id: string
          party_id: string
          profit_amount: number
          profit_percentage: number
          total_cost: number
          total_sales: number
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_date: string
          invoice_id: string
          party_id: string
          profit_amount?: number
          profit_percentage?: number
          total_cost?: number
          total_sales?: number
        }
        Update: {
          created_at?: string
          id?: string
          invoice_date?: string
          invoice_id?: string
          party_id?: string
          profit_amount?: number
          profit_percentage?: number
          total_cost?: number
          total_sales?: number
        }
        Relationships: [
          {
            foreignKeyName: "profits_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profits_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_materials: {
        Row: {
          code: string
          created_at: string | null
          id: number
          importance: number | null
          min_stock: number
          name: string
          quantity: number
          sales_price: number | null
          unit: string
          unit_cost: number
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: number
          importance?: number | null
          min_stock?: number
          name: string
          quantity?: number
          sales_price?: number | null
          unit: string
          unit_cost?: number
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: number
          importance?: number | null
          min_stock?: number
          name?: string
          quantity?: number
          sales_price?: number | null
          unit?: string
          unit_cost?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      return_items: {
        Row: {
          created_at: string | null
          id: string
          item_id: number
          item_name: string
          item_type: string
          quantity: number
          return_id: string
          total: number | null
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_id: number
          item_name: string
          item_type: string
          quantity: number
          return_id: string
          total?: number | null
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          item_id?: number
          item_name?: string
          item_type?: string
          quantity?: number
          return_id?: string
          total?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "returns"
            referencedColumns: ["id"]
          },
        ]
      }
      returns: {
        Row: {
          amount: number
          created_at: string | null
          date: string
          id: string
          invoice_id: string | null
          notes: string | null
          party_id: string | null
          payment_status: string
          return_type: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          date?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          party_id?: string | null
          payment_status?: string
          return_type: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          date?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          party_id?: string | null
          payment_status?: string
          return_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "returns_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      semi_finished_ingredients: {
        Row: {
          created_at: string | null
          id: number
          ingredient_type: string
          percentage: number
          raw_material_id: number
          semi_finished_id: number
          semi_finished_product_id: number | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          ingredient_type?: string
          percentage: number
          raw_material_id: number
          semi_finished_id: number
          semi_finished_product_id?: number | null
        }
        Update: {
          created_at?: string | null
          id?: number
          ingredient_type?: string
          percentage?: number
          raw_material_id?: number
          semi_finished_id?: number
          semi_finished_product_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "semi_finished_ingredients_raw_material_id_fkey"
            columns: ["raw_material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "semi_finished_ingredients_semi_finished_id_fkey"
            columns: ["semi_finished_id"]
            isOneToOne: false
            referencedRelation: "semi_finished_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "semi_finished_ingredients_semi_finished_product_id_fkey"
            columns: ["semi_finished_product_id"]
            isOneToOne: false
            referencedRelation: "semi_finished_products"
            referencedColumns: ["id"]
          },
        ]
      }
      semi_finished_products: {
        Row: {
          code: string
          created_at: string | null
          id: number
          min_stock: number
          name: string
          quantity: number
          sales_price: number | null
          unit: string
          unit_cost: number
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: number
          min_stock?: number
          name: string
          quantity?: number
          sales_price?: number | null
          unit: string
          unit_cost?: number
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: number
          min_stock?: number
          name?: string
          quantity?: number
          sales_price?: number | null
          unit?: string
          unit_cost?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: number
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          name: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_customer_payment: {
        Args: {
          p_customer_id: string
          p_receipt_id: string
          p_amount: number
          p_payment_date: string
          p_notes?: string
        }
        Returns: undefined
      }
      coalesce_numeric: {
        Args: { p1: string }
        Returns: number
      }
      delete_all_from_table: {
        Args: { table_name: string }
        Returns: undefined
      }
      disable_foreign_key_constraints: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      enable_foreign_key_constraints: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_all_low_stock_items: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: number
          code: string
          name: string
          quantity: number
          min_stock: number
          unit: string
          unit_cost: number
          importance: number
          type: string
          type_name: string
        }[]
      }
      get_customer_payment_by_receipt: {
        Args: { p_receipt_id: string }
        Returns: {
          id: string
          customer_id: string
          receipt_id: string
          amount: number
          payment_date: string
          notes: string
          created_at: string
        }[]
      }
      get_customer_payments: {
        Args: { p_customer_id: string }
        Returns: {
          id: string
          customer_id: string
          receipt_id: string
          amount: number
          payment_date: string
          notes: string
          created_at: string
        }[]
      }
      get_customer_transactions: {
        Args: { p_customer_id: string }
        Returns: {
          id: string
          customer_id: string
          transaction_date: string
          type: string
          description: string
          reference: string
          debit: number
          credit: number
          balance: number
          created_at: string
        }[]
      }
      get_inventory_movements_by_item: {
        Args: { p_item_id: string; p_item_type: string }
        Returns: {
          id: string
          item_id: string
          item_type: string
          movement_type: string
          quantity: number
          balance_after: number
          reason: string
          created_at: string
          user_name: string
        }[]
      }
      get_inventory_movements_by_time: {
        Args: {
          p_item_id: string
          p_item_type: string
          p_period?: string
          p_start_date?: string
          p_end_date?: string
        }
        Returns: {
          period: string
          in_quantity: number
          out_quantity: number
          balance: number
        }[]
      }
      get_inventory_summary_stats: {
        Args: { p_item_id: string; p_item_type: string }
        Returns: {
          total_movements: number
          total_in: number
          total_out: number
          adjustments: number
          current_quantity: number
        }[]
      }
      get_inventory_usage_stats: {
        Args: {
          p_item_id: string
          p_item_type: string
          p_period?: string
          p_limit?: number
        }
        Returns: {
          category: string
          usage_amount: number
        }[]
      }
      reset_sequence: {
        Args: { table_name: string; seq_value: number }
        Returns: undefined
      }
      table_exists: {
        Args: { table_name: string }
        Returns: boolean
      }
      truncate_table: {
        Args:
          | { table_name: string; cascade?: boolean }
          | { cascade: boolean; table_name: string }
        Returns: undefined
      }
    }
    Enums: {
      account_category:
        | "CASH"
        | "BANK"
        | "RECEIVABLE"
        | "PAYABLE"
        | "INVENTORY"
        | "FIXED_ASSET"
        | "RENT"
        | "SALARY"
        | "MAINTENANCE"
        | "OTHER"
      account_type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE"
      expense_type: "FIXED" | "VARIABLE"
      measurement_unit: "KG" | "GRAM" | "LITER" | "ML" | "PIECE"
      payment_method: "CASH" | "BANK_TRANSFER" | "CHECK" | "CREDIT"
      product_type: "RAW_MATERIAL" | "PACKAGING" | "SEMI_FINISHED" | "FINISHED"
      transaction_type: "INCOME" | "EXPENSE" | "TRANSFER"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_category: [
        "CASH",
        "BANK",
        "RECEIVABLE",
        "PAYABLE",
        "INVENTORY",
        "FIXED_ASSET",
        "RENT",
        "SALARY",
        "MAINTENANCE",
        "OTHER",
      ],
      account_type: ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"],
      expense_type: ["FIXED", "VARIABLE"],
      measurement_unit: ["KG", "GRAM", "LITER", "ML", "PIECE"],
      payment_method: ["CASH", "BANK_TRANSFER", "CHECK", "CREDIT"],
      product_type: ["RAW_MATERIAL", "PACKAGING", "SEMI_FINISHED", "FINISHED"],
      transaction_type: ["INCOME", "EXPENSE", "TRANSFER"],
    },
  },
} as const
