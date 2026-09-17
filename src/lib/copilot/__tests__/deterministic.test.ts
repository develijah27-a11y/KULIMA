jest.mock('../tools', () => ({
  __esModule: true,
  escalate_to_human: jest.fn(),
  get_assignment_status: jest.fn(),
  get_delivery_breakdown: jest.fn(),
  get_order_status: jest.fn(),
  get_escrow_status: jest.fn(),
  get_market_price: jest.fn(),
  get_transporter_assignment: jest.fn(),
  get_listing_status: jest.fn(),
}));

import type { ToolContext } from '../tools';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { handleDeterministicCopilot } = require('../deterministic');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const tools = require('../tools');

describe('handleDeterministicCopilot', () => {
  const mockCtx: ToolContext = {
    supabase: {} as any,
    userId: 'user-transporter-123',
    profileId: 'profile-transporter-123',
    role: 'transporter',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('answers founder inquiries accurately without falling back to assignments', async () => {
    const reply = await handleDeterministicCopilot(mockCtx, 'what is the name of your fouder', 'Alex');

    expect(reply).toContain('Kwagala Elijah Hannington');
    expect(reply).toContain('Cropify');
    expect(reply).not.toContain('Your current delivery assignments');
  });

  it('answers current time inquiry with Uganda EAT timezone', async () => {
    const reply = await handleDeterministicCopilot(mockCtx, 'what is the time right now', 'Alex');

    expect(reply).toContain('EAT');
    expect(reply).toContain('Uganda');
    expect(reply).not.toContain('Your current delivery assignments');
  });

  it('handles complaint raising warmly and offers official ticket submission', async () => {
    const reply = await handleDeterministicCopilot(mockCtx, 'i have a complaint to raise', 'Alex');

    expect(reply).toContain('complaint');
    expect(reply).toContain('0758984224'); // WhatsApp contact
    expect(reply).toContain('0786857587'); // Call contact
    expect(reply).not.toContain('Your current delivery assignments');
  });

  it('automatically escalates when a detailed complaint is provided', async () => {
    const spy = jest.spyOn(tools, 'escalate_to_human').mockResolvedValueOnce({
      escalated: true,
      ticketId: '12345678-abcd-1234-abcd-1234567890ab',
    });

    const reply = await handleDeterministicCopilot(
      mockCtx,
      'The cargo was damaged because the farmer packed wet beans without proper bags',
      'Alex',
      [{ role: 'assistant', content: 'What is your complaint regarding?' }]
    );

    expect(spy).toHaveBeenCalled();
    expect(reply).toContain('Ticket #12345678');
  });

  it('properly differentiates active vs past assignments for a transporter', async () => {
    jest.spyOn(tools, 'get_assignment_status').mockResolvedValueOnce({
      assignments: [
        {
          id: '2aa1fddc-1111-2222-3333-444455556666',
          cargo_type: 'Rice',
          cargo_kg: 200,
          pickup_district: 'Mukono',
          dropoff_district: 'Kampala',
          status: 'cancelled',
        },
        {
          id: '6ef37b76-1111-2222-3333-444455556666',
          cargo_type: 'Rice',
          cargo_kg: 120,
          pickup_district: 'Kampala',
          dropoff_district: 'Kampala',
          status: 'delivered',
        },
        {
          id: '2d961f0a-1111-2222-3333-444455556666',
          cargo_type: 'Beans',
          cargo_kg: 600,
          pickup_district: 'Kampala',
          dropoff_district: 'Mbarara',
          status: 'delivered',
        },
      ],
    });

    const reply = await handleDeterministicCopilot(mockCtx, "What's my current assignment?", 'Alex');

    expect(reply).toContain('no active delivery assignments in transit');
    expect(reply).toContain('Trip #6ef37b76');
    expect(reply).toContain('Trip #2d961f0a');
    expect(reply).toContain('Trip #2aa1fddc');
  });

  it('lists active assignments when a delivery is in transit', async () => {
    jest.spyOn(tools, 'get_assignment_status').mockResolvedValueOnce({
      assignments: [
        {
          id: '99aa88bb-1111-2222-3333-444455556666',
          cargo_type: 'Maize',
          cargo_kg: 500,
          pickup_district: 'Jinja',
          dropoff_district: 'Kampala',
          status: 'in_transit',
        },
      ],
    });

    const reply = await handleDeterministicCopilot(mockCtx, "What's my current assignment?", 'Alex');

    expect(reply).toContain('1 active delivery assignment');
    expect(reply).toContain('Trip #99aa88bb');
    expect(reply).toContain('in_transit');
  });

  it('returns payment breakdown for transporter earnings inquiry', async () => {
    const spy = jest.spyOn(tools, 'get_delivery_breakdown').mockResolvedValueOnce({
      driver_earnings: 120000,
      agreed_price: 140000,
      distance_km: 45,
      commission_rate: 10,
      commission_amount: 14000,
      payment_status: 'paid',
      status: 'delivered',
    });

    const reply = await handleDeterministicCopilot(mockCtx, 'Break down payment for Trip #6ef37b76', 'Alex');

    expect(spy).toHaveBeenCalledWith(mockCtx, { deliveryId: '6ef37b76' });
    expect(reply).toContain('120,000');
    expect(reply).toContain('Payment Breakdown for Trip #6ef37b76');
  });

  it('provides direct troubleshooting guidance for network lag and offline usage', async () => {
    const reply = await handleDeterministicCopilot(mockCtx, 'the app is very slow and lagg on my wifi', 'Alex');

    expect(reply).toContain('cropify-offline');
    expect(reply).toContain('IndexedDB');
    expect(reply).toContain('Clear Cache');
  });

  it('explains produce quality grading and the 3-strike seller rule', async () => {
    const reply = await handleDeterministicCopilot(mockCtx, 'what is the quality grading and strike rule for farmers', 'Alex');

    expect(reply).toContain('Grade 1 (Premium)');
    expect(reply).toContain('3-Strike');
    expect(reply).toContain('suspended');
  });

  it('escalates poor quality goods complaints under quality_dispute category with high priority', async () => {
    const spy = jest.spyOn(tools, 'escalate_to_human').mockResolvedValueOnce({
      escalated: true,
      ticketId: '98765432-abcd-1234-abcd-1234567890ab',
    });

    const reply = await handleDeterministicCopilot(
      mockCtx,
      'The farmer delivered rotten and under-grade maize which does not match Grade 1 for order 12345678',
      'Alex'
    );

    expect(spy).toHaveBeenCalledWith(
      mockCtx,
      expect.objectContaining({
        category: 'quality_dispute',
        priority: 'high',
      })
    );
    expect(reply).toContain('Ticket #98765432');
    expect(reply).toContain('Quality Dispute');
  });
});

