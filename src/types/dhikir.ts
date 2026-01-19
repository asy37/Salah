/**
 * Dhikr type for frontend usage
 * Uses number (milliseconds) for timestamps to match SQLite storage
 * Note: user_id is NOT part of this type - it's only used during persistence/sync
 */
export type Dhikr = {
  id: string;                 // uuid
  slug: string;               // 'subhanallah'
  label: string;              // 'SubhanAllah'
  target_count: number;       // 100
  current_count: number;      // 20
  status: 'active' | 'completed';
  started_at: number;         // milliseconds (Date.now())
  completed_at: number | null; // milliseconds (Date.now()) | null
}

export type DhikrStats = {
  week: {
    completed: number;
    active: number;
  };
  month: {
    completed: number;
    active: number;
  };
  year: {
    completed: number;
    active: number;
  };
}