// GERADO pelo Supabase a partir do banco real — não edite à mão.
// Para atualizar depois de uma migration: gerar de novo (Supabase CLI: `supabase gen types typescript`)
// e substituir este arquivo.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      focus_sessions: {
        Row: {
          created_at: string;
          duration_sec: number | null;
          ended_at: string;
          id: string;
          kind: string;
          planned_min: number;
          started_at: string;
          task_id: string | null;
          track_id: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          ended_at: string;
          id?: string;
          kind?: string;
          planned_min: number;
          started_at: string;
          task_id?: string | null;
          track_id?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          ended_at?: string;
          id?: string;
          kind?: string;
          planned_min?: number;
          started_at?: string;
          task_id?: string | null;
          track_id?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      goals: {
        Row: {
          archived_at: string | null;
          created_at: string;
          id: string;
          kind: string;
          period: string;
          target: number;
          title: string;
          track_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          id?: string;
          kind: string;
          period?: string;
          target: number;
          title: string;
          track_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          id?: string;
          kind?: string;
          period?: string;
          target?: number;
          title?: string;
          track_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          appearance: Json;
          created_at: string;
          daily_goal_min: number;
          display_name: string;
          id: string;
          locale: string;
          motion: string;
          pomodoro_break_min: number;
          pomodoro_cycle_length: number;
          pomodoro_focus_min: number;
          pomodoro_long_break_min: number;
          rest_weekday: number | null;
          streak_min_min: number;
          theme: string;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          appearance?: Json;
          created_at?: string;
          daily_goal_min?: number;
          display_name?: string;
          id: string;
          locale?: string;
          motion?: string;
          pomodoro_break_min?: number;
          pomodoro_cycle_length?: number;
          pomodoro_focus_min?: number;
          pomodoro_long_break_min?: number;
          rest_weekday?: number | null;
          streak_min_min?: number;
          theme?: string;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          appearance?: Json;
          created_at?: string;
          daily_goal_min?: number;
          display_name?: string;
          id?: string;
          locale?: string;
          motion?: string;
          pomodoro_break_min?: number;
          pomodoro_cycle_length?: number;
          pomodoro_focus_min?: number;
          pomodoro_long_break_min?: number;
          rest_weekday?: number | null;
          streak_min_min?: number;
          theme?: string;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      public_profiles: {
        Row: {
          avatar_url: string | null;
          bio: string;
          created_at: string;
          display_name: string;
          handle: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string;
          created_at?: string;
          display_name: string;
          handle: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string;
          created_at?: string;
          display_name?: string;
          handle?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          completed_at: string | null;
          created_at: string;
          due_on: string | null;
          due_time: string | null;
          estimate_min: number | null;
          id: string;
          notes: string;
          parent_id: string | null;
          priority: number;
          sort_order: number;
          status: string;
          title: string;
          track_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          due_on?: string | null;
          due_time?: string | null;
          estimate_min?: number | null;
          id?: string;
          notes?: string;
          parent_id?: string | null;
          priority?: number;
          sort_order?: number;
          status?: string;
          title: string;
          track_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          due_on?: string | null;
          due_time?: string | null;
          estimate_min?: number | null;
          id?: string;
          notes?: string;
          parent_id?: string | null;
          priority?: number;
          sort_order?: number;
          status?: string;
          title?: string;
          track_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_parent_fk";
            columns: ["user_id", "parent_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["user_id", "id"];
          },
          {
            foreignKeyName: "tasks_parent_fk";
            columns: ["user_id", "parent_id"];
            isOneToOne: false;
            referencedRelation: "v_tasks";
            referencedColumns: ["user_id", "id"];
          },
          {
            foreignKeyName: "tasks_track_fk";
            columns: ["user_id", "track_id"];
            isOneToOne: false;
            referencedRelation: "tracks";
            referencedColumns: ["user_id", "id"];
          },
          {
            foreignKeyName: "tasks_track_fk";
            columns: ["user_id", "track_id"];
            isOneToOne: false;
            referencedRelation: "v_track_progress";
            referencedColumns: ["user_id", "track_id"];
          },
        ];
      };
      tracks: {
        Row: {
          archived_at: string | null;
          created_at: string;
          id: string;
          monogram: string;
          name: string;
          sort_order: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          id?: string;
          monogram: string;
          name: string;
          sort_order?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          id?: string;
          monogram?: string;
          name?: string;
          sort_order?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      v_focus_days: {
        Row: {
          dia: string | null;
          minutos: number | null;
          sessoes: number | null;
          user_id: string | null;
        };
        Relationships: [];
      };
      v_goal_progress: {
        Row: {
          atual: number | null;
          created_at: string | null;
          fim: string | null;
          id: string | null;
          inicio: string | null;
          kind: string | null;
          percentual: number | null;
          period: string | null;
          target: number | null;
          title: string | null;
          track_id: string | null;
          user_id: string | null;
        };
        Relationships: [];
      };
      v_streak: {
        Row: {
          atual: number | null;
          melhor: number | null;
          ultimo_dia: string | null;
          user_id: string | null;
        };
        Relationships: [];
      };
      v_tasks: {
        Row: {
          bucket: string | null;
          completed_at: string | null;
          created_at: string | null;
          due_on: string | null;
          due_time: string | null;
          estimate_min: number | null;
          id: string | null;
          notes: string | null;
          parent_id: string | null;
          priority: number | null;
          sort_order: number | null;
          status: string | null;
          title: string | null;
          track_id: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_parent_fk";
            columns: ["user_id", "parent_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["user_id", "id"];
          },
          {
            foreignKeyName: "tasks_parent_fk";
            columns: ["user_id", "parent_id"];
            isOneToOne: false;
            referencedRelation: "v_tasks";
            referencedColumns: ["user_id", "id"];
          },
          {
            foreignKeyName: "tasks_track_fk";
            columns: ["user_id", "track_id"];
            isOneToOne: false;
            referencedRelation: "tracks";
            referencedColumns: ["user_id", "id"];
          },
          {
            foreignKeyName: "tasks_track_fk";
            columns: ["user_id", "track_id"];
            isOneToOne: false;
            referencedRelation: "v_track_progress";
            referencedColumns: ["user_id", "track_id"];
          },
        ];
      };
      v_track_progress: {
        Row: {
          concluidas: number | null;
          name: string | null;
          percentual: number | null;
          total: number | null;
          track_id: string | null;
          user_id: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;
