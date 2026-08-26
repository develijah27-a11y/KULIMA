/**
 * Soil Report Service Unit Tests
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { Database } from '@/lib/database.types';
import { NotFoundError } from '@/utils/error-handler';

type SoilReport = Database['public']['Tables']['soil_reports']['Row'];

const singleMock = jest.fn();
const rangeMock = jest.fn();
const orderMock = jest.fn();
const eqMock = jest.fn();
const selectMock = jest.fn();
const insertMock = jest.fn();

const queryBuilder: any = {
  insert: insertMock,
  select: selectMock,
  eq: eqMock,
  order: orderMock,
  range: rangeMock,
  single: singleMock,
};

insertMock.mockReturnValue(queryBuilder);
selectMock.mockReturnValue(queryBuilder);
eqMock.mockReturnValue(queryBuilder);
orderMock.mockReturnValue(queryBuilder);
rangeMock.mockReturnValue(queryBuilder);

const mockSupabaseClient = {
  from: jest.fn(() => queryBuilder),
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabaseClient)),
}));

jest.mock('@/features/farms/services/farm.service', () => ({
  getFarmById: jest.fn(),
}));

import {
  createSoilReport,
  getSoilReportsByFarm,
  getSoilReportById,
  type CreateSoilReportParams,
} from '../soil.service';
import { getFarmById } from '@/features/farms/services/farm.service';

describe('Soil Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockReport: SoilReport = {
    id: 'soil-123',
    farm_id: 'farm-123',
    ph_level: 6.5,
    nitrogen: 45.0,
    phosphorus: 30.0,
    potassium: 25.0,
    organic_matter: 3.5,
    recommendations: 'Optimal soil health',
    created_at: '2024-01-01T00:00:00Z',
  };

  describe('createSoilReport', () => {
    it('should create soil report after validating farm ownership', async () => {
      (getFarmById as jest.Mock<any>).mockResolvedValue({ id: 'farm-123', user_id: 'user-123' });
      singleMock.mockResolvedValue({ data: mockReport, error: null });

      const params: CreateSoilReportParams = {
        farmId: 'farm-123',
        userId: 'user-123',
        phLevel: 6.5,
        nitrogen: 45.0,
        phosphorus: 30.0,
        potassium: 25.0,
        organicMatter: 3.5,
        recommendations: 'Optimal soil health',
      };

      const result = await createSoilReport(params);

      expect(getFarmById).toHaveBeenCalledWith('farm-123', 'user-123');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('soil_reports');
      expect(result).toEqual(mockReport);
    });

    it('should throw if farm ownership fails', async () => {
      (getFarmById as jest.Mock<any>).mockRejectedValue(new NotFoundError('Farm not found'));

      const params: CreateSoilReportParams = {
        farmId: 'farm-999',
        userId: 'user-123',
        phLevel: 6.5,
        nitrogen: 45.0,
        phosphorus: 30.0,
        potassium: 25.0,
      };

      await expect(createSoilReport(params)).rejects.toThrow(NotFoundError);
    });
  });

  describe('getSoilReportsByFarm', () => {
    it('should return paginated soil reports ordered by date DESC', async () => {
      (getFarmById as jest.Mock<any>).mockResolvedValue({ id: 'farm-123', user_id: 'user-123' });
      rangeMock.mockResolvedValue({ data: [mockReport], error: null, count: 1 });

      const result = await getSoilReportsByFarm('farm-123', 'user-123', 1, 20);

      expect(getFarmById).toHaveBeenCalledWith('farm-123', 'user-123');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('soil_reports');
      expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result).toEqual({ reports: [mockReport], total: 1 });
    });
  });

  describe('getSoilReportById', () => {
    it('should return report when found and farm is owned by user', async () => {
      singleMock.mockResolvedValue({ data: mockReport, error: null });
      (getFarmById as jest.Mock<any>).mockResolvedValue({ id: 'farm-123', user_id: 'user-123' });

      const result = await getSoilReportById('soil-123', 'user-123');

      expect(result).toEqual(mockReport);
      expect(getFarmById).toHaveBeenCalledWith('farm-123', 'user-123');
    });

    it('should throw NotFoundError if report does not exist', async () => {
      singleMock.mockResolvedValue({ data: null, error: new Error('Not found') });

      await expect(getSoilReportById('soil-999', 'user-123')).rejects.toThrow(NotFoundError);
    });
  });
});
