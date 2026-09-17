/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */

const mockNotifications = [
  {
    id: 'n-1',
    user_id: 'user-multi-role',
    role: 'transporter',
    type: 'delivery',
    title: 'New Haulage Job',
    body: 'A delivery from Kampala to Jinja is available.',
    created_at: '2026-09-18T00:00:00.000Z',
    sent_at: '2026-09-18T00:00:00.000Z',
    read: false,
    data: { delivery_id: 'del-123' },
  },
  {
    id: 'n-2',
    user_id: 'user-multi-role',
    role: 'buyer',
    type: 'payment',
    title: 'Delivery payment still pending',
    body: 'Your delivery request for 500kg of Rice is awaiting payment.',
    created_at: '2026-09-18T00:05:00.000Z',
    sent_at: '2026-09-18T00:05:00.000Z',
    read: false,
    data: { delivery_id: 'del-456' },
  },
];

let queryRoleFilter: string | null = null;

const mockQueryBuilder = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn((col: string, val: any) => {
    if (col === 'role') {
      queryRoleFilter = val;
    }
    return mockQueryBuilder;
  }),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn(() => {
    let filtered = mockNotifications;
    if (queryRoleFilter) {
      filtered = filtered.filter(n => n.role === queryRoleFilter);
    }
    return Promise.resolve({ data: filtered, error: null });
  }),
  update: jest.fn().mockReturnValue({
    eq: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    }),
  }),
};

const mockSupabase = {
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: 'user-multi-role' } },
      error: null,
    }),
  },
  from: jest.fn(() => mockQueryBuilder),
};

jest.mock('@/lib/supabase/server', () => ({
  __esModule: true,
  createClient: jest.fn().mockResolvedValue(mockSupabase),
}));

jest.mock('@/lib/notify', () => ({
  __esModule: true,
  notifyUser: jest.fn().mockResolvedValue({ ok: true }),
}));

const { GET } = require('../route');

describe('Notifications API & Role Isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryRoleFilter = null;
  });

  it('filters notifications strictly by requested role (transporter only receives transporter notifications)', async () => {
    const req = new Request('https://www.cropifyapp.com/api/notifications?role=transporter');
    const res = await GET(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].role).toBe('transporter');
    expect(json.data[0].title).toBe('New Haulage Job');

    // Make sure buyer payment reminder is NOT present
    const hasBuyerNotif = json.data.some((n: any) => n.title.includes('Delivery payment still pending'));
    expect(hasBuyerNotif).toBe(false);
  });

  it('includes valid created_at and createdAt timestamps in normalized output', async () => {
    const req = new Request('https://www.cropifyapp.com/api/notifications?role=transporter');
    const res = await GET(req);
    const json = await res.json();

    expect(json.data[0].created_at).toBe('2026-09-18T00:00:00.000Z');
    expect(json.data[0].createdAt).toBe('2026-09-18T00:00:00.000Z');
    expect(json.data[0].sentAt).toBe('2026-09-18T00:00:00.000Z');
    expect(Number.isNaN(new Date(json.data[0].created_at).getTime())).toBe(false);
  });

  it('filters notifications strictly for buyer dashboard', async () => {
    const req = new Request('https://www.cropifyapp.com/api/notifications?role=buyer');
    const res = await GET(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].role).toBe('buyer');
    expect(json.data[0].title).toBe('Delivery payment still pending');
  });
});
