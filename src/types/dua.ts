/**
 * TypeScript types for Dua Defterim feature
 */

export interface Dua {
  id: string; // uuid
  user_id: string; // Supabase auth user id
  title: string;
  text: string;
  is_favorite: boolean;
  created_at: number; // milliseconds (Date.now())
  updated_at: number; // milliseconds (Date.now())
}

export interface SyncQueueItem {
  id: number; // autoincrement
  dua_id: string; // uuid
  action: 'create' | 'update' | 'delete';
  payload: string; // JSON string
  created_at: number; // milliseconds (Date.now())
}

export type DuaPayload = Omit<Dua, 'user_id'>;
