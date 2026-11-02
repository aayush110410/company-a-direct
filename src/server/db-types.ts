export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      addons: {
        Row: {
          diet: Database["public"]["Enums"]["diet"]
          id: string
          item_id: string
          name: string
          price_paise: number
          sort: number
        }
        Insert: {
          diet: Database["public"]["Enums"]["diet"]
          id?: string
          item_id: string
          name: string
          price_paise: number
          sort?: number
        }
        Update: {
          diet?: Database["public"]["Enums"]["diet"]
          id?: string
          item_id?: string
          name?: string
          price_paise?: number
          sort?: number
        }
        Relationships: [
          {
            foreignKeyName: "addons_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
          id: string
          kind: string
          message: string
          order_id: string
          outlet_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          id?: string
          kind: string
          message: string
          order_id: string
          outlet_id: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          id?: string
          kind?: string
          message?: string
          order_id?: string
          outlet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          sort: number
        }
        Insert: {
          id?: string
          name: string
          slug: string
          sort?: number
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          sort?: number
        }
        Relationships: []
      }
      cities: {
        Row: {
          id: string
          name: string
          slug: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          is_active: boolean
          kind: Database["public"]["Enums"]["coupon_kind"]
          max_discount_paise: number | null
          min_order_paise: number
          per_customer_limit: number
          valid_from: string
          valid_to: string
          value: number
        }
        Insert: {
          code: string
          is_active?: boolean
          kind: Database["public"]["Enums"]["coupon_kind"]
          max_discount_paise?: number | null
          min_order_paise?: number
          per_customer_limit?: number
          valid_from: string
          valid_to: string
          value: number
        }
        Update: {
          code?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["coupon_kind"]
          max_discount_paise?: number | null
          min_order_paise?: number
          per_customer_limit?: number
          valid_from?: string
          valid_to?: string
          value?: number
        }
        Relationships: []
      }
      item_portions: {
        Row: {
          id: string
          item_id: string
          name: string
          prep_multiplier: number
          sort: number
        }
        Insert: {
          id?: string
          item_id: string
          name: string
          prep_multiplier?: number
          sort?: number
        }
        Update: {
          id?: string
          item_id?: string
          name?: string
          prep_multiplier?: number
          sort?: number
        }
        Relationships: [
          {
            foreignKeyName: "item_portions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_prices: {
        Row: {
          city_id: string
          portion_id: string
          price_paise: number
        }
        Insert: {
          city_id: string
          portion_id: string
          price_paise: number
        }
        Update: {
          city_id?: string
          portion_id?: string
          price_paise?: number
        }
        Relationships: [
          {
            foreignKeyName: "item_prices_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_prices_portion_id_fkey"
            columns: ["portion_id"]
            isOneToOne: false
            referencedRelation: "item_portions"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          allergens: string[]
          base_prep_minutes: number
          category_id: string
          created_at: string
          description: string
          diet: Database["public"]["Enums"]["diet"]
          id: string
          is_active: boolean
          name: string
          photo_credit: string
          photo_url: string
          schedule_id: string | null
          slug: string
          sort: number
          spice_level: number
          updated_at: string
        }
        Insert: {
          allergens?: string[]
          base_prep_minutes: number
          category_id: string
          created_at?: string
          description?: string
          diet: Database["public"]["Enums"]["diet"]
          id?: string
          is_active?: boolean
          name: string
          photo_credit?: string
          photo_url: string
          schedule_id?: string | null
          slug: string
          sort?: number
          spice_level?: number
          updated_at?: string
        }
        Update: {
          allergens?: string[]
          base_prep_minutes?: number
          category_id?: string
          created_at?: string
          description?: string
          diet?: Database["public"]["Enums"]["diet"]
          id?: string
          is_active?: boolean
          name?: string
          photo_credit?: string
          photo_url?: string
          schedule_id?: string | null
          slug?: string
          sort?: number
          spice_level?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "menu_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_schedules: {
        Row: {
          days: number[]
          ends_at: string
          id: string
          name: string
          starts_at: string
        }
        Insert: {
          days: number[]
          ends_at: string
          id?: string
          name: string
          starts_at: string
        }
        Update: {
          days?: number[]
          ends_at?: string
          id?: string
          name?: string
          starts_at?: string
        }
        Relationships: []
      }
      order_contacts: {
        Row: {
          customer_phone: string
          delivery_address: string
          order_id: string
        }
        Insert: {
          customer_phone: string
          delivery_address: string
          order_id: string
        }
        Update: {
          customer_phone?: string
          delivery_address?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_contacts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          actor_id: string | null
          at: string
          from_status: Database["public"]["Enums"]["order_status"] | null
          id: number
          order_id: string
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          actor_id?: string | null
          at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: never
          order_id: string
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          actor_id?: string | null
          at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: never
          order_id?: string
          to_status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          addons: Json
          base_prep_minutes: number
          id: string
          item_id: string
          name_snapshot: string
          order_id: string
          portion_id: string
          portion_snapshot: string
          prep_multiplier: number
          qty: number
          unit_price_paise: number
        }
        Insert: {
          addons?: Json
          base_prep_minutes: number
          id?: string
          item_id: string
          name_snapshot: string
          order_id: string
          portion_id: string
          portion_snapshot: string
          prep_multiplier: number
          qty: number
          unit_price_paise: number
        }
        Update: {
          addons?: Json
          base_prep_minutes?: number
          id?: string
          item_id?: string
          name_snapshot?: string
          order_id?: string
          portion_id?: string
          portion_snapshot?: string
          prep_multiplier?: number
          qty?: number
          unit_price_paise?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_portion_id_fkey"
            columns: ["portion_id"]
            isOneToOne: false
            referencedRelation: "item_portions"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          coupon_code: string | null
          customer_id: string
          delivered_at: string | null
          discount_paise: number
          distance_km: number
          gst_paise: number
          handed_at: string | null
          id: string
          late_alerted_at: string | null
          outlet_id: string
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          placed_at: string
          preparing_at: string | null
          promised_at: string
          ready_at: string | null
          ready_by: string
          revised_eta: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal_paise: number
          total_paise: number
          travel_minutes: number
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          coupon_code?: string | null
          customer_id: string
          delivered_at?: string | null
          discount_paise?: number
          distance_km: number
          gst_paise: number
          handed_at?: string | null
          id?: string
          late_alerted_at?: string | null
          outlet_id: string
          paid_at?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          placed_at?: string
          preparing_at?: string | null
          promised_at: string
          ready_at?: string | null
          ready_by: string
          revised_eta?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_paise: number
          total_paise: number
          travel_minutes: number
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          coupon_code?: string | null
          customer_id?: string
          delivered_at?: string | null
          discount_paise?: number
          distance_km?: number
          gst_paise?: number
          handed_at?: string | null
          id?: string
          late_alerted_at?: string | null
          outlet_id?: string
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          placed_at?: string
          preparing_at?: string | null
          promised_at?: string
          ready_at?: string | null
          ready_by?: string
          revised_eta?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_paise?: number
          total_paise?: number
          travel_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_coupon_code_fkey"
            columns: ["coupon_code"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      outbox_messages: {
        Row: {
          body: string
          channel: Database["public"]["Enums"]["message_channel"]
          created_at: string
          id: string
          order_id: string | null
          purpose: Database["public"]["Enums"]["message_purpose"]
          template: string
          to_phone: string
        }
        Insert: {
          body: string
          channel: Database["public"]["Enums"]["message_channel"]
          created_at?: string
          id?: string
          order_id?: string | null
          purpose: Database["public"]["Enums"]["message_purpose"]
          template: string
          to_phone: string
        }
        Update: {
          body?: string
          channel?: Database["public"]["Enums"]["message_channel"]
          created_at?: string
          id?: string
          order_id?: string | null
          purpose?: Database["public"]["Enums"]["message_purpose"]
          template?: string
          to_phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "outbox_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      outlet_item_availability: {
        Row: {
          item_id: string
          outlet_id: string
          status: Database["public"]["Enums"]["availability_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          item_id: string
          outlet_id: string
          status: Database["public"]["Enums"]["availability_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          item_id?: string
          outlet_id?: string
          status?: Database["public"]["Enums"]["availability_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outlet_item_availability_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outlet_item_availability_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      outlets: {
        Row: {
          area: string
          capacity_slots: number
          city_id: string
          closes_at: string
          created_at: string
          delivery_radius_km: number
          fssai_licence: string
          id: string
          is_accepting_orders: boolean
          kind: Database["public"]["Enums"]["outlet_kind"]
          lat: number
          lng: number
          min_promise_minutes: number
          name: string
          opens_at: string
          slug: string
        }
        Insert: {
          area: string
          capacity_slots?: number
          city_id: string
          closes_at?: string
          created_at?: string
          delivery_radius_km: number
          fssai_licence: string
          id?: string
          is_accepting_orders?: boolean
          kind?: Database["public"]["Enums"]["outlet_kind"]
          lat: number
          lng: number
          min_promise_minutes?: number
          name: string
          opens_at?: string
          slug: string
        }
        Update: {
          area?: string
          capacity_slots?: number
          city_id?: string
          closes_at?: string
          created_at?: string
          delivery_radius_km?: number
          fssai_licence?: string
          id?: string
          is_accepting_orders?: boolean
          kind?: Database["public"]["Enums"]["outlet_kind"]
          lat?: number
          lng?: number
          min_promise_minutes?: number
          name?: string
          opens_at?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "outlets_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_paise: number
          created_at: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          order_id: string
          provider_ref: string
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount_paise: number
          created_at?: string
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          order_id: string
          provider_ref?: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount_paise?: number
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          order_id?: string
          provider_ref?: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      prep_estimates: {
        Row: {
          actual_minutes: number | null
          confidence: string
          created_at: string
          features: Json
          model_version: string | null
          order_id: string
          outlet_min_minutes: number
          overridden_by: string | null
          override_reason: string | null
          p80_minutes: number
          predicted_minutes: number
          promised_at: string
          source: Database["public"]["Enums"]["estimate_source"]
        }
        Insert: {
          actual_minutes?: number | null
          confidence: string
          created_at?: string
          features: Json
          model_version?: string | null
          order_id: string
          outlet_min_minutes: number
          overridden_by?: string | null
          override_reason?: string | null
          p80_minutes: number
          predicted_minutes: number
          promised_at: string
          source: Database["public"]["Enums"]["estimate_source"]
        }
        Update: {
          actual_minutes?: number | null
          confidence?: string
          created_at?: string
          features?: Json
          model_version?: string | null
          order_id?: string
          outlet_min_minutes?: number
          overridden_by?: string | null
          override_reason?: string | null
          p80_minutes?: number
          predicted_minutes?: number
          promised_at?: string
          source?: Database["public"]["Enums"]["estimate_source"]
        }
        Relationships: [
          {
            foreignKeyName: "prep_estimates_model_version_fkey"
            columns: ["model_version"]
            isOneToOne: false
            referencedRelation: "prep_models"
            referencedColumns: ["version"]
          },
          {
            foreignKeyName: "prep_estimates_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      prep_models: {
        Row: {
          baseline_mean_mae: number
          baseline_rule_mae: number
          coefficients: Json
          feature_ranges: Json
          is_active: boolean
          mae: number
          outlet_train_counts: Json
          residual_p50: number
          residual_p80: number
          train_n: number
          trained_at: string
          version: string
        }
        Insert: {
          baseline_mean_mae: number
          baseline_rule_mae: number
          coefficients: Json
          feature_ranges: Json
          is_active?: boolean
          mae: number
          outlet_train_counts?: Json
          residual_p50: number
          residual_p80: number
          train_n: number
          trained_at: string
          version: string
        }
        Update: {
          baseline_mean_mae?: number
          baseline_rule_mae?: number
          coefficients?: Json
          feature_ranges?: Json
          is_active?: boolean
          mae?: number
          outlet_train_counts?: Json
          residual_p50?: number
          residual_p80?: number
          train_n?: number
          trained_at?: string
          version?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          marketing_opt_in: boolean
          marketing_opt_in_at: string | null
          outlet_id: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
          marketing_opt_in?: boolean
          marketing_opt_in_at?: string | null
          outlet_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          marketing_opt_in?: boolean
          marketing_opt_in_at?: string | null
          outlet_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_outlet: { Args: never; Returns: string }
      auth_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      confirm_payment: {
        Args: {
          p_estimate: Json
          p_message: Json
          p_order_id: string
          p_promised_at: string
          p_ready_by: string
        }
        Returns: Database["public"]["Enums"]["order_status"]
      }
      override_promise: {
        Args: {
          p_actor: string
          p_order_id: string
          p_promised_at: string
          p_ready_by: string
          p_reason: string
        }
        Returns: boolean
      }
      run_order_jobs: {
        Args: { p_now?: string; p_order_ids?: string[] }
        Returns: Json
      }
      transition_order: {
        Args: {
          p_actor: string
          p_from: Database["public"]["Enums"]["order_status"]
          p_order_id: string
          p_reason?: string
          p_to: Database["public"]["Enums"]["order_status"]
        }
        Returns: boolean
      }
    }
    Enums: {
      availability_status: "available" | "out_of_stock" | "hidden"
      coupon_kind: "percent" | "flat"
      diet: "veg" | "non_veg" | "egg"
      estimate_source:
        | "model"
        | "outlet_minimum"
        | "manager_override"
        | "fallback"
      message_channel: "whatsapp" | "sms"
      message_purpose: "transactional" | "marketing"
      order_status:
        | "awaiting_payment"
        | "placed"
        | "preparing"
        | "ready"
        | "handed_to_rider"
        | "delivered"
        | "expired"
        | "cancelled"
      outlet_kind: "outlet" | "cloud_kitchen"
      payment_method: "upi" | "card"
      payment_status: "pending" | "succeeded" | "failed" | "expired"
      user_role: "customer" | "kitchen_staff" | "outlet_manager" | "admin"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      availability_status: ["available", "out_of_stock", "hidden"],
      coupon_kind: ["percent", "flat"],
      diet: ["veg", "non_veg", "egg"],
      estimate_source: [
        "model",
        "outlet_minimum",
        "manager_override",
        "fallback",
      ],
      message_channel: ["whatsapp", "sms"],
      message_purpose: ["transactional", "marketing"],
      order_status: [
        "awaiting_payment",
        "placed",
        "preparing",
        "ready",
        "handed_to_rider",
        "delivered",
        "expired",
        "cancelled",
      ],
      outlet_kind: ["outlet", "cloud_kitchen"],
      payment_method: ["upi", "card"],
      payment_status: ["pending", "succeeded", "failed", "expired"],
      user_role: ["customer", "kitchen_staff", "outlet_manager", "admin"],
    },
  },
} as const

