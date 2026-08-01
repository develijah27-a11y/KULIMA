import type { SupabaseClient } from '@supabase/supabase-js';

export type PosPermission = 'checkout' | 'refund' | 'discount' | 'view_reports' | 'manage_inventory';

export interface PosActor {
  kind: 'owner' | 'staff';
  ownerId: string;       // profiles.id of the store owner
  storeId: string | null; // the actor's assigned store (staff) or null (owner — sees their primary store)
  staffId: string | null; // pos_staff.id, null for the owner
  permissions: PosPermission[]; // owner implicitly has every permission; check via hasPermission()
}

export function hasPermission(actor: PosActor, permission: PosPermission): boolean {
  return actor.kind === 'owner' || actor.permissions.includes(permission);
}

/**
 * Resolves whether the calling user is the store owner (a 'supplier'
 * profile — implicit all-permissions) or an active 'pos_staff' account
 * (permission-gated). Returns null if neither, so callers can 403 cleanly.
 * Every POS route that isn't pure checkout-by-the-owner should call this
 * and check hasPermission() before acting — never trust a hidden client
 * button as the only gate.
 */
export async function getPosActor(admin: SupabaseClient, userId: string): Promise<PosActor | null> {
  const { data: profile } = await (admin.from as any)('profiles')
    .select('id, role, roles').eq('user_id', userId).single();

  const isSupplier = profile?.role === 'supplier' || (profile?.roles ?? []).includes('supplier');
  if (profile && isSupplier) {
    return { kind: 'owner', ownerId: profile.id, storeId: null, staffId: null, permissions: [] };
  }

  const { data: staff } = await (admin.from as any)('pos_staff')
    .select('id, owner_id, store_id, permissions, is_active').eq('user_id', userId).maybeSingle();
  if (staff && staff.is_active) {
    return { kind: 'staff', ownerId: staff.owner_id, storeId: staff.store_id, staffId: staff.id, permissions: staff.permissions ?? [] };
  }

  return null;
}
