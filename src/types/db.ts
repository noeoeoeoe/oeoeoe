/**
 * Database types. Hand-written to mirror supabase/schema.sql.
 *
 * Once your Supabase project exists you can regenerate this file precisely with:
 *   npx supabase gen types typescript --project-id <ref> > src/types/db.ts
 * Until then, keep this in sync with the SQL schema by hand.
 */

export type Errand = {
  id: string;
  user_id: string;
  title: string;
  done: boolean;
  due_date: string | null; // ISO date (yyyy-mm-dd)
  created_at: string; // ISO timestamp
};

export type Workout = {
  id: string;
  user_id: string;
  name: string; // e.g. "Push day", "Legs", "5k run"
  performed_at: string; // ISO timestamp
  duration_min: number | null;
  notes: string | null;
  created_at: string;
};

export type Meal = {
  id: string;
  user_id: string;
  description: string;
  calories: number | null;
  eaten_at: string; // ISO timestamp
  created_at: string;
};

export type WeightEntry = {
  id: string;
  user_id: string;
  weight_kg: number;
  measured_on: string; // ISO date (yyyy-mm-dd), one per day
  created_at: string;
};

/** Shape passed to Supabase `insert` — server fills id/user_id/created_at via defaults. */
type Insert<T> = Omit<T, 'id' | 'user_id' | 'created_at'>;

type TableConfig<Row> = {
  Row: Row;
  Insert: Insert<Row>;
  Update: Partial<Insert<Row>>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      errands: TableConfig<Errand>;
      workouts: TableConfig<Workout>;
      meals: TableConfig<Meal>;
      weight_entries: TableConfig<WeightEntry>;
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
