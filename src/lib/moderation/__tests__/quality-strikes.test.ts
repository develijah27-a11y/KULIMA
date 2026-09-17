/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */

const mockProfile: {
  id: string;
  user_id: string;
  full_name: string;
  role: string;
  is_suspended: boolean;
  quality_strikes: number;
  suspension_reason: string | null;
} = {
  id: 'profile-farmer-1',
  user_id: 'user-farmer-1',
  full_name: 'John Mukasa',
  role: 'farmer',
  is_suspended: false,
  quality_strikes: 0,
  suspension_reason: null,
};

const mockUpdateFn = jest.fn();
const mockInsertFn = jest.fn();

const createChain = (terminalData: any = { data: null, error: null }) => {
  const chain: any = {
    select: jest.fn(() => chain),
    insert: mockInsertFn,
    update: mockUpdateFn,
    eq: jest.fn(() => chain),
    in: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    single: jest.fn().mockResolvedValue(terminalData),
    maybeSingle: jest.fn().mockResolvedValue(terminalData),
    then: (resolve: any) => resolve(terminalData),
  };
  return chain;
};

const mockSupabase = {
  from: jest.fn((table: string) => {
    if (table === 'profiles') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn((col: string, val: any) => {
            if (col === 'role' && val === 'admin') {
              return Promise.resolve({ data: [{ user_id: 'admin-1' }], error: null });
            }
            return {
              single: jest.fn().mockResolvedValue({ data: { ...mockProfile }, error: null }),
              maybeSingle: jest.fn().mockResolvedValue({ data: { ...mockProfile }, error: null }),
              then: (resolve: any) => resolve({ data: { ...mockProfile }, error: null }),
            };
          }),
        })),
        update: mockUpdateFn,
      };
    }

    if (table === 'fraud_flags') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            in: jest.fn().mockResolvedValue({ count: mockProfile.quality_strikes, error: null }),
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                limit: jest.fn().mockResolvedValue({
                  data: mockProfile.is_suspended
                    ? [{ id: 'flag-1', severity: 'critical', description: mockProfile.suspension_reason }]
                    : [],
                  error: null,
                }),
              })),
            })),
          })),
        })),
        insert: mockInsertFn,
        update: mockUpdateFn,
      };
    }

    if (table === 'listings') {
      return {
        update: mockUpdateFn,
      };
    }

    return createChain();
  }),
};

jest.mock('@/lib/supabase/server', () => ({
  __esModule: true,
  createServiceRoleClient: jest.fn(() => mockSupabase),
}));

jest.mock('@/lib/notify', () => ({
  __esModule: true,
  notifyUser: jest.fn().mockResolvedValue({ ok: true }),
  notifyUsers: jest.fn().mockResolvedValue({ ok: true }),
}));

// Load module after mocks are registered
const { recordQualityStrike, checkIsAccountSuspended, adminManageAccountStatus } = require('../quality-strikes');

describe('Quality Strikes & Account Moderation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProfile.is_suspended = false;
    mockProfile.quality_strikes = 0;
    mockProfile.suspension_reason = null;

    mockInsertFn.mockReturnValue({
      then: (resolve: any) => resolve({ error: null }),
      error: null,
    });

    mockUpdateFn.mockImplementation(() => {
      const updateChain: any = {
        eq: jest.fn(() => updateChain),
        then: (resolve: any) => resolve({ error: null }),
      };
      return updateChain;
    });
  });

  it('records strike 1 as a warning without suspending the seller', async () => {
    const res = await recordQualityStrike({
      sellerUserId: 'user-farmer-1',
      reporterUserId: 'user-buyer-1',
      orderId: 'order-100',
      reason: 'poor_quality',
      description: 'Rotten beans delivered',
    });

    expect(res.ok).toBe(true);
    expect(res.strikeCount).toBe(1);
    expect(res.isSuspended).toBe(false);
    expect(mockUpdateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        quality_strikes: 1,
      })
    );
  });

  it('automatically flags and suspends the seller when reaching 3 strikes', async () => {
    mockProfile.quality_strikes = 2; // already has 2 strikes

    const res = await recordQualityStrike({
      sellerUserId: 'user-farmer-1',
      reporterUserId: 'user-buyer-2',
      orderId: 'order-200',
      reason: 'under_grade',
      description: 'Maize delivered was moldy and under Grade 1 standards',
    });

    expect(res.ok).toBe(true);
    expect(res.strikeCount).toBe(3);
    expect(res.isSuspended).toBe(true);
    expect(mockUpdateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        is_suspended: true,
        quality_strikes: 3,
      })
    );
  });

  it('detects when an account is suspended', async () => {
    mockProfile.is_suspended = true;
    mockProfile.suspension_reason = 'Exceeded 3 consistent poor-quality produce reports';

    const check = await checkIsAccountSuspended('user-farmer-1');
    expect(check.isSuspended).toBe(true);
    expect(check.reason).toContain('3 consistent poor-quality');
  });

  it('allows admin to reinstate a suspended seller', async () => {
    const res = await adminManageAccountStatus({
      sellerUserId: 'user-farmer-1',
      action: 'reinstate',
      adminNotes: 'Seller provided proof of quality control measures',
    });

    expect(res.ok).toBe(true);
    expect(res.status).toBe('active');
    expect(mockUpdateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        is_suspended: false,
        suspension_reason: null,
      })
    );
  });

  it('allows admin to permanently terminate a fraudulent seller account', async () => {
    const res = await adminManageAccountStatus({
      sellerUserId: 'user-farmer-1',
      action: 'terminate',
      adminNotes: 'Permanent ban for repeated fraud',
    });

    expect(res.ok).toBe(true);
    expect(res.status).toBe('terminated');
    expect(mockUpdateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        is_suspended: true,
        suspension_reason: expect.stringContaining('Permanent ban'),
      })
    );
  });
});
