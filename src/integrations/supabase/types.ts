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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          entity_type: string
          entity_id: string
          old_values: Json | null
          new_values: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          entity_type: string
          entity_id: string
          old_values?: Json | null
          new_values?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          entity_type?: string
          entity_id?: string
          old_values?: Json | null
          new_values?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          contact_info: string | null
          contact_name: string | null
          created_at: string
          deadline: string | null
          detail: string | null
          feedback_channel: string | null
          id: string
          is_archived: boolean | null
          job_description: string | null
          link: string | null
          month: number
          name: string
          note: string | null
          payment_fee: string | null
          project_title: string | null
          responsible_person: string[] | null
          sort_order: number | null
          start_date: string | null
          updated_at: string
          year: number
        }
        Insert: {
          contact_info?: string | null
          contact_name?: string | null
          created_at?: string
          deadline?: string | null
          detail?: string | null
          feedback_channel?: string | null
          id?: string
          is_archived?: boolean | null
          job_description?: string | null
          link?: string | null
          month?: number
          name: string
          note?: string | null
          payment_fee?: string | null
          project_title?: string | null
          responsible_person?: string[] | null
          sort_order?: number | null
          start_date?: string | null
          updated_at?: string
          year?: number
        }
        Update: {
          contact_info?: string | null
          contact_name?: string | null
          created_at?: string
          deadline?: string | null
          detail?: string | null
          feedback_channel?: string | null
          id?: string
          is_archived?: boolean | null
          job_description?: string | null
          link?: string | null
          month?: number
          name?: string
          note?: string | null
          payment_fee?: string | null
          project_title?: string | null
          responsible_person?: string[] | null
          sort_order?: number | null
          start_date?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      company_info: {
        Row: {
          benefits: Json
          brand_colors: Json
          contact_email: string | null
          core_values: Json | null
          history: string | null
          id: number
          location_links: Json
          logo_url: string | null
          milestones: Json
          mission: string | null
          name: string | null
          resources: Json
          tagline: string | null
          updated_at: string | null
          vision: string | null
        }
        Insert: {
          benefits?: Json
          brand_colors?: Json
          contact_email?: string | null
          core_values?: Json | null
          history?: string | null
          id?: number
          location_links?: Json
          logo_url?: string | null
          milestones?: Json
          mission?: string | null
          name?: string | null
          resources?: Json
          tagline?: string | null
          updated_at?: string | null
          vision?: string | null
        }
        Update: {
          benefits?: Json
          brand_colors?: Json
          contact_email?: string | null
          core_values?: Json | null
          history?: string | null
          id?: number
          location_links?: Json
          logo_url?: string | null
          milestones?: Json
          mission?: string | null
          name?: string | null
          resources?: Json
          tagline?: string | null
          updated_at?: string | null
          vision?: string | null
        }
        Relationships: []
      }
      employees: {
        Row: {
          active: boolean | null
          avatar: string | null
          created_at: string
          email: string
          id: string
          kpi_role: string | null
          name: string
          note: string | null
          phone: string | null
          position: string
          promptpay_qr: string | null
          role: string
          start_date: string | null
          type: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          avatar?: string | null
          created_at?: string
          email?: string
          id?: string
          kpi_role?: string | null
          name: string
          note?: string | null
          phone?: string | null
          position?: string
          promptpay_qr?: string | null
          role?: string
          start_date?: string | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          avatar?: string | null
          created_at?: string
          email?: string
          id?: string
          kpi_role?: string | null
          name?: string
          note?: string | null
          phone?: string | null
          position?: string
          promptpay_qr?: string | null
          role?: string
          start_date?: string | null
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          assigned_to: string | null
          created_at: string
          current_value: number
          deadline: string
          id: string
          target_value: number
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          current_value?: number
          deadline: string
          id?: string
          target_value?: number
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          current_value?: number
          deadline?: string
          id?: string
          target_value?: number
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      holidays: {
        Row: {
          color_tag: string | null
          created_at: string
          end_date: string
          holiday_date: string
          holiday_type: string
          id: string
          name: string
          start_date: string
          updated_at: string
        }
        Insert: {
          color_tag?: string | null
          created_at?: string
          end_date?: string
          holiday_date: string
          holiday_type?: string
          id?: string
          name: string
          start_date?: string
          updated_at?: string
        }
        Update: {
          color_tag?: string | null
          created_at?: string
          end_date?: string
          holiday_date?: string
          holiday_type?: string
          id?: string
          name?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      key_results: {
        Row: {
          created_at: string
          current_value: number
          id: string
          initial_value: number
          objective_id: string
          target_value: number
          title: string
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_value?: number
          id?: string
          initial_value?: number
          objective_id: string
          target_value?: number
          title: string
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_value?: number
          id?: string
          initial_value?: number
          objective_id?: string
          target_value?: number
          title?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "key_results_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_evaluations: {
        Row: {
          created_at: string
          evaluatee_id: string
          evaluator_id: string
          id: string
          notes_improve: string | null
          notes_strength: string | null
          period_id: string
          reviewer_type: string | null
          scores: Json
          submitted_at: string | null
          type: string
        }
        Insert: {
          created_at?: string
          evaluatee_id: string
          evaluator_id: string
          id?: string
          notes_improve?: string | null
          notes_strength?: string | null
          period_id: string
          reviewer_type?: string | null
          scores?: Json
          submitted_at?: string | null
          type: string
        }
        Update: {
          created_at?: string
          evaluatee_id?: string
          evaluator_id?: string
          id?: string
          notes_improve?: string | null
          notes_strength?: string | null
          period_id?: string
          reviewer_type?: string | null
          scores?: Json
          submitted_at?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpi_evaluations_evaluatee_id_fkey"
            columns: ["evaluatee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_evaluations_evaluator_id_fkey"
            columns: ["evaluator_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_evaluations_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "kpi_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_periods: {
        Row: {
          created_at: string
          id: string
          label: string
          project_id: string | null
          status: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          project_id?: string | null
          status?: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          project_id?: string | null
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpi_periods_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_role_weights: {
        Row: {
          competency: number
          creativity: number
          job_performance: number
          leadership: number
          role: string
          teamwork: number
        }
        Insert: {
          competency?: number
          creativity?: number
          job_performance?: number
          leadership?: number
          role: string
          teamwork?: number
        }
        Update: {
          competency?: number
          creativity?: number
          job_performance?: number
          leadership?: number
          role?: string
          teamwork?: number
        }
        Relationships: []
      }
      leave_requests: {
        Row: {
          created_at: string
          id: string
          leave_end: string
          leave_reason: string
          leave_start: string
          leave_type: string
          requested_by: string
          requested_date: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          leave_end: string
          leave_reason?: string
          leave_start: string
          leave_type?: string
          requested_by: string
          requested_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          leave_end?: string
          leave_reason?: string
          leave_start?: string
          leave_type?: string
          requested_by?: string
          requested_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      meetings: {
        Row: {
          created_at: string
          end_time: string | null
          id: string
          location: string | null
          meeting_date: string
          note: string | null
          participants: string[]
          start_time: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          id?: string
          location?: string | null
          meeting_date: string
          note?: string | null
          participants?: string[]
          start_time?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_time?: string | null
          id?: string
          location?: string | null
          meeting_date?: string
          note?: string | null
          participants?: string[]
          start_time?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      objectives: {
        Row: {
          created_at: string
          id: string
          owner_id: string | null
          period: string
          status: string
          title: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id?: string | null
          period?: string
          status?: string
          title: string
          updated_at?: string
          year?: number
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string | null
          period?: string
          status?: string
          title?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "objectives_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      onsite_work: {
        Row: {
          created_at: string
          id: string
          location: string | null
          note: string | null
          participants: string[]
          title: string
          updated_at: string
          work_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string | null
          note?: string | null
          participants?: string[]
          title: string
          updated_at?: string
          work_date: string
        }
        Update: {
          created_at?: string
          id?: string
          location?: string | null
          note?: string | null
          participants?: string[]
          title?: string
          updated_at?: string
          work_date?: string
        }
        Relationships: []
      }
      organization_chart_members: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          name: string
          parent_id: string | null
          position: string
          role_type: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          position?: string
          role_type?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          position?: string
          role_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_chart_members_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "organization_chart_members"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          allowed_pages: string[]
          created_at: string
          display_name: string
          id: string
          is_approved: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          allowed_pages?: string[]
          created_at?: string
          display_name?: string
          id?: string
          is_approved?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          allowed_pages?: string[]
          created_at?: string
          display_name?: string
          id?: string
          is_approved?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          embedding: string | null
          id: string
          is_archived: boolean | null
          link: string | null
          month: number
          name: string
          note: string | null
          pillar: string
          sort_order: number | null
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          embedding?: string | null
          id?: string
          is_archived?: boolean | null
          link?: string | null
          month?: number
          name: string
          note?: string | null
          pillar?: string
          sort_order?: number | null
          updated_at?: string
          year?: number
        }
        Update: {
          created_at?: string
          embedding?: string | null
          id?: string
          is_archived?: boolean | null
          link?: string | null
          month?: number
          name?: string
          note?: string | null
          pillar?: string
          sort_order?: number | null
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string[]
          category: string
          comments: string | null
          created_at: string
          customer_id: string | null
          depends_on: string | null
          due_date: string | null
          estimated_hours: number
          id: string
          link: string | null
          name: string
          priority: string
          project_id: string | null
          sort_order: number | null
          start_date: string | null
          status: string
          task_type: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string[]
          category?: string
          comments?: string | null
          created_at?: string
          customer_id?: string | null
          depends_on?: string | null
          due_date?: string | null
          estimated_hours?: number
          id?: string
          link?: string | null
          name: string
          priority?: string
          project_id?: string | null
          sort_order?: number | null
          start_date?: string | null
          status?: string
          task_type?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string[]
          category?: string
          comments?: string | null
          created_at?: string
          customer_id?: string | null
          depends_on?: string | null
          due_date?: string | null
          estimated_hours?: number
          id?: string
          link?: string | null
          name?: string
          priority?: string
          project_id?: string | null
          sort_order?: number | null
          start_date?: string | null
          status?: string
          task_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_tasks_customer"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_depends_on_fkey"
            columns: ["depends_on"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wiki_pages: {
        Row: {
          id: string
          title: string
          slug: string
          content: string | null
          category: string
          author_id: string | null
          is_published: boolean
          view_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          slug: string
          content?: string | null
          category?: string
          author_id?: string | null
          is_published?: boolean
          view_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          content?: string | null
          category?: string
          author_id?: string | null
          is_published?: boolean
          view_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "member"
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
  public: {
    Enums: {
      app_role: ["admin", "member"],
    },
  },
} as const
