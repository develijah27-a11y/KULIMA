/**
 * Farm Service Unit Tests
 * 
 * Tests for createFarm, getFarmsByUser, getFarmById, updateFarm, and deleteFarm.
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { Database } from '@/lib/database.types';
import { NotFoundError } from '@/utils/error-handler';

type Farm = Database['public']['Tables']['farms']['Row'];

const singleMock = jest.fn();
const rangeMock = jest.fn();
const orderMock = jest.fn();
const eqMock = jest.fn();
const selectMock = jest.fn();
const updateMock = jest.fn();
const insertMock = jest.fn();
const deleteMock = jest.fn();

const queryBuilder: any = {
  insert: insertMock,
  update: updateMock,
  delete: deleteMock,
  select: selectMock,
  eq: eqMock,
  order: orderMock,
  range: rangeMock,
  single: singleMock,
  then: (onFulfilled?: any) => Promise.resolve({ data: null, error: null }).then(onFulfilled),
};

insertMock.mockReturnValue(queryBuilder);
updateMock.mockReturnValue(queryBuilder);
deleteMock.mockReturnValue(queryBuilder);
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

import {
  createFarm,
  getFarmsByUser,
  getFarmById,
  updateFarm,
  deleteFarm,
  type CreateFarmParams,
  type UpdateFarmParams,
} from '../farm.service';

describe('Farm Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockFarm: Farm = {
    id: 'farm-123',
    user_id: 'user-123',
    name: 'Green Valley Farm',
    location: 'Mukono',
    district: 'Mukono',
    size_hectares: 10.5,
    farm_type: 'Commercial',
    crop_types: ['Maize', 'Beans'],
    description: 'High yield farm',
    boundary: null,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  describe('createFarm', () => {
    it('should successfully create a farm with valid data', async () => {
      const params: CreateFarmParams = {
        userId: 'user-123',
        name: 'Green Valley Farm',
        location: 'Mukono',
        district: 'Mukono',
        sizeHectares: 10.5,
        farmType: 'Commercial',
        cropTypes: ['Maize', 'Beans'],
        description: 'High yield farm',
      };

      singleMock.mockResolvedValue({
        data: mockFarm,
        error: null,
      });

      const result = await createFarm(params);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('farms');
      expect(insertMock).toHaveBeenCalled();
      expect(result).toEqual(mockFarm);
    });

    it('should throw error when insertion fails', async () => {
      const params: CreateFarmParams = {
        userId: 'user-123',
        name: 'Fail Farm',
        location: 'Nowhere',
      };

      singleMock.mockResolvedValue({
        data: null,
        error: new Error('Database insert failed'),
      });

      await expect(createFarm(params)).rejects.toThrow('Database insert failed');
    });
  });

  describe('getFarmsByUser', () => {
    it('should return paginated farms for a user', async () => {
      rangeMock.mockResolvedValue({
        data: [mockFarm],
        error: null,
        count: 1,
      });

      const result = await getFarmsByUser('user-123', 1, 20, 'created_at', 'desc');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('farms');
      expect(eqMock).toHaveBeenCalledWith('user_id', 'user-123');
      expect(result).toEqual({
        farms: [mockFarm],
        total: 1,
      });
    });

    it('should throw error if query fails', async () => {
      rangeMock.mockResolvedValue({
        data: null,
        error: new Error('Failed to fetch farms'),
        count: null,
      });

      await expect(getFarmsByUser('user-123')).rejects.toThrow('Failed to fetch farms');
    });
  });

  describe('getFarmById', () => {
    it('should return farm when found and owned by user', async () => {
      singleMock.mockResolvedValue({
        data: mockFarm,
        error: null,
      });

      const result = await getFarmById('farm-123', 'user-123');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('farms');
      expect(result).toEqual(mockFarm);
    });

    it('should throw NotFoundError when farm not found or not owned', async () => {
      singleMock.mockResolvedValue({
        data: null,
        error: new Error('Row not found'),
      });

      await expect(getFarmById('farm-999', 'user-123')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateFarm', () => {
    it('should successfully update farm when owned by user', async () => {
      const updates: UpdateFarmParams = {
        name: 'Updated Farm Name',
        sizeHectares: 15.0,
      };

      // Mock getFarmById check
      singleMock
        .mockResolvedValueOnce({
          data: mockFarm,
          error: null,
        })
        // Mock update result
        .mockResolvedValueOnce({
          data: { ...mockFarm, name: 'Updated Farm Name', size_hectares: 15.0 },
          error: null,
        });

      const result = await updateFarm('farm-123', 'user-123', updates);

      expect(updateMock).toHaveBeenCalled();
      expect(result.name).toBe('Updated Farm Name');
    });

    it('should throw error if update operation fails', async () => {
      singleMock
        .mockResolvedValueOnce({
          data: mockFarm,
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: new Error('Update failed'),
        });

      await expect(updateFarm('farm-123', 'user-123', { name: 'New' })).rejects.toThrow('Update failed');
    });
  });

  describe('deleteFarm', () => {
    it('should successfully delete farm when owned by user', async () => {
      singleMock.mockResolvedValueOnce({
        data: mockFarm,
        error: null,
      });

      await expect(deleteFarm('farm-123', 'user-123')).resolves.not.toThrow();
      expect(deleteMock).toHaveBeenCalled();
    });

    it('should throw error if farm not found before deletion', async () => {
      singleMock.mockResolvedValueOnce({
        data: null,
        error: new Error('Not found'),
      });

      await expect(deleteFarm('farm-999', 'user-123')).rejects.toThrow(NotFoundError);
    });
  });
});
