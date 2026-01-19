/**
 * Preset dhikr configurations
 */

import { Dhikr } from "@/types/dhikir";


export const DHIKR_PRESETS: Dhikr[] = [
  {
    id: '1',
    slug: 'subhanallah',
    label: 'Subhanallah',
    target_count: 33,
    current_count: 0,
    status: 'active',
    started_at: Date.now(),
    completed_at: null,
  },
  {
    id: '2',
    slug: 'alhamdulillah',
    label: 'Alhamdulillah',
    target_count: 33,
    current_count: 0,
    status: 'active',
    started_at: Date.now(),
    completed_at: null,
  },
  {
    id: '3',
    slug: 'allahuakbar',
    label: 'Allahu Akbar',
    target_count: 33,
    current_count: 0,
    status: 'active',
    started_at: Date.now(),
    completed_at: null,
  },
];

