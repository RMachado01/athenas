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
      board_items: {
        Row: {
          board_id: string;
          color: string;
          created_at: string;
          h: number;
          id: string;
          kind: string;
          parent_id: string | null;
          task_id: string | null;
          text: string;
          updated_at: string;
          user_id: string;
          w: number;
          x: number;
          y: number;
          z: number;
        };
        Insert: {
          board_id: string;
          color?: string;
          created_at?: string;
          h?: number;
          id?: string;
          kind?: string;
          parent_id?: string | null;
          task_id?: string | null;
          text?: string;
          updated_at?: string;
          user_id: string;
          w?: number;
          x?: number;
          y?: number;
          z?: number;
        };
        Update: {
          board_id?: string;
          color?: string;
          created_at?: string;
          h?: number;
          id?: string;
          kind?: string;
          parent_id?: string | null;
          task_id?: string | null;
          text?: string;
          updated_at?: string;
          user_id?: string;
          w?: number;
          x?: number;
          y?: number;
          z?: number;
        };
        Relationships: [];
      };
      board_links: {
        Row: {
          board_id: string;
          created_at: string;
          from_item: string;
          id: string;
          label: string;
          to_item: string;
          user_id: string;
        };
        Insert: {
          board_id: string;
          created_at?: string;
          from_item: string;
          id?: string;
          label?: string;
          to_item: string;
          user_id: string;
        };
        Update: {
          board_id?: string;
          created_at?: string;
          from_item?: string;
          id?: string;
          label?: string;
          to_item?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      boards: {
        Row: {
          archived_at: string | null;
          color: string;
          created_at: string;
          icon: string;
          id: string;
          title: string;
          track_id: string | null;
          updated_at: string;
          user_id: string;
          viewport: Json;
        };
        Insert: {
          archived_at?: string | null;
          color?: string;
          created_at?: string;
          icon?: string;
          id?: string;
          title: string;
          track_id?: string | null;
          updated_at?: string;
          user_id: string;
          viewport?: Json;
        };
        Update: {
          archived_at?: string | null;
          color?: string;
          created_at?: string;
          icon?: string;
          id?: string;
          title?: string;
          track_id?: string | null;
          updated_at?: string;
          user_id?: string;
          viewport?: Json;
        };
        Relationships: [];
      };
      calendar_events: {
        Row: {
          all_day: boolean;
          end_date: string | null;
          ends_at: string | null;
          google_calendar_id: string;
          google_event_id: string;
          google_updated_at: string | null;
          id: string;
          start_date: string | null;
          starts_at: string | null;
          synced_at: string;
          title: string;
          user_id: string;
        };
        Insert: {
          all_day?: boolean;
          end_date?: string | null;
          ends_at?: string | null;
          google_calendar_id: string;
          google_event_id: string;
          google_updated_at?: string | null;
          id?: string;
          start_date?: string | null;
          starts_at?: string | null;
          synced_at?: string;
          title?: string;
          user_id: string;
        };
        Update: {
          all_day?: boolean;
          end_date?: string | null;
          ends_at?: string | null;
          google_calendar_id?: string;
          google_event_id?: string;
          google_updated_at?: string | null;
          id?: string;
          start_date?: string | null;
          starts_at?: string | null;
          synced_at?: string;
          title?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      google_calendars: {
        Row: {
          color: string | null;
          created_at: string;
          enabled: boolean;
          google_calendar_id: string;
          is_primary: boolean;
          last_synced_at: string | null;
          summary: string;
          sync_locked_until: string | null;
          sync_token: string | null;
          user_id: string;
        };
        Insert: {
          color?: string | null;
          created_at?: string;
          enabled?: boolean;
          google_calendar_id: string;
          is_primary?: boolean;
          last_synced_at?: string | null;
          summary?: string;
          sync_locked_until?: string | null;
          sync_token?: string | null;
          user_id: string;
        };
        Update: {
          color?: string | null;
          created_at?: string;
          enabled?: boolean;
          google_calendar_id?: string;
          is_primary?: boolean;
          last_synced_at?: string | null;
          summary?: string;
          sync_locked_until?: string | null;
          sync_token?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
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
      v_boards: {
        Row: {
          color: string | null;
          created_at: string | null;
          icon: string | null;
          id: string | null;
          itens: number | null;
          title: string | null;
          track_id: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Relationships: [];
      };
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
      gcal_aplicar_lote: {
        Args: {
          p_calendar: string;
          p_completo: boolean;
          p_eventos: Json;
          p_remover: string[];
          p_sync_token: string | null;
          p_user: string;
        };
        Returns: undefined;
      };
      gcal_ler_refresh_token: { Args: { p_user: string }; Returns: string | null };
      gcal_marcar_conexao: {
        Args: { p_erro: string | null; p_status: string; p_user: string };
        Returns: undefined;
      };
      gcal_remover_conexao: { Args: { p_user: string }; Returns: undefined };
      gcal_salvar_conexao: {
        Args: { p_refresh_token: string; p_scopes: string[]; p_user: string };
        Returns: undefined;
      };
      gcal_travar_agenda: {
        Args: { p_calendar: string; p_segundos: number; p_user: string };
        Returns: boolean;
      };
      minha_conexao_google: {
        Args: Record<PropertyKey, never>;
        Returns: {
          last_error: string | null;
          last_synced_at: string | null;
          scopes: string[];
          status: string;
        }[];
      };
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
