// Generated from the Supabase schema (supabase/migrations). Regenerate after schema changes.

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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      connections: {
        Row: {
          created_at: string
          other_id: string
          relation: Database["public"]["Enums"]["relation"]
          user_id: string
        }
        Insert: {
          created_at?: string
          other_id: string
          relation: Database["public"]["Enums"]["relation"]
          user_id: string
        }
        Update: {
          created_at?: string
          other_id?: string
          relation?: Database["public"]["Enums"]["relation"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connections_other_id_fkey"
            columns: ["other_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          from_id: string
          id: string
          note: string | null
          plan_id: string
          responded_at: string | null
          response: Database["public"]["Enums"]["invitation_response"]
          sent_at: string
          to_id: string
        }
        Insert: {
          from_id?: string
          id?: string
          note?: string | null
          plan_id: string
          responded_at?: string | null
          response?: Database["public"]["Enums"]["invitation_response"]
          sent_at?: string
          to_id: string
        }
        Update: {
          from_id?: string
          id?: string
          note?: string | null
          plan_id?: string
          responded_at?: string | null
          response?: Database["public"]["Enums"]["invitation_response"]
          sent_at?: string
          to_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_from_id_fkey"
            columns: ["from_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_to_id_fkey"
            columns: ["to_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      my_plans: {
        Row: {
          added_at: string
          done: boolean
          plan_id: string
          scheduled_at: string | null
          user_id: string
        }
        Insert: {
          added_at?: string
          done?: boolean
          plan_id: string
          scheduled_at?: string | null
          user_id?: string
        }
        Update: {
          added_at?: string
          done?: boolean
          plan_id?: string
          scheduled_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "my_plans_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "my_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          connections: boolean
          invitation_responses: boolean
          invitations: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          connections?: boolean
          invitation_responses?: boolean
          invitations?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          connections?: boolean
          invitation_responses?: boolean
          invitations?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_likes: {
        Row: {
          created_at: string
          plan_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          plan_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          plan_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_likes_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_photos: {
        Row: {
          created_at: string
          created_by: string
          height: number | null
          id: string
          path: string
          plan_id: string
          position: number
          width: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string
          height?: number | null
          id?: string
          path: string
          plan_id: string
          position?: number
          width?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string
          height?: number | null
          id?: string
          path?: string
          plan_id?: string
          position?: number
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_photos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_photos_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          category: Database["public"]["Enums"]["plan_category"]
          cover: Database["public"]["Enums"]["plan_cover"]
          created_at: string
          description: string
          duration_label: string | null
          id: string
          is_public: boolean
          likes_count: number
          owner_id: string
          place: string | null
          price: number
          title: string
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["plan_category"]
          cover?: Database["public"]["Enums"]["plan_cover"]
          created_at?: string
          description?: string
          duration_label?: string | null
          id?: string
          is_public?: boolean
          likes_count?: number
          owner_id?: string
          place?: string | null
          price?: number
          title: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["plan_category"]
          cover?: Database["public"]["Enums"]["plan_cover"]
          created_at?: string
          description?: string
          duration_label?: string | null
          id?: string
          is_public?: boolean
          likes_count?: number
          owner_id?: string
          place?: string | null
          price?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plans_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          color: string
          created_at: string
          id: string
          invite_code: string
          name: string
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          color?: string
          created_at?: string
          id: string
          invite_code?: string
          name: string
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          color?: string
          created_at?: string
          id?: string
          invite_code?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          platform: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wishes: {
        Row: {
          added_by: string
          created_at: string
          done: boolean
          for_id: string | null
          id: string
          kind: Database["public"]["Enums"]["wish_kind"]
          note: string | null
          progress: number | null
          title: string
          updated_at: string
        }
        Insert: {
          added_by?: string
          created_at?: string
          done?: boolean
          for_id?: string | null
          id?: string
          kind: Database["public"]["Enums"]["wish_kind"]
          note?: string | null
          progress?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          added_by?: string
          created_at?: string
          done?: boolean
          for_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["wish_kind"]
          note?: string | null
          progress?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishes_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishes_for_id_fkey"
            columns: ["for_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_push_secret: { Args: { secret: string }; Returns: boolean }
      redeem_invite_code: {
        Args: {
          as_relation?: Database["public"]["Enums"]["relation"]
          code: string
        }
        Returns: {
          avatar_path: string | null
          color: string
          created_at: string
          id: string
          invite_code: string
          name: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      register_push_token: {
        Args: { platform: string; token: string }
        Returns: undefined
      }
      remove_connection: { Args: { other: string }; Returns: undefined }
      respond_to_invitation: {
        Args: {
          answer: Database["public"]["Enums"]["invitation_response"]
          invitation: string
        }
        Returns: {
          from_id: string
          id: string
          note: string | null
          plan_id: string
          responded_at: string | null
          response: Database["public"]["Enums"]["invitation_response"]
          sent_at: string
          to_id: string
        }
        SetofOptions: {
          from: "*"
          to: "invitations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      unregister_push_token: { Args: { token: string }; Returns: undefined }
    }
    Enums: {
      invitation_response: "pendiente" | "si" | "quizas" | "no"
      plan_category:
        | "comida"
        | "aventura"
        | "cultura"
        | "casa"
        | "escapada"
        | "deporte"
      plan_cover:
        | "sunset"
        | "sea"
        | "clay"
        | "dusk"
        | "snow"
        | "forest"
        | "night"
        | "candy"
      relation: "pareja" | "amigo"
      wish_kind: "regalo" | "actividad" | "meta"
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
    Enums: {
      invitation_response: ["pendiente", "si", "quizas", "no"],
      plan_category: [
        "comida",
        "aventura",
        "cultura",
        "casa",
        "escapada",
        "deporte",
      ],
      plan_cover: [
        "sunset",
        "sea",
        "clay",
        "dusk",
        "snow",
        "forest",
        "night",
        "candy",
      ],
      relation: ["pareja", "amigo"],
      wish_kind: ["regalo", "actividad", "meta"],
    },
  },
} as const
