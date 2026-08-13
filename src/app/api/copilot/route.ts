import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { buildCopilotSystemPrompt, type CopilotUserContext } from '@/lib/copilot/prompt';
import * as tools from '@/lib/copilot/tools';
import type { ToolContext } from '@/lib/copilot/tools';

// Maps the app's internal profile role to the Copilot's public-facing role
// label. Only these four are supported — anything else (pathologist,
// offtaker, groups, admin) isn't wired up: those roles' data model and
// safe tool set were never designed, so rather than guess at scope for
// them, they're declined explicitly below instead of half-built.
const SUPPORTED_ROLES: Record<string, CopilotUserContext['role']> = {
  farmer: 'farmer',
  buyer: 'buyer',
  transporter: 'transporter',
  supplier: 'agro_dealer',
};

// Tool schemas sent to OpenAI, gated per role — a transporter's model
// literally cannot call get_price because it's never in its tool list,
// not because a prompt instruction tells it not to.
const TOOL_SCHEMAS: Record<CopilotUserContext['role'], any[]> = {
  farmer: [
    { type: 'function', function: { name: 'get_order_status', description: "Get status of the farmer's own orders. Omit orderId for their most recent orders.", parameters: { type: 'object', properties: { orderId: { type: 'string' } } } } },
    { type: 'function', function: { name: 'get_escrow_status', description: 'Get escrow status for one of the farmer\'s own orders.', parameters: { type: 'object', properties: { orderId: { type: 'string' } }, required: ['orderId'] } } },
    { type: 'function', function: { name: 'get_price', description: 'Look up recent recorded market prices for a crop.', parameters: { type: 'object', properties: { cropType: { type: 'string' }, district: { type: 'string' } }, required: ['cropType'] } } },
    { type: 'function', function: { name: 'escalate_to_human', description: 'Create a support ticket for a human to review.', parameters: { type: 'object', properties: { summary: { type: 'string' }, category: { type: 'string', enum: ['payments', 'marketplace', 'logistics', 'kyc', 'technical', 'account', 'other'] }, urgent: { type: 'boolean' } }, required: ['summary'] } } },
  ],
  buyer: [
    { type: 'function', function: { name: 'get_order_status', description: "Get status of the buyer's own orders. Omit orderId for their most recent orders.", parameters: { type: 'object', properties: { orderId: { type: 'string' } } } } },
    { type: 'function', function: { name: 'get_escrow_status', description: 'Get escrow status for one of the buyer\'s own orders.', parameters: { type: 'object', properties: { orderId: { type: 'string' } }, required: ['orderId'] } } },
    { type: 'function', function: { name: 'get_transporter_assignment', description: "Get transporter assignment status for one of the buyer's orders.", parameters: { type: 'object', properties: { orderId: { type: 'string' } }, required: ['orderId'] } } },
    { type: 'function', function: { name: 'draft_dispute', description: 'Draft (not file) dispute text for an order.', parameters: { type: 'object', properties: { orderId: { type: 'string' }, description: { type: 'string' } }, required: ['orderId', 'description'] } } },
    { type: 'function', function: { name: 'escalate_to_human', description: 'Create a support ticket for a human to review.', parameters: { type: 'object', properties: { summary: { type: 'string' }, category: { type: 'string', enum: ['payments', 'marketplace', 'logistics', 'kyc', 'technical', 'account', 'other'] }, urgent: { type: 'boolean' } }, required: ['summary'] } } },
  ],
  transporter: [
    { type: 'function', function: { name: 'get_assignment_status', description: "Get the transporter's own delivery assignment status. Omit deliveryId for their most recent assignments.", parameters: { type: 'object', properties: { deliveryId: { type: 'string' } } } } },
    { type: 'function', function: { name: 'get_delivery_breakdown', description: 'Get itemized payment breakdown for one of the transporter\'s own deliveries.', parameters: { type: 'object', properties: { deliveryId: { type: 'string' } }, required: ['deliveryId'] } } },
    { type: 'function', function: { name: 'escalate_to_human', description: 'Create a support ticket for a human to review.', parameters: { type: 'object', properties: { summary: { type: 'string' }, category: { type: 'string', enum: ['payments', 'marketplace', 'logistics', 'kyc', 'technical', 'account', 'other'] }, urgent: { type: 'boolean' } }, required: ['summary'] } } },
  ],
  agro_dealer: [
    { type: 'function', function: { name: 'get_listing_status', description: "Get the dealer's own product listing status. Omit productId for all their listings.", parameters: { type: 'object', properties: { productId: { type: 'string' } } } } },
    { type: 'function', function: { name: 'get_price_intelligence', description: 'Look up recent recorded market prices for a crop/product, to help set competitive pricing.', parameters: { type: 'object', properties: { cropType: { type: 'string' } }, required: ['cropType'] } } },
    { type: 'function', function: { name: 'escalate_to_human', description: 'Create a support ticket for a human to review.', parameters: { type: 'object', properties: { summary: { type: 'string' }, category: { type: 'string', enum: ['payments', 'marketplace', 'logistics', 'kyc', 'technical', 'account', 'other'] }, urgent: { type: 'boolean' } }, required: ['summary'] } } },
  ],
};

const TOOL_IMPL: Record<string, (ctx: ToolContext, args: any) => Promise<any>> = {
  get_order_status: tools.get_order_status,
  get_escrow_status: tools.get_escrow_status,
  get_price: tools.get_price,
  get_transporter_assignment: tools.get_transporter_assignment,
  get_assignment_status: tools.get_assignment_status,
  get_delivery_breakdown: tools.get_delivery_breakdown,
  get_listing_status: tools.get_listing_status,
  get_price_intelligence: tools.get_price_intelligence,
  draft_dispute: tools.draft_dispute,
  escalate_to_human: tools.escalate_to_human,
};

const MAX_TOOL_ROUNDS = 4;
const MAX_HISTORY_MESSAGES = 12;

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Every call costs real OpenAI usage — cap per-user request rate.
  if (!(await rateLimit(`copilot:${user.id}`, 20, 300))) {
    return NextResponse.json({ error: 'Too many messages. Please wait a moment and try again.' }, { status: 429 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Copilot is not configured yet.' }, { status: 503 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const { message, history } = body ?? {};
  if (!message || typeof message !== 'string' || !message.trim()) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role, location')
    .eq('user_id', user.id)
    .single();

  const internalRole = (profile as any)?.role as string | undefined;
  const copilotRole = internalRole ? SUPPORTED_ROLES[internalRole] : undefined;

  if (!copilotRole) {
    return NextResponse.json({
      reply: "The Copilot isn't available for your account type yet — please use Support if you need help.",
      unsupported: true,
    });
  }

  const profileId = (profile as any)?.id ?? null;
  const displayName = (profile as any)?.full_name ?? 'there';
  const region = (profile as any)?.location ?? null;

  // Live counts, not fabricated — same ownership pattern as the tools below.
  let activeOrderCount = 0;
  let activeEscrowCount = 0;
  try {
    if (copilotRole === 'farmer') {
      const { count } = await (supabase.from as any)('orders')
        .select('id', { count: 'exact', head: true })
        .eq('farmer_profile_id', profileId)
        .in('status', ['pending', 'confirmed', 'awaiting_payment', 'paid', 'dispatched', 'in_transit']);
      activeOrderCount = count ?? 0;
    } else if (copilotRole === 'buyer') {
      const { count } = await (supabase.from as any)('orders')
        .select('id', { count: 'exact', head: true })
        .eq('buyer_id', user.id)
        .in('status', ['pending', 'confirmed', 'awaiting_payment', 'paid', 'dispatched', 'in_transit']);
      activeOrderCount = count ?? 0;
      // escrow_accounts_status_check: pending | funded | released | refunded | disputed
      const { count: escrowCount } = await (supabase.from as any)('escrow_accounts')
        .select('id', { count: 'exact', head: true })
        .eq('buyer_user_id', user.id)
        .eq('status', 'funded');
      activeEscrowCount = escrowCount ?? 0;
    } else if (copilotRole === 'transporter') {
      // delivery_requests_status_check: open | assigned | in_transit | delivered | cancelled
      const { count } = await (supabase.from as any)('delivery_requests')
        .select('id', { count: 'exact', head: true })
        .eq('transporter_id', user.id)
        .in('status', ['assigned', 'in_transit']);
      activeOrderCount = count ?? 0;
    } else if (copilotRole === 'agro_dealer') {
      const { count } = await (supabase.from as any)('supplier_orders')
        .select('id', { count: 'exact', head: true })
        .eq('supplier_id', profileId)
        .in('status', ['pending', 'confirmed']);
      activeOrderCount = count ?? 0;
    }
  } catch {
    // Non-fatal — the model is told to say "not sure" rather than fabricate anyway.
  }

  const ctx: ToolContext = { supabase, userId: user.id, profileId, role: copilotRole };
  const systemPrompt = buildCopilotSystemPrompt({ displayName, role: copilotRole, activeOrderCount, activeEscrowCount, region });
  const toolSchemas = TOOL_SCHEMAS[copilotRole];

  const trimmedHistory = Array.isArray(history) ? history.slice(-MAX_HISTORY_MESSAGES) : [];
  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    ...trimmedHistory.filter((m: any) => m?.role === 'user' || m?.role === 'assistant').map((m: any) => ({ role: m.role, content: String(m.content ?? '').slice(0, 2000) })),
    { role: 'user', content: message.slice(0, 2000) },
  ];

  try {
    let round = 0;
    while (round < MAX_TOOL_ROUNDS) {
      round++;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 600,
          messages,
          tools: toolSchemas,
        }),
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return NextResponse.json({ error: 'Copilot is temporarily unavailable. Please try again.' }, { status: 502 });
      }

      const json = await res.json();
      const choice = json.choices?.[0];
      const assistantMsg = choice?.message;
      if (!assistantMsg) {
        return NextResponse.json({ error: 'Copilot is temporarily unavailable. Please try again.' }, { status: 502 });
      }

      const toolCalls = assistantMsg.tool_calls;
      if (!toolCalls || toolCalls.length === 0) {
        return NextResponse.json({ reply: assistantMsg.content ?? '' });
      }

      messages.push(assistantMsg);
      for (const call of toolCalls) {
        const fn = TOOL_IMPL[call.function?.name];
        let result: any;
        if (!fn) {
          result = { error: 'Unknown tool.' };
        } else {
          let args: any = {};
          try { args = JSON.parse(call.function.arguments || '{}'); } catch { /* leave empty */ }
          try {
            result = await fn(ctx, args);
          } catch {
            result = { error: 'That lookup failed. Please try again or ask to escalate to a human.' };
          }
        }
        messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
      }
      // Loop again so the model can produce a final answer from the tool results.
    }

    return NextResponse.json({ reply: "I wasn't able to finish looking that up — please try rephrasing, or ask me to escalate to a human." });
  } catch (err) {
    return NextResponse.json({ error: 'Copilot is temporarily unavailable. Please try again.' }, { status: 502 });
  }
}
