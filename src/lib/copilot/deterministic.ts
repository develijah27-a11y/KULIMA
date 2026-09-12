import { ToolContext } from './tools';
import * as tools from './tools';

const CROPS = [
  'maize', 'corn', 'beans', 'bean', 'coffee', 'banana', 'bananas', 'cassava',
  'tomato', 'tomatoes', 'rice', 'sorghum', 'groundnuts', 'peanuts', 'cotton',
  'sweet potato', 'potatoes', 'onion', 'onions', 'cabbage', 'millet',
];

const UGANDA_DISTRICTS = [
  'kampala', 'wakiso', 'mbarara', 'jinja', 'gulu', 'lira', 'mbale', 'masaka',
  'mukono', 'kasese', 'arua', 'hoima', 'soroti', 'kabale', 'fort portal',
  'tororo', 'busia', 'kayunga', 'luwero', 'mubende', 'nakasongola', 'kyenjojo',
];

const CROP_ADVISORY: Record<string, string> = {
  yellow_spots: 'Yellow spots on bean or crop leaves commonly indicate Angular Leaf Spot, Rust, or Bean Common Mosaic Virus. Early stages can also reflect nutrient deficiency (nitrogen or magnesium) or water stress. Recommended steps: 1) Inspect the underside of leaves for powdery fungal pustules. 2) Remove severely infected foliage to prevent spread. 3) Avoid overhead sprinkler watering that wets leaves. 4) Use the Crop Doctor camera scan in the app for an accurate visual diagnosis. Confirm with your local agro-dealer or extension officer before applying any fungicide or chemical treatment.',
  armyworm: 'Signs of leaf skeletonizing or ragged holes with sawdust-like frass on maize typically indicate Fall Armyworm. Recommended steps: 1) Handpick caterpillars in small plots or apply approved organic/biological controls like neem extracts or Bacillus thuringiensis early morning or late evening. 2) For heavy infestations, consult your agro-dealer for registered pesticides. Confirm with your local agro-dealer or extension officer before applying any chemical treatment.',
  blight: 'Leaf blight (early or late) causes brown/black water-soaked lesions that spread rapidly during humid or wet weather. Recommended steps: 1) Space plants for air circulation. 2) Avoid handling wet plants. 3) Apply copper-based fungicides if caught early. 4) Confirm with your local agro-dealer or extension officer before applying any chemical.',
  wilt: 'Wilting plants with yellowing leaves often indicate Bacterial Wilt or Fusarium Wilt, frequently transmitted through infected soil or tools. Recommended steps: 1) Immediately uproot and safely destroy infected plants (do not compost). 2) Disinfect farm tools with bleach solution. 3) Practice crop rotation with non-host crops. Confirm with your local agro-dealer or extension officer before applying soil treatments.',
};

export async function handleDeterministicCopilot(
  ctx: ToolContext,
  userMessage: string,
  userName: string
): Promise<string> {
  const msg = userMessage.toLowerCase().trim();
  const role = ctx.role;

  // 1. Escalate to Human / Support Ticket
  if (
    msg.includes('escalate') ||
    msg.includes('human agent') ||
    msg.includes('talk to someone') ||
    msg.includes('customer care') ||
    msg.includes('support team') ||
    msg.includes('file a ticket')
  ) {
    const res = await tools.escalate_to_human(ctx, {
      summary: userMessage.length >= 10 ? userMessage : 'User requested human assistance via Copilot',
      category: 'other',
      urgent: msg.includes('urgent') || msg.includes('emergency'),
    });
    if (res.escalated) {
      return `I have opened a support ticket for you with Cropify Support (Ticket #${res.ticketId.slice(0, 8)}). Our support team will review this and follow up directly in your Support tab.`;
    }
    return 'I attempted to open a support ticket, but encountered an issue. Please navigate to the Support tab directly to submit your request.';
  }

  // 2. Dispute Draft
  if (
    msg.includes('dispute') ||
    msg.includes('did not deliver') ||
    msg.includes('wrong order') ||
    msg.includes('damaged goods') ||
    msg.includes('fake') ||
    msg.includes('not match')
  ) {
    const uuidMatch = userMessage.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    const orderId = uuidMatch ? uuidMatch[0] : '';
    const res = await tools.draft_dispute(ctx, {
      orderId: orderId || 'Pending selection',
      description: userMessage,
    });
    return `${res.note}\n\nDraft Dispute Summary: "${res.draftText}"`;
  }

  // 3. Orders status check (Farmer & Buyer)
  if (
    msg.includes('order') ||
    msg.includes('purchase') ||
    msg.includes('bought') ||
    msg.includes('sold') ||
    msg.includes('tracking')
  ) {
    const uuidMatch = userMessage.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    const orderId = uuidMatch ? uuidMatch[0] : undefined;

    const res = await tools.get_order_status(ctx, { orderId });
    if (res.error) return res.error;
    if (!res.orders || res.orders.length === 0) {
      return 'You currently have no recorded orders in the system. When you place or receive orders, they will appear here with live tracking.';
    }

    if (res.orders.length === 1) {
      const o = res.orders[0];
      const amount = Number(o.total_amount || 0).toLocaleString();
      return `Order #${o.id.slice(0, 8)}:\n- Crop: ${o.crop_type}\n- Quantity: ${o.quantity_kg} kg\n- Total: UGX ${amount}\n- Status: ${o.status}\n- Created: ${new Date(o.created_at).toLocaleDateString()}`;
    }

    const list = res.orders.slice(0, 3).map((o: any) => {
      const amount = Number(o.total_amount || 0).toLocaleString();
      return `• Order #${o.id.slice(0, 8)}: ${o.crop_type} (${o.quantity_kg} kg) - UGX ${amount} [Status: ${o.status}]`;
    }).join('\n');

    return `Here are your most recent orders:\n${list}\n\nTo view escrow details for any order, ask "Check escrow for order <ID>".`;
  }

  // 4. Escrow status check
  if (
    msg.includes('escrow') ||
    msg.includes('funds') ||
    msg.includes('payout') ||
    msg.includes('payment held') ||
    msg.includes('money released')
  ) {
    const uuidMatch = userMessage.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (!uuidMatch) {
      // Find latest order first
      const ordRes = await tools.get_order_status(ctx, {});
      if (ordRes.orders && ordRes.orders.length > 0) {
        const latest = ordRes.orders[0];
        const escRes = await tools.get_escrow_status(ctx, { orderId: latest.id });
        if (escRes.status) {
          return `Escrow status for your latest order (#${latest.id.slice(0, 8)}):\n- Status: ${escRes.status}\n- Amount: UGX ${Number(escRes.amount || latest.total_amount || 0).toLocaleString()}\n${escRes.released_at ? `- Released at: ${new Date(escRes.released_at).toLocaleDateString()}` : '- Funds are held securely until delivery confirmation.'}`;
        }
      }
      return 'Please specify the Order ID to check escrow status (e.g. "Check escrow for order <order-id>").';
    }

    const escRes = await tools.get_escrow_status(ctx, { orderId: uuidMatch[0] });
    if (escRes.error) return escRes.error;
    return `Escrow status for Order #${uuidMatch[0].slice(0, 8)}:\n- Status: ${escRes.status}\n- Amount: UGX ${Number(escRes.amount || 0).toLocaleString()}\n${escRes.released_at ? `- Released on: ${new Date(escRes.released_at).toLocaleDateString()}` : '- Funds remain safely in escrow until you confirm delivery.'}`;
  }

  // 5. Market Prices (Farmer, Buyer, Agro-dealer)
  if (
    msg.includes('price') ||
    msg.includes('market') ||
    msg.includes('cost') ||
    msg.includes('rate') ||
    msg.includes('how much')
  ) {
    let matchedCrop = CROPS.find((c) => msg.includes(c));
    if (!matchedCrop && role === 'farmer') matchedCrop = 'maize';
    if (!matchedCrop && role === 'agro_dealer') matchedCrop = 'maize';

    let matchedDistrict = UGANDA_DISTRICTS.find((d) => msg.includes(d));

    if (matchedCrop) {
      // Normalize plural
      let normalized = matchedCrop;
      if (normalized === 'corn') normalized = 'maize';
      if (normalized === 'beans') normalized = 'beans';
      if (normalized === 'tomatoes') normalized = 'tomato';
      if (normalized === 'bananas') normalized = 'banana';
      if (normalized === 'onions') normalized = 'onion';

      const res = await tools.get_price(ctx, { cropType: normalized, district: matchedDistrict });
      if (res.prices && res.prices.length > 0) {
        const lines = res.prices.map((p: any) => {
          return `• ${p.crop_type.toUpperCase()} in ${p.district || 'National'}: UGX ${Number(p.price_per_kg).toLocaleString()} / kg (Recorded: ${new Date(p.recorded_at).toLocaleDateString()})`;
        }).join('\n');
        return `Current recorded market prices for ${normalized}:\n${lines}\n\nNote: Prices are based on recent market survey records and fluctuate based on supply and quality.`;
      }
      return `No recent market price survey is recorded yet for ${normalized}${matchedDistrict ? ` in ${matchedDistrict}` : ''}. Check the Market tab for latest updates.`;
    }

    return 'Which crop would you like to check prices for? You can ask about maize, beans, coffee, banana, cassava, tomato, or rice.';
  }

  // 6. Transporter assignments & deliveries
  if (role === 'transporter' || msg.includes('assignment') || msg.includes('delivery') || msg.includes('trip') || msg.includes('cargo')) {
    if (role === 'transporter') {
      const res = await tools.get_assignment_status(ctx, {});
      if (res.error) return res.error;
      if (!res.assignments || res.assignments.length === 0) {
        return 'You have no active delivery assignments right now. Browse open delivery requests on the Deliveries board to accept new cargo.';
      }
      const list = res.assignments.slice(0, 3).map((a: any) => {
        return `• Trip #${a.id.slice(0, 8)}: ${a.cargo_type} (${a.cargo_kg || 0} kg) from ${a.pickup_district} to ${a.dropoff_district} [Status: ${a.status}]`;
      }).join('\n');
      return `Your current delivery assignments:\n${list}`;
    }

    // Buyer checking transporter assignment for an order
    const uuidMatch = userMessage.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (uuidMatch) {
      const res = await tools.get_transporter_assignment(ctx, { orderId: uuidMatch[0] });
      if (res.error) return res.error;
      return `Delivery status for Order #${uuidMatch[0].slice(0, 8)}:\n- Status: ${res.status}\n- Transporter Assigned: ${res.transporterAssigned ? 'Yes' : 'Looking for nearby driver'}\n- Route: ${res.pickup_district || 'Origin'} to ${res.dropoff_district || 'Destination'}`;
    }
  }

  // 7. Agro-dealer listing status
  if (role === 'agro_dealer' && (msg.includes('listing') || msg.includes('inventory') || msg.includes('stock') || msg.includes('product'))) {
    const res = await tools.get_listing_status(ctx, {});
    if (res.error) return res.error;
    if (!res.listings || res.listings.length === 0) {
      return 'You have no listed supplies in your store yet. Add inventory from your Supplier Dashboard to make products visible to farmers.';
    }
    const list = res.listings.slice(0, 5).map((l: any) => {
      return `• ${l.name}: UGX ${Number(l.price_per_unit).toLocaleString()} / ${l.unit} (Stock: ${l.stock_qty} ${l.is_available ? 'Available' : 'Out of stock'})`;
    }).join('\n');
    return `Your active product listings:\n${list}`;
  }

  // 8. Agricultural Advice & Disease Guidance (Farmer)
  if (msg.includes('yellow') || msg.includes('spot') || msg.includes('leaves') || msg.includes('leaf')) {
    return CROP_ADVISORY.yellow_spots;
  }
  if (msg.includes('armyworm') || msg.includes('caterpillar') || msg.includes('holes in maize')) {
    return CROP_ADVISORY.armyworm;
  }
  if (msg.includes('blight') || msg.includes('brown spot') || msg.includes('fungus') || msg.includes('fungal')) {
    return CROP_ADVISORY.blight;
  }
  if (msg.includes('wilt') || msg.includes('wilting') || msg.includes('dying')) {
    return CROP_ADVISORY.wilt;
  }

  // 9. Greeting / General Help
  if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey') || msg.includes('good morning') || msg.includes('good afternoon')) {
    const roleHints: Record<string, string> = {
      farmer: 'I can help you check your order statuses, verify escrow payments, look up live market crop prices, or guide you on crop management.',
      buyer: 'I can help you track your orders, verify escrow status, check transporter assignments, or prepare a dispute draft.',
      transporter: 'I can help you review your active delivery assignments, check pickup/dropoff routes, or inspect payment breakdowns.',
      agro_dealer: 'I can help you check your inventory listings, look up market price benchmarks, or review supplier orders.',
    };
    return `Hello ${userName || 'there'}. I am your Cropify Copilot. ${roleHints[role] || 'How can I assist you today?'}`;
  }

  // 10. Default Advisory Response
  return `I am here to assist with your Cropify account. You can ask about:
- Live status of your orders or deliveries
- Escrow protection and payment verification
- Current market prices for maize, beans, coffee, and other crops
- Pest, disease, and agronomic management for smallholder farms
- Opening a direct inquiry with Support

What would you like to check?`;
}
