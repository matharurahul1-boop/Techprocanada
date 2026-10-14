export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      tool_types: {
        Row: { id: number; name: string; created_at: string | null }
        Insert: { id?: number; name: string; created_at?: string | null }
        Update: { id?: number; name?: string; created_at?: string | null }
        Relationships: []
      }
      brands: {
        Row: { id: number; name: string; created_at: string | null }
        Insert: { id?: number; name: string; created_at?: string | null }
        Update: { id?: number; name?: string; created_at?: string | null }
        Relationships: []
      }
      companies: {
        Row: {
          id: number
          name: string
          priority: string | null
          address: string | null
          contact_number: string | null
          created_at: string | null
        }
        Insert: {
          id?: number
          name: string
          priority?: string | null
          address?: string | null
          contact_number?: string | null
          created_at?: string | null
        }
        Update: {
          id?: number
          name?: string
          priority?: string | null
          address?: string | null
          contact_number?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      machines: {
        Row: { id: number; name: string; created_at: string | null }
        Insert: { id?: number; name: string; created_at?: string | null }
        Update: { id?: number; name?: string; created_at?: string | null }
        Relationships: []
      }
      app_users: {
        Row: {
          id: number
          name: string
          email: string | null
          created_at: string | null
          auth_user_id: string | null
          is_active: boolean
        }
        Insert: {
          id?: number
          name: string
          email?: string | null
          created_at?: string | null
          auth_user_id?: string | null
          is_active?: boolean
        }
        Update: {
          id?: number
          name?: string
          email?: string | null
          created_at?: string | null
          auth_user_id?: string | null
          is_active?: boolean
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          id: number
          name: string
          type_id: number | null
          ordered: number
          issued: number
          balance_snapshot: number | null
          threshold: number
          location: string | null
          returnable: string
          essential: boolean
          created_at: string | null
        }
        Insert: {
          id?: number
          name: string
          type_id?: number | null
          ordered?: number
          issued?: number
          balance_snapshot?: number | null
          threshold?: number
          location?: string | null
          returnable?: string
          essential?: boolean
          created_at?: string | null
        }
        Update: {
          id?: number
          name?: string
          type_id?: number | null
          ordered?: number
          issued?: number
          balance_snapshot?: number | null
          threshold?: number
          location?: string | null
          returnable?: string
          essential?: boolean
          created_at?: string | null
        }
        Relationships: []
      }
      inventory_orders: {
        Row: {
          id: number
          item_id: number | null
          purchase_date: string | null
          qty_ordered: number
          previous_qty: number | null
          total_qty: number | null
          amount: number
          assigned_to: number | null
          document_name: string | null
          brand_id: number | null
          company_id: number | null
          confirmed: boolean
          created_at: string | null
        }
        Insert: {
          id?: number
          item_id?: number | null
          purchase_date?: string | null
          qty_ordered?: number
          previous_qty?: number | null
          total_qty?: number | null
          amount?: number
          assigned_to?: number | null
          document_name?: string | null
          brand_id?: number | null
          company_id?: number | null
          confirmed?: boolean
          created_at?: string | null
        }
        Update: {
          id?: number
          item_id?: number | null
          purchase_date?: string | null
          qty_ordered?: number
          previous_qty?: number | null
          total_qty?: number | null
          amount?: number
          assigned_to?: number | null
          document_name?: string | null
          brand_id?: number | null
          company_id?: number | null
          confirmed?: boolean
          created_at?: string | null
        }
        Relationships: []
      }
      inventory_assigned: {
        Row: {
          id: number
          item_id: number | null
          user_id: number | null
          issued_from_legacy: string | null
          source_location: string | null
          issued_date: string | null
          qty_issued: number
          balance_snapshot: number | null
          remarks: string | null
          job_number: string | null
          drawing_number: string | null
          brand_id: number | null
          machine_id: number | null
          created_at: string | null
        }
        Insert: {
          id?: number
          item_id?: number | null
          user_id?: number | null
          issued_from_legacy?: string | null
          source_location?: string | null
          issued_date?: string | null
          qty_issued?: number
          balance_snapshot?: number | null
          remarks?: string | null
          job_number?: string | null
          drawing_number?: string | null
          brand_id?: number | null
          machine_id?: number | null
          created_at?: string | null
        }
        Update: {
          id?: number
          item_id?: number | null
          user_id?: number | null
          issued_from_legacy?: string | null
          source_location?: string | null
          issued_date?: string | null
          qty_issued?: number
          balance_snapshot?: number | null
          remarks?: string | null
          job_number?: string | null
          drawing_number?: string | null
          brand_id?: number | null
          machine_id?: number | null
          created_at?: string | null
        }
        Relationships: []
      }
      timeliness_configurations: {
        Row: {
          id: number
          report_name: string
          report_table: string
          frequency: string
          submission_day: string
          submitted_by: number | null
          created_at: string | null
        }
        Insert: {
          id?: number
          report_name: string
          report_table: string
          frequency: string
          submission_day: string
          submitted_by?: number | null
          created_at?: string | null
        }
        Update: {
          id?: number
          report_name?: string
          report_table?: string
          frequency?: string
          submission_day?: string
          submitted_by?: number | null
          created_at?: string | null
        }
        Relationships: []
      }
      generated_reports: {
        Row: {
          id: number
          configuration_id: number | null
          report_table: string
          period_start: string
          period_end: string
          storage_path: string
          file_name: string
          row_count: number
          created_at: string | null
        }
        Insert: {
          id?: number
          configuration_id?: number | null
          report_table: string
          period_start: string
          period_end: string
          storage_path: string
          file_name: string
          row_count?: number
          created_at?: string | null
        }
        Update: {
          id?: number
          configuration_id?: number | null
          report_table?: string
          period_start?: string
          period_end?: string
          storage_path?: string
          file_name?: string
          row_count?: number
          created_at?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          id: number
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at: string | null
        }
        Insert: {
          id?: number
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at?: string | null
        }
        Update: {
          id?: number
          user_id?: string
          endpoint?: string
          p256dh?: string
          auth?: string
          created_at?: string | null
        }
        Relationships: []
      }
      machine_hours: {
        Row: {
          id: number
          machine_id: number | null
          operator_id: number | null
          work_date: string
          hours: number
          job_number: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: number
          machine_id?: number | null
          operator_id?: number | null
          work_date: string
          hours?: number
          job_number?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: number
          machine_id?: number | null
          operator_id?: number | null
          work_date?: string
          hours?: number
          job_number?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      jobs: {
        Row: {
          id: number
          company_id: number | null
          job_number: string
          job_date: string | null
          due_date: string | null
          number_of_items: number
          completed_items: number
          job: string
          status: string
          po_number: string
          ship_date: string | null
          packing_slips: string[]
          priority: boolean
          created_at: string | null
        }
        Insert: {
          id?: number
          company_id?: number | null
          job_number?: string
          job_date?: string | null
          due_date?: string | null
          number_of_items?: number
          completed_items?: number
          job?: string
          status?: string
          po_number?: string
          ship_date?: string | null
          packing_slips?: string[]
          priority?: boolean
          created_at?: string | null
        }
        Update: {
          id?: number
          company_id?: number | null
          job_number?: string
          job_date?: string | null
          due_date?: string | null
          number_of_items?: number
          completed_items?: number
          job?: string
          status?: string
          po_number?: string
          ship_date?: string | null
          packing_slips?: string[]
          priority?: boolean
          created_at?: string | null
        }
        Relationships: []
      }
      machining_hours: {
        Row: {
          id: number
          work_date: string | null
          user_id: number | null
          machine_id: number | null
          description: string
          job_id: number | null
          drawing_number: string
          duration_minutes: number | null
          quantity: number | null
          created_at: string | null
        }
        Insert: {
          id?: number
          work_date?: string | null
          user_id?: number | null
          machine_id?: number | null
          description?: string
          job_id?: number | null
          drawing_number?: string
          duration_minutes?: number | null
          quantity?: number | null
          created_at?: string | null
        }
        Update: {
          id?: number
          work_date?: string | null
          user_id?: number | null
          machine_id?: number | null
          description?: string
          job_id?: number | null
          drawing_number?: string
          duration_minutes?: number | null
          quantity?: number | null
          created_at?: string | null
        }
        Relationships: []
      }
      mii_order_details: {
        Row: {
          id: number
          job_id: number | null
          drawing_number: string
          drawing_name: string
          quantity: number
          quantity_completed: number
          order_status: string
          completed: boolean
          completed_date: string | null
          inspected: boolean
          shipment: boolean
          shipment_date: string | null
          remarks: string
          quoted_minutes: number | null
          actual_minutes: number | null
          created_at: string | null
        }
        Insert: {
          id?: number
          job_id?: number | null
          drawing_number?: string
          drawing_name?: string
          quantity?: number
          quantity_completed?: number
          order_status?: string
          completed?: boolean
          completed_date?: string | null
          inspected?: boolean
          shipment?: boolean
          shipment_date?: string | null
          remarks?: string
          quoted_minutes?: number | null
          actual_minutes?: number | null
          created_at?: string | null
        }
        Update: {
          id?: number
          job_id?: number | null
          drawing_number?: string
          drawing_name?: string
          quantity?: number
          quantity_completed?: number
          order_status?: string
          completed?: boolean
          completed_date?: string | null
          inspected?: boolean
          shipment?: boolean
          shipment_date?: string | null
          remarks?: string
          quoted_minutes?: number | null
          actual_minutes?: number | null
          created_at?: string | null
        }
        Relationships: []
      }
      quoted_hours: {
        Row: {
          id: number
          job_id: number | null
          drawing_number: string
          quantity: number
          machine_id: number | null
          job_hours: number
          rate: number
          description: string
          time_remaining: string
          created_at: string | null
        }
        Insert: {
          id?: number
          job_id?: number | null
          drawing_number?: string
          quantity?: number
          machine_id?: number | null
          job_hours?: number
          rate?: number
          description?: string
          time_remaining?: string
          created_at?: string | null
        }
        Update: {
          id?: number
          job_id?: number | null
          drawing_number?: string
          quantity?: number
          machine_id?: number | null
          job_hours?: number
          rate?: number
          description?: string
          time_remaining?: string
          created_at?: string | null
        }
        Relationships: []
      }
      mii_inspections: {
        Row: {
          id: number
          created_at: string | null
          updated_at: string | null
          created_by: number | null
          updated_by: number | null
          supporting_documents: string[]
          job: number | null
          drawing: number | null
        }
        Insert: {
          id?: number
          created_at?: string | null
          updated_at?: string | null
          created_by?: number | null
          updated_by?: number | null
          supporting_documents?: string[]
          job?: number | null
          drawing?: number | null
        }
        Update: {
          id?: number
          created_at?: string | null
          updated_at?: string | null
          created_by?: number | null
          updated_by?: number | null
          supporting_documents?: string[]
          job?: number | null
          drawing?: number | null
        }
        Relationships: []
      }
      mii_job_number: {
        Row: {
          id: number
          created_at: string | null
          updated_at: string | null
          created_by: number | null
          updated_by: number | null
          job_no: string
          po: number | null
          due_date: string | null
          no_of_items: number | null
          completed_items: number | null
          status: number | null
          days_left_behind: number | null
          inspection_report: string | null
          inspection: boolean
          shipped_date: string | null
          packing_slip: string | null
          po_no: string
          company: number | null
          amount: number | null
          currency: number | null
          po_amount: number | null
          date: string | null
          essential: boolean
          remarks: string
          packing_slips: Json | null
        }
        Insert: {
          id?: number
          created_at?: string | null
          updated_at?: string | null
          created_by?: number | null
          updated_by?: number | null
          job_no?: string
          po?: number | null
          due_date?: string | null
          no_of_items?: number | null
          completed_items?: number | null
          status?: number | null
          days_left_behind?: number | null
          inspection_report?: string | null
          inspection?: boolean
          shipped_date?: string | null
          packing_slip?: string | null
          po_no?: string
          company?: number | null
          amount?: number | null
          currency?: number | null
          po_amount?: number | null
          date?: string | null
          essential?: boolean
          remarks?: string
          packing_slips?: Json | null
        }
        Update: {
          id?: number
          created_at?: string | null
          updated_at?: string | null
          created_by?: number | null
          updated_by?: number | null
          job_no?: string
          po?: number | null
          due_date?: string | null
          no_of_items?: number | null
          completed_items?: number | null
          status?: number | null
          days_left_behind?: number | null
          inspection_report?: string | null
          inspection?: boolean
          shipped_date?: string | null
          packing_slip?: string | null
          po_no?: string
          company?: number | null
          amount?: number | null
          currency?: number | null
          po_amount?: number | null
          date?: string | null
          essential?: boolean
          remarks?: string
          packing_slips?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
