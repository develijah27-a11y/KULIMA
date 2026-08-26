/**
 * Weather Logging Service Unit Tests
 * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { Database } from '@/lib/database.types';
import { NotFoundError } from '@/utils/error-handler';

type WeatherLog = Database['public']['Tables']['weather_logs']['Row'];

const singleMock = jest.fn();
const rangeMock = jest.fn();
const orderMock = jest.fn();
const eqMock = jest.fn();
const gteMock = jest.fn();
const lteMock = jest.fn();
const selectMock = jest.fn();
const insertMock = jest.fn();

const queryBuilder: any = {
  insert: insertMock,
  select: selectMock,
  eq: eqMock,
  gte: gteMock,
  lte: lteMock,
  order: orderMock,
  range: rangeMock,
  single: singleMock,
};

insertMock.mockReturnValue(queryBuilder);
selectMock.mockReturnValue(queryBuilder);
eqMock.mockReturnValue(queryBuilder);
gteMock.mockReturnValue(queryBuilder);
lteMock.mockReturnValue(queryBuilder);
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
  createWeatherLog,
  getWeatherLogsByFarm,
  getWeatherLogById,
  type CreateWeatherLogParams,
} from '../weather.service';
import { getFarmById } from '@/features/farms/services/farm.service';

describe('Weather Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockLog: WeatherLog = {
    id: 'log-123',
    farm_id: 'farm-123',
    temperature: 26.5,
    humidity: 70.0,
    rainfall: 5.2,
    wind_speed: 12.0,
    conditions: 'Partly Cloudy',
    recorded_at: '2024-01-01T12:00:00Z',
    created_at: '2024-01-01T12:00:00Z',
  };

  describe('createWeatherLog', () => {
    it('should create weather log after verifying farm ownership', async () => {
      (getFarmById as jest.Mock<any>).mockResolvedValue({ id: 'farm-123', user_id: 'user-123' });
      singleMock.mockResolvedValue({ data: mockLog, error: null });

      const params: CreateWeatherLogParams = {
        farmId: 'farm-123',
        userId: 'user-123',
        temperature: 26.5,
        humidity: 70.0,
        rainfall: 5.2,
        windSpeed: 12.0,
        conditions: 'Partly Cloudy',
        recordedAt: '2024-01-01T12:00:00Z',
      };

      const result = await createWeatherLog(params);

      expect(getFarmById).toHaveBeenCalledWith('farm-123', 'user-123');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('weather_logs');
      expect(result).toEqual(mockLog);
    });

    it('should throw if farm ownership check fails', async () => {
      (getFarmById as jest.Mock<any>).mockRejectedValue(new NotFoundError('Farm not found'));

      const params: CreateWeatherLogParams = {
        farmId: 'farm-999',
        userId: 'user-123',
        temperature: 26.5,
        humidity: 70.0,
        recordedAt: '2024-01-01T12:00:00Z',
      };

      await expect(createWeatherLog(params)).rejects.toThrow(NotFoundError);
    });
  });

  describe('getWeatherLogsByFarm', () => {
    it('should return paginated weather logs filtered by date', async () => {
      (getFarmById as jest.Mock<any>).mockResolvedValue({ id: 'farm-123', user_id: 'user-123' });
      rangeMock.mockResolvedValue({ data: [mockLog], error: null, count: 1 });

      const result = await getWeatherLogsByFarm(
        'farm-123',
        'user-123',
        '2024-01-01T00:00:00Z',
        '2024-01-02T00:00:00Z',
        1,
        20
      );

      expect(getFarmById).toHaveBeenCalledWith('farm-123', 'user-123');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('weather_logs');
      expect(gteMock).toHaveBeenCalledWith('recorded_at', '2024-01-01T00:00:00Z');
      expect(lteMock).toHaveBeenCalledWith('recorded_at', '2024-01-02T00:00:00Z');
      expect(orderMock).toHaveBeenCalledWith('recorded_at', { ascending: false });
      expect(result).toEqual({ logs: [mockLog], total: 1 });
    });
  });

  describe('getWeatherLogById', () => {
    it('should return log when found and farm belongs to user', async () => {
      singleMock.mockResolvedValue({ data: mockLog, error: null });
      (getFarmById as jest.Mock<any>).mockResolvedValue({ id: 'farm-123', user_id: 'user-123' });

      const result = await getWeatherLogById('log-123', 'user-123');

      expect(result).toEqual(mockLog);
      expect(getFarmById).toHaveBeenCalledWith('farm-123', 'user-123');
    });

    it('should throw NotFoundError when log is not found', async () => {
      singleMock.mockResolvedValue({ data: null, error: new Error('Log not found') });

      await expect(getWeatherLogById('log-999', 'user-123')).rejects.toThrow(NotFoundError);
    });
  });
});
