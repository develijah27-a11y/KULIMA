/**
 * Disease Detection Service Unit Tests
 * Requirements: 16.1, 16.2, 16.3, 16.4, 16.5
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { Database } from '@/lib/database.types';
import { NotFoundError } from '@/utils/error-handler';

type DiseaseScan = Database['public']['Tables']['disease_scans']['Row'];

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
  createDiseaseScan,
  getDiseaseScansByFarm,
  getDiseaseScanById,
  type CreateDiseaseScanParams,
} from '../disease.service';
import { getFarmById } from '@/features/farms/services/farm.service';

describe('Disease Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockScan: DiseaseScan = {
    id: 'scan-123',
    farm_id: 'farm-123',
    crop_type: 'Maize',
    image_url: 'https://storage.supabase.co/scans/scan-123.jpg',
    disease_detected: 'Fall Armyworm',
    confidence_score: 92.5,
    treatment_recommendations: 'Apply neem extract',
    created_at: '2024-01-01T00:00:00Z',
  };

  describe('createDiseaseScan', () => {
    it('should create disease scan after verifying farm ownership', async () => {
      (getFarmById as jest.Mock<any>).mockResolvedValue({ id: 'farm-123', user_id: 'user-123' });
      singleMock.mockResolvedValue({ data: mockScan, error: null });

      const params: CreateDiseaseScanParams = {
        farmId: 'farm-123',
        userId: 'user-123',
        cropType: 'Maize',
        imageUrl: 'https://storage.supabase.co/scans/scan-123.jpg',
        diseaseDetected: 'Fall Armyworm',
        confidenceScore: 92.5,
        treatmentRecommendations: 'Apply neem extract',
      };

      const result = await createDiseaseScan(params);

      expect(getFarmById).toHaveBeenCalledWith('farm-123', 'user-123');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('disease_scans');
      expect(result).toEqual(mockScan);
    });

    it('should throw if farm ownership check fails', async () => {
      (getFarmById as jest.Mock<any>).mockRejectedValue(new NotFoundError('Farm not found'));

      const params: CreateDiseaseScanParams = {
        farmId: 'farm-999',
        userId: 'user-123',
        cropType: 'Maize',
        imageUrl: 'https://storage.supabase.co/scans/scan-123.jpg',
      };

      await expect(createDiseaseScan(params)).rejects.toThrow(NotFoundError);
    });
  });

  describe('getDiseaseScansByFarm', () => {
    it('should return paginated scans ordered by created_at DESC', async () => {
      (getFarmById as jest.Mock<any>).mockResolvedValue({ id: 'farm-123', user_id: 'user-123' });
      rangeMock.mockResolvedValue({ data: [mockScan], error: null, count: 1 });

      const result = await getDiseaseScansByFarm('farm-123', 'user-123', 1, 20);

      expect(getFarmById).toHaveBeenCalledWith('farm-123', 'user-123');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('disease_scans');
      expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result).toEqual({ scans: [mockScan], total: 1 });
    });
  });

  describe('getDiseaseScanById', () => {
    it('should return scan when found and farm belongs to user', async () => {
      singleMock.mockResolvedValue({ data: mockScan, error: null });
      (getFarmById as jest.Mock<any>).mockResolvedValue({ id: 'farm-123', user_id: 'user-123' });

      const result = await getDiseaseScanById('scan-123', 'user-123');

      expect(result).toEqual(mockScan);
      expect(getFarmById).toHaveBeenCalledWith('farm-123', 'user-123');
    });

    it('should throw NotFoundError when scan is not found', async () => {
      singleMock.mockResolvedValue({ data: null, error: new Error('Scan not found') });

      await expect(getDiseaseScanById('scan-999', 'user-123')).rejects.toThrow(NotFoundError);
    });
  });
});
