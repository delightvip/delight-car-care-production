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
      raw_materials: {
        Row: {
          code: string
          created_at: string | null
          id: number
          importance: number | null
          min_stock: number
          name: string
          quantity: number
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
          unit?: string
          unit_cost?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      returns: {
        Row: {
          amount: number
          created_at: string | null
          date: string
          id: string
          invoice_id: string | null
          notes: string | null
          return_type: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          date?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          return_type: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          date?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
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
        ]
      }
      semi_finished_ingredients: {
        Row: {
          created_at: string | null
          id: number
          percentage: number
          raw_material_id: number
          semi_finished_id: number
        }
        Insert: {
          created_at?: string | null
          id?: number
          percentage: number
          raw_material_id: number
          semi_finished_id: number
        }
        Update: {
          created_at?: string | null
          id?: number
          percentage?: number
          raw_material_id?: number
          semi_finished_id?: number
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
      get_customer_payment_by_receipt: {
        Args: {
          p_receipt_id: string
        }
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
        Args: {
          p_customer_id: string
        }
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
        Args: {
          p_customer_id: string
        }
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
