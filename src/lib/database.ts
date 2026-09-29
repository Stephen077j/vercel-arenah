// Compatibility shim - re-exports for legacy imports
export type { User } from '@/backend/models/types';

// Minimal db placeholder kept for backward compatibility.
// All real data access has migrated to Lovable Cloud (Supabase).
export const db = {} as Record<string, unknown>;
