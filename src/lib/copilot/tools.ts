import type { SupabaseClient } from '@supabase/supabase-js';

// Every tool here is read-only except escalate_to_human, which only ever
// creates a support_tickets row (the same table/flow the existing Support
// page already uses) for a human to act on — nothing here moves money,
// releases escrow, reassigns a driver, or marks a delivery complete. Those
// actions only exist through the app's own confirmed UI flows.
//
// Every query is scoped to the authenticated caller's own id server-side —
// never to an id the model/user supplies — so a tool call can only ever
// return data the caller is already allowed to see.

export interface ToolContext {
  supabase: SupabaseClient;
  userId: string;
  profileId: string | null; // profiles.id, resolved once per request
  role: string;
}

async function resolveProfileId(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await supabase.from('profiles').select('id').eq('user_id', userId).single();
  return (data as any)?.id ?? null;
}

// ── Orders (farmer + buyer) ─────────────────────────────────────────────────

export async function get_order_status(ctx: ToolContext, args: { orderId?: string }) {
  const { supabase, userId, profileId, role } = ctx;
  let query = (supabase.from as any)('orders')
    .select('id, crop_type, quantity_kg, unit_price, total_amount, status, created_at, confirmed_at, dispatched_at, delivered_at, completed_at, cancelled_at, disputed_at')
    .order('created_at', { ascending: false })
    .limit(args.orderId ? 1 : 5);

  // Farmer sees orders where they're the seller (farmer_profile_id); buyer
  // sees orders where they're the buyer (buyer_id is auth.uid() directly).
  query = role === 'farmer'
    ? query.eq('farmer_profile_id', profileId)
    : query.eq('buyer_id', userId);

  if (args.orderId) query = query.eq('id', args.orderId);

  const { data, error } = await query;
  if (error) return { error: 'Could not look up order status.' };
  if (!data || data.length === 0) return { orders: [], note: 'No matching order found.' };
  return { orders: data };
}

export async function get_escrow_status(ctx: ToolContext, args: { orderId: string }) {
  const { supabase, userId } = ctx;
  if (!args.orderId) return { error: 'orderId is required.' };

  // Verify the order actually belongs to this user before ever touching
  // escrow_accounts — same ownership check the real escrow API enforces.
  const { data: order } = await (supabase.from as any)('orders')
    .select('id, buyer_id, farmer_profile_id, escrow_id, farmer:profiles!farmer_profile_id(user_id)')
    .eq('id', args.orderId)
    .single();
  if (!order) return { error: 'Order not found.' };
  const isBuyer  = order.buyer_id === userId;
  const isSeller = order.farmer?.user_id === userId;
  if (!isBuyer && !isSeller) return { error: 'Not your order.' };
  if (!order.escrow_id) return { status: 'not_funded', note: 'No escrow has been funded for this order yet.' };

  const { data: escrow } = await (supabase.from as any)('escrow_accounts')
    .select('status, amount, funded_at, released_at')
    .eq('id', order.escrow_id)
    .single();
  if (!escrow) return { error: 'Escrow record not found.' };
  return { status: escrow.status, amount: escrow.amount, funded_at: escrow.funded_at, released_at: escrow.released_at };
}

// ── Prices (farmer + agro_dealer) ───────────────────────────────────────────

export async function get_price(ctx: ToolContext, args: { cropType: string; district?: string }) {
  const { supabase } = ctx;
  if (!args.cropType) return { error: 'cropType is required.' };
  let query = (supabase.from as any)('market_prices')
    .select('crop_type, price_per_kg, district, source, recorded_at')
    .eq('crop_type', args.cropType.toLowerCase())
    .order('recorded_at', { ascending: false })
    .limit(5);
  if (args.district) query = query.eq('district', args.district);
  const { data, error } = await query;
  if (error) return { error: 'Could not look up prices.' };
  if (!data || data.length === 0) return { prices: [], note: `No recent recorded price for ${args.cropType}.` };
  return { prices: data };
}

// ── Delivery (buyer + transporter) ──────────────────────────────────────────

export async function get_transporter_assignment(ctx: ToolContext, args: { orderId: string }) {
  const { supabase, userId } = ctx;
  const { data: order } = await (supabase.from as any)('orders')
    .select('id, buyer_id, delivery_request_id')
    .eq('id', args.orderId)
    .eq('buyer_id', userId)
    .single();
  if (!order) return { error: 'Order not found.' };
  if (!order.delivery_request_id) return { status: 'not_created', note: 'No delivery has been arranged for this order yet.' };

  const { data: dr } = await (supabase.from as any)('delivery_requests')
    .select('status, transporter_id, pickup_district, dropoff_district, accepted_at, picked_up_at, delivered_at')
    .eq('id', order.delivery_request_id)
    .single();
  if (!dr) return { error: 'Delivery record not found.' };
  return {
    status: dr.status,
    transporterAssigned: !!dr.transporter_id,
    pickup_district: dr.pickup_district,
    dropoff_district: dr.dropoff_district,
    accepted_at: dr.accepted_at,
    picked_up_at: dr.picked_up_at,
    delivered_at: dr.delivered_at,
  };
}

export async function get_assignment_status(ctx: ToolContext, args: { deliveryId?: string }) {
  const { supabase, userId } = ctx;
  let query = (supabase.from as any)('delivery_requests')
    .select('id, status, pickup_district, dropoff_district, pickup_date, cargo_type, cargo_kg, accepted_at, picked_up_at, delivered_at, payment_status')
    .eq('transporter_id', userId)
    .order('created_at', { ascending: false })
    .limit(args.deliveryId ? 1 : 5);
  if (args.deliveryId) query = query.eq('id', args.deliveryId);
  const { data, error } = await query;
  if (error) return { error: 'Could not look up assignment status.' };
  if (!data || data.length === 0) return { assignments: [], note: 'No matching delivery assignment found.' };
  return { assignments: data };
}

export async function get_delivery_breakdown(ctx: ToolContext, args: { deliveryId: string }) {
  const { supabase, userId } = ctx;
  if (!args.deliveryId) return { error: 'deliveryId is required.' };
  const { data, error } = await (supabase.from as any)('delivery_requests')
    .select('agreed_price, estimated_fare, distance_km, commission_rate, commission_amount, driver_earnings, payment_status, status')
    .eq('id', args.deliveryId)
    .eq('transporter_id', userId)
    .single();
  if (error || !data) return { error: 'Delivery not found or not assigned to you.' };
  return data;
}

// ── Listings (agro_dealer) ──────────────────────────────────────────────────

export async function get_listing_status(ctx: ToolContext, args: { productId?: string }) {
  const { supabase, profileId } = ctx;
  let query = (supabase.from as any)('supplier_products')
    .select('id, name, price_per_unit, unit, stock_qty, is_available, created_at')
    .eq('supplier_id', profileId)
    .order('created_at', { ascending: false })
    .limit(args.productId ? 1 : 10);
  if (args.productId) query = query.eq('id', args.productId);
  const { data, error } = await query;
  if (error) return { error: 'Could not look up listing status.' };
  if (!data || data.length === 0) return { listings: [], note: 'No matching product found.' };
  return { listings: data };
}

export async function get_price_intelligence(ctx: ToolContext, args: { cropType: string }) {
  return get_price(ctx, { cropType: args.cropType });
}

// ── Universal ────────────────────────────────────────────────────────────────

export async function draft_dispute(ctx: ToolContext, args: { orderId: string; description: string }) {
  // Drafts only — never files. The real dispute is raised by the user
  // through the order page's own dispute flow, which the app already has.
  return {
    drafted: true,
    orderId: args.orderId,
    draftText: args.description,
    note: 'This is a draft. To actually raise the dispute, open the order in the app and use "Raise a dispute" there — I can\'t file it from here.',
  };
}

export async function escalate_to_human(ctx: ToolContext, args: { summary: string; category?: string; urgent?: boolean }) {
  const { supabase, userId, role } = ctx;
  if (!args.summary || args.summary.trim().length < 10) {
    return { error: 'Need a bit more detail before I can escalate this.' };
  }
  const allowedCategories = ['payments', 'marketplace', 'logistics', 'kyc', 'technical', 'account', 'other'];
  const category = allowedCategories.includes(args.category ?? '') ? args.category : 'other';

  const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('user_id', userId).single();

  const { data: ticket, error } = await (supabase.from as any)('support_tickets').insert({
    user_id: userId,
    user_name: (profile as any)?.full_name ?? 'User',
    user_role: (profile as any)?.role ?? role,
    subject: args.summary.slice(0, 100),
    category,
    description: args.summary,
    priority: args.urgent ? 'high' : 'medium',
    status: 'open',
  }).select('id').single();

  if (error) return { error: 'Could not create a support ticket right now — please contact support directly.' };
  return { escalated: true, ticketId: ticket.id, note: 'This has been sent to the Cropify support team for review.' };
}

export { resolveProfileId };
