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

export interface ChatHistoryMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function handleDeterministicCopilot(
  ctx: ToolContext,
  userMessage: string,
  userName: string,
  history: ChatHistoryMessage[] = []
): Promise<string> {
  const msg = userMessage.toLowerCase().trim();
  const role = ctx.role;

  // Extract potential UUID or 8-character ID prefix
  const uuidMatch = userMessage.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  const shortIdMatch = userMessage.match(/#?([0-9a-f]{8})/i);
  const extractedId = uuidMatch ? uuidMatch[0] : (shortIdMatch ? shortIdMatch[1] : null);

  // Check multi-turn conversation context from history
  const recentAssistantMsg = history.slice().reverse().find(m => m.role === 'assistant')?.content.toLowerCase() || '';
  const isAwaitingComplaintDetails =
    recentAssistantMsg.includes('file an official support ticket') ||
    recentAssistantMsg.includes('what happened') ||
    recentAssistantMsg.includes('tell me what is wrong') ||
    recentAssistantMsg.includes('complaint') ||
    recentAssistantMsg.includes('ticket');
  const isAwaitingCropName = recentAssistantMsg.includes('which crop would you like to check prices for');

  // ==========================================================================
  // 1. FOUNDER, CREATOR & PLATFORM IDENTITY
  // ==========================================================================
  if (
    msg.includes('founder') ||
    msg.includes('fouder') ||
    msg.includes('creator') ||
    msg.includes('created you') ||
    msg.includes('made you') ||
    msg.includes('who built') ||
    msg.includes('who started') ||
    msg.includes('who owns') ||
    msg.includes('who is behind') ||
    msg.includes('ceo') ||
    msg.includes('author') ||
    msg.includes('developer') ||
    msg.includes('who are you') ||
    msg.includes('what is cropify') ||
    msg.includes('about cropify')
  ) {
    return `Cropify was founded and developed by **Kwagala Elijah Hannington** (develijah27), an AgriTech software engineer based in Uganda.

**About Cropify:**
Cropify is an agricultural marketplace and logistics ecosystem designed to empower farmers, buyers, transporters, and agro-dealers across Uganda:
• **Escrow-Protected Payments**: Funds are held securely via PrimePay (MTN Mobile Money & Airtel Money) until delivery is confirmed.
• **Reliable Transport Network**: Direct connection between verified transporters and cargo owners.
• **Market Transparency**: Real-time district crop price tracking.
• **AI Crop Doctor & Tele-Agronomy**: Fast disease identification and verified plant pathologist consultations.

As your Cropify Copilot, I assist you with real-time delivery status, payment breakdowns, market prices, and dispute escalation!`;
  }

  // ==========================================================================
  // 2. LIVE TIME & DATE IN UGANDA (EAT, UTC+3)
  // ==========================================================================
  if (
    msg.includes('time right now') ||
    msg.includes('what is the time') ||
    msg.includes('what time is it') ||
    msg.includes('current time') ||
    msg.includes('tell me the time') ||
    msg.includes('today\'s date') ||
    msg.includes('what date is it') ||
    msg.includes('what day is today') ||
    msg.includes('what is the date')
  ) {
    const now = new Date();
    const timeUG = new Intl.DateTimeFormat('en-UG', {
      timeZone: 'Africa/Kampala',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(now);

    const dateUG = new Intl.DateTimeFormat('en-UG', {
      timeZone: 'Africa/Kampala',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(now);

    return `The current local time in Uganda is **${timeUG} EAT** on **${dateUG}**.

• **Support & Dispatch Hours**: 8:00 AM – 6:00 PM EAT.
• **Urgent Escalations & Security**: Monitored 24/7.
• **Mobile Money Escrow**: Operational 24/7 via PrimePay (MTN & Airtel).`;
  }

  // ==========================================================================
  // 3. COMPLAINTS, SUPPORT ESCALATION & DISPUTES
  // ==========================================================================
  const isComplaintIntent =
    msg.includes('complaint') ||
    msg.includes('raise a complaint') ||
    msg.includes('file a complaint') ||
    msg.includes('make a complaint') ||
    msg.includes('report an issue') ||
    msg.includes('i have a problem') ||
    msg.includes('i have an issue') ||
    msg.includes('bad service') ||
    msg.includes('damaged') ||
    msg.includes('damage') ||
    msg.includes('damaged cargo') ||
    msg.includes('goods damaged') ||
    msg.includes('driver refused') ||
    msg.includes('buyer refused') ||
    msg.includes('farmer refused') ||
    msg.includes('not paid') ||
    msg.includes('scam') ||
    msg.includes('fraud') ||
    msg.includes('cheated') ||
    msg.includes('escalate') ||
    msg.includes('human agent') ||
    msg.includes('talk to someone') ||
    msg.includes('customer care') ||
    msg.includes('support team') ||
    msg.includes('file a ticket');

  if (isComplaintIntent || (isAwaitingComplaintDetails && userMessage.length > 5)) {
    // If the message has descriptive substance (or is responding to our complaint prompt)
    const hasDetailedDescription =
      userMessage.length >= 15 &&
      !msg.startsWith('i have a complaint') &&
      !msg.startsWith('i want to raise a complaint') &&
      !msg.startsWith('raise a complaint');

    if (hasDetailedDescription || isAwaitingComplaintDetails) {
      let category = 'other';
      if (msg.includes('pay') || msg.includes('money') || msg.includes('escrow') || msg.includes('wallet') || msg.includes('earn')) {
        category = 'payments';
      } else if (msg.includes('delivery') || msg.includes('driver') || msg.includes('trip') || msg.includes('cargo') || msg.includes('transporter')) {
        category = 'logistics';
      } else if (msg.includes('order') || msg.includes('product') || msg.includes('crop') || msg.includes('listing')) {
        category = 'marketplace';
      } else if (msg.includes('kyc') || msg.includes('id') || msg.includes('permit') || msg.includes('verification')) {
        category = 'kyc';
      }

      const isUrgent = msg.includes('urgent') || msg.includes('emergency') || msg.includes('stolen') || msg.includes('fraud');
      const ticketRes = await tools.escalate_to_human(ctx, {
        summary: userMessage,
        category,
        urgent: isUrgent,
      });

      if (ticketRes.escalated) {
        return `I have opened an official support ticket for you (**Ticket #${ticketRes.ticketId.slice(0, 8)}**).

Our dispatch and moderation team has been notified and will review your case.

**Direct Support Contacts:**
• **WhatsApp**: [0758984224](https://wa.me/256758984224) (Fastest for active transit issues)
• **Phone Call**: 0786857587
• **Email**: kwagalaelijahhannington@gmail.com

You can also view updates directly in your account's **Support** tab.`;
      }
    }

    // Otherwise, guide the user warmly on how to lodge their complaint
    return `I am here to assist you with filing your complaint or resolving any issue with your account.

**How would you like to proceed?**
1. **File an official ticket right now**: Reply with a brief summary of what happened (e.g., your Order/Trip ID, whether it involves payment, delayed transit, or cargo damage). I will generate an official ticket immediately.
2. **Contact Support directly**:
   • **WhatsApp**: [0758984224](https://wa.me/256758984224)
   • **Phone Call**: 0786857587
   • **Email**: kwagalaelijahhannington@gmail.com

Our support team reviews every complaint and ensures escrow protections are enforced.`;
  }

  // Dispute Draft (e.g., buyer received bad goods)
  if (
    msg.includes('dispute') ||
    msg.includes('did not deliver') ||
    msg.includes('wrong order') ||
    msg.includes('fake') ||
    msg.includes('not match')
  ) {
    const orderId = extractedId || 'Pending selection';
    const res = await tools.draft_dispute(ctx, {
      orderId,
      description: userMessage,
    });
    return `${res.note}\n\n**Draft Dispute Summary:** "${res.draftText}"`;
  }

  // ==========================================================================
  // 4. TRANSPORTER EARNINGS & PAYMENT BREAKDOWN
  // ==========================================================================
  const isEarningsOrBreakdown =
    msg.includes('break down') ||
    msg.includes('breakdown') ||
    msg.includes('earning') ||
    msg.includes('payout') ||
    msg.includes('fare') ||
    msg.includes('commission') ||
    (msg.includes('payment') && (msg.includes('trip') || msg.includes('delivery')));

  if (role === 'transporter' && isEarningsOrBreakdown) {
    const tripId = extractedId || (shortIdMatch ? shortIdMatch[1] : undefined);
    const res = await tools.get_delivery_breakdown(ctx, { deliveryId: tripId || '' });
    if (res.error) return res.error;

    return `Payment Breakdown for Trip #${tripId || 'N/A'}:
• Agreed Fare: UGX ${Number(res.agreed_price || 0).toLocaleString()}
• Platform Commission (${res.commission_rate || 10}%): -UGX ${Number(res.commission_amount || 0).toLocaleString()}
• Driver Earnings: UGX ${Number(res.driver_earnings || 0).toLocaleString()}
• Distance: ${res.distance_km || 0} km
• Status: ${res.status || 'N/A'} [Payment: ${res.payment_status || 'Pending'}]

Funds are credited directly to your Cropify Wallet once the buyer or recipient scans your dropoff QR code.`;
  }

  // ==========================================================================
  // 5. TRANSPORTER ASSIGNMENTS, TRIPS & DELIVERIES
  // ==========================================================================
  const isDeliveryQuery =
    msg.includes('assignment') ||
    msg.includes('assignments') ||
    msg.includes('delivery') ||
    msg.includes('deliveries') ||
    msg.includes('my trip') ||
    msg.includes('my trips') ||
    msg.includes('trip') ||
    msg.includes('cargo') ||
    msg.includes('what do i deliver') ||
    msg.includes('where do i deliver') ||
    msg.includes('pickup') ||
    msg.includes('dropoff') ||
    msg.includes('current assignment');

  if (role === 'transporter' && isDeliveryQuery) {
    const res = await tools.get_assignment_status(ctx, {
      deliveryId: uuidMatch ? uuidMatch[0] : undefined,
    });

    if (res.error) return res.error;
    if (!res.assignments || res.assignments.length === 0) {
      return `You currently have no delivery assignments recorded in your profile.

💡 **Next Steps:**
• Visit the **Deliveries board** in your dashboard to view and accept open cargo requests across Uganda.
• Ensure your vehicle profile and driving permit are verified in Settings.`;
    }

    // Differentiate active trips vs completed/cancelled trips
    const activeTrips = res.assignments.filter((a: any) =>
      ['assigned', 'in_transit', 'picked_up', 'pending'].includes(a.status?.toLowerCase())
    );
    const pastTrips = res.assignments.filter((a: any) =>
      ['delivered', 'cancelled', 'completed'].includes(a.status?.toLowerCase())
    );

    if (activeTrips.length > 0) {
      const activeList = activeTrips.map((a: any) => {
        return `• **Trip #${a.id.slice(0, 8)}**: ${a.cargo_type} (${a.cargo_kg || 0} kg)\n  From **${a.pickup_district}** to **${a.dropoff_district}** [Status: **${a.status}**]`;
      }).join('\n');

      return `You have **${activeTrips.length} active delivery assignment${activeTrips.length > 1 ? 's' : ''}** in progress:

${activeList}

To update trip status (e.g., mark as picked up or delivered), open the trip directly in your Deliveries tab.`;
    }

    // No active trips — show recent completed/cancelled
    const pastList = pastTrips.slice(0, 3).map((a: any) => {
      return `• **Trip #${a.id.slice(0, 8)}**: ${a.cargo_type} (${a.cargo_kg || 0} kg) from ${a.pickup_district} to ${a.dropoff_district} [Status: **${a.status}**]`;
    }).join('\n');

    return `You currently have **no active delivery assignments in transit**.

**Recent Completed & Past Trips:**
${pastList}

💡 You can accept new delivery requests anytime from your **Deliveries board**. To inspect earnings for any past trip, ask: *"Break down payment for Trip #${pastTrips[0]?.id.slice(0, 8) || 'ID'}"*.`;
  }

  // Buyer checking transporter assignment for an order
  if (role === 'buyer' && isDeliveryQuery && extractedId) {
    const res = await tools.get_transporter_assignment(ctx, { orderId: extractedId });
    if (res.error) return res.error;
    return `**Delivery Status for Order #${extractedId.slice(0, 8)}:**
• Status: **${res.status}**
• Transporter Assigned: **${res.transporterAssigned ? 'Yes' : 'Searching for nearby driver'}**
• Route: **${res.pickup_district || 'Origin'}** to **${res.dropoff_district || 'Destination'}**
${res.delivered_at ? `• Delivered at: ${new Date(res.delivered_at).toLocaleDateString()}` : ''}`;
  }

  // ==========================================================================
  // 5. TRANSPORTER EARNINGS & PAYMENT BREAKDOWN
  // ==========================================================================
  if (
    role === 'transporter' &&
    (msg.includes('breakdown') ||
     msg.includes('earning') ||
     msg.includes('earnings') ||
     msg.includes('payout') ||
     msg.includes('fare') ||
     msg.includes('commission') ||
     msg.includes('how much did i make') ||
     msg.includes('how much do i get') ||
     msg.includes('how do i get paid'))
  ) {
    if (extractedId) {
      const breakdown = await tools.get_delivery_breakdown(ctx, { deliveryId: extractedId });
      if (breakdown.error) return breakdown.error;

      return `**Payment Breakdown for Trip #${extractedId.slice(0, 8)}:**
• **Driver Earnings**: UGX ${Number(breakdown.driver_earnings || 0).toLocaleString()}
• **Agreed Trip Price**: UGX ${Number(breakdown.agreed_price || breakdown.estimated_fare || 0).toLocaleString()}
• **Estimated Distance**: ${breakdown.distance_km || 0} km
• **Cropify Commission**: ${breakdown.commission_rate || 10}% (UGX ${Number(breakdown.commission_amount || 0).toLocaleString()})
• **Payment Status**: **${breakdown.payment_status || 'pending'}** [Trip: ${breakdown.status}]

*Note: Driver earnings are credited to your Cropify Wallet once delivery is confirmed by the recipient.*`;
    }

    return `**Transporter Payouts & Earnings:**
• **Payment Protection**: When a buyer books a delivery, the delivery fare is funded into escrow.
• **Automatic Release**: As soon as the recipient confirms cargo arrival, your earnings are released directly into your Cropify Wallet.
• **Withdrawal**: You can withdraw your wallet balance at any time to **MTN Mobile Money** or **Airtel Money** via PrimePay.
• **Detailed Trip Breakdown**: To see an itemized breakdown, ask: *"Break down payment for Trip <Trip ID>"*.`;
  }

  // ==========================================================================
  // 6. ORDERS & ESCROW STATUS (FARMER & BUYER)
  // ==========================================================================
  if (
    msg.includes('order') ||
    msg.includes('purchase') ||
    msg.includes('bought') ||
    msg.includes('sold') ||
    msg.includes('tracking')
  ) {
    const orderId = extractedId || undefined;
    const res = await tools.get_order_status(ctx, { orderId });
    if (res.error) return res.error;
    if (!res.orders || res.orders.length === 0) {
      return 'You currently have no recorded orders in the system. When you place or receive orders, they will appear here with live tracking.';
    }

    if (res.orders.length === 1) {
      const o = res.orders[0];
      const amount = Number(o.total_amount || 0).toLocaleString();
      return `**Order #${o.id.slice(0, 8)} Details:**
• Crop: **${o.crop_type}** (${o.quantity_kg} kg)
• Total: **UGX ${amount}**
• Status: **${o.status}**
• Date: ${new Date(o.created_at).toLocaleDateString()}

Ask *"Check escrow for order ${o.id.slice(0, 8)}"* to verify payment security.`;
    }

    const list = res.orders.slice(0, 3).map((o: any) => {
      const amount = Number(o.total_amount || 0).toLocaleString();
      return `• **Order #${o.id.slice(0, 8)}**: ${o.crop_type} (${o.quantity_kg} kg) - UGX ${amount} [Status: **${o.status}**]`;
    }).join('\n');

    return `Here are your most recent orders:\n${list}\n\nTo view escrow details for any order, ask *"Check escrow for order <ID>"*.`;
  }

  if (
    msg.includes('escrow') ||
    msg.includes('funds held') ||
    msg.includes('payment held') ||
    msg.includes('money released')
  ) {
    if (!extractedId) {
      const ordRes = await tools.get_order_status(ctx, {});
      if (ordRes.orders && ordRes.orders.length > 0) {
        const latest = ordRes.orders[0];
        const escRes = await tools.get_escrow_status(ctx, { orderId: latest.id });
        if (escRes.status) {
          return `**Escrow Status for Latest Order (#${latest.id.slice(0, 8)}):**
• Status: **${escRes.status}**
• Amount: **UGX ${Number(escRes.amount || latest.total_amount || 0).toLocaleString()}**
${escRes.released_at ? `• Released on: ${new Date(escRes.released_at).toLocaleDateString()}` : '• Funds are safely held in escrow until delivery is confirmed.'}`;
        }
      }
      return 'Please specify the Order ID to check escrow status (e.g. *"Check escrow for order <order-id>"*).';
    }

    const escRes = await tools.get_escrow_status(ctx, { orderId: extractedId });
    if (escRes.error) return escRes.error;
    return `**Escrow Status for Order #${extractedId.slice(0, 8)}:**
• Status: **${escRes.status}**
• Amount: **UGX ${Number(escRes.amount || 0).toLocaleString()}**
${escRes.released_at ? `• Released on: ${new Date(escRes.released_at).toLocaleDateString()}` : '• Funds remain safely held in escrow until you confirm delivery.'}`;
  }

  // ==========================================================================
  // 7. MARKET PRICES & INTELLIGENCE
  // ==========================================================================
  if (
    msg.includes('price') ||
    msg.includes('market') ||
    msg.includes('cost') ||
    msg.includes('rate') ||
    msg.includes('how much') ||
    isAwaitingCropName
  ) {
    let matchedCrop = CROPS.find((c) => msg.includes(c));
    if (!matchedCrop && role === 'farmer') matchedCrop = 'maize';
    if (!matchedCrop && role === 'agro_dealer') matchedCrop = 'maize';

    const matchedDistrict = UGANDA_DISTRICTS.find((d) => msg.includes(d));

    if (matchedCrop) {
      let normalized = matchedCrop;
      if (normalized === 'corn') normalized = 'maize';
      if (normalized === 'beans') normalized = 'beans';
      if (normalized === 'tomatoes') normalized = 'tomato';
      if (normalized === 'bananas') normalized = 'banana';
      if (normalized === 'onions') normalized = 'onion';

      const res = await tools.get_price(ctx, { cropType: normalized, district: matchedDistrict });
      if (res.prices && res.prices.length > 0) {
        const lines = res.prices.map((p: any) => {
          return `• **${p.crop_type.toUpperCase()}** in ${p.district || 'National'}: **UGX ${Number(p.price_per_kg).toLocaleString()} / kg** (Recorded: ${new Date(p.recorded_at).toLocaleDateString()})`;
        }).join('\n');
        return `Current recorded market prices for **${normalized}**:\n${lines}\n\n*Note: Prices are based on recent market survey records and fluctuate based on seasonal supply and quality.*`;
      }
      return `No recent market price survey is recorded yet for **${normalized}**${matchedDistrict ? ` in ${matchedDistrict}` : ''}. Check the Market tab for latest updates.`;
    }

    return 'Which crop would you like to check prices for? You can ask about maize, beans, coffee, banana, cassava, tomato, or rice.';
  }

  // ==========================================================================
  // 8. AGRO-DEALER LISTINGS
  // ==========================================================================
  if (role === 'agro_dealer' && (msg.includes('listing') || msg.includes('inventory') || msg.includes('stock') || msg.includes('product'))) {
    const res = await tools.get_listing_status(ctx, {});
    if (res.error) return res.error;
    if (!res.listings || res.listings.length === 0) {
      return 'You have no listed supplies in your store yet. Add inventory from your Supplier Dashboard to make products visible to farmers.';
    }
    const list = res.listings.slice(0, 5).map((l: any) => {
      return `• **${l.name}**: UGX ${Number(l.price_per_unit).toLocaleString()} / ${l.unit} (Stock: ${l.stock_qty} [${l.is_available ? 'Available' : 'Out of stock'}])`;
    }).join('\n');
    return `Your active product listings:\n${list}`;
  }

  // ==========================================================================
  // 9. CROP HEALTH & DISEASE ADVICE
  // ==========================================================================
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

  // ==========================================================================
  // 10. GREETINGS & UGANDAN LOCAL CONVERSATION
  // ==========================================================================
  if (
    msg.includes('hello') ||
    msg.includes('hi') ||
    msg.includes('hey') ||
    msg.includes('good morning') ||
    msg.includes('good afternoon') ||
    msg.includes('good evening') ||
    msg.includes('oli otya') ||
    msg.includes('ki kati') ||
    msg.includes('gyebale ko') ||
    msg.includes('tusanyukidde') ||
    msg.includes('wasuze otya') ||
    msg.includes('osiibye otya')
  ) {
    const roleIntros: Record<string, string> = {
      transporter: `I can help you review your active delivery assignments, look up past trips, inspect driver earnings breakdowns, or file a route/support complaint.`,
      farmer: `I can help you track order statuses, verify escrow payments, check market crop prices across districts, or get agronomic advice.`,
      buyer: `I can help you track orders, verify escrow protection, check transporter assignments, or draft a dispute if delivered goods don't match.`,
      agro_dealer: `I can help you check inventory listings, compare market prices, or manage incoming supplier orders.`,
    };

    return `Hello **${userName || 'there'}**! (Gyebale ko!) I am your **Cropify Copilot**.

${roleIntros[role] || 'How can I assist you with your Cropify account today?'}

What would you like to check?`;
  }

  // ==========================================================================
  // 11. ROLE-TAILORED DEFAULT ADVISORY COPILOT RESPONSE
  // ==========================================================================
  if (role === 'transporter') {
    return `I am your Cropify Copilot for transport and logistics. Here is what you can ask me:

• **Delivery Assignments**: Ask *"What's my current assignment?"* to view active and past trips.
• **Payment & Earnings**: Ask *"Break down payment for Trip <Trip ID>"* or *"How do payouts work?"*.
• **Support & Complaints**: Say *"I have a complaint to raise"* or ask to file a support ticket.
• **Platform Info**: Ask *"Who is the founder of Cropify?"* or *"What is the time right now?"*.

How can I assist you today?`;
  }

  if (role === 'farmer') {
    return `I am your Cropify Copilot. Here is what I can help you with:
• **Orders**: Check live order progress and delivery tracking.
• **Escrow**: Verify that buyer funds are safely locked in escrow before dispatching.
• **Market Prices**: Check current prices for maize, beans, coffee, or tomatoes.
• **Crop Health**: Ask about pest symptoms or use the Crop Doctor camera scan.
• **Support**: Ask to file a complaint or ticket if you have any issues.

What would you like to check?`;
  }

  return `I am your Cropify Copilot. You can ask me about:
• Live status of your orders or deliveries
• Escrow protection and payment verification
• Current Uganda market prices for agricultural commodities
• Contacting customer support or lodging a complaint
• Platform information, founder details, or current Uganda local time

How can I assist you right now?`;
}
