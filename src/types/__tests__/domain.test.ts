/**
 * Domain Types Tests
 * 
 * Tests to verify domain types are correctly defined and usable.
 * These tests ensure type safety and proper structure of domain types.
 */

import {
  Profile,
  CreateProfileParams,
  UpdateProfileParams,
  Farm,
  CreateFarmParams,
  UpdateFarmParams,
  FarmWithDetails,
  FarmListParams,
  Crop,
  CreateCropParams,
  CropStatus,
  SoilReport,
  CreateSoilReportParams,
  SoilHealthStatus,
  SoilReportWithAnalysis,
  DiseaseScan,
  CreateDiseaseScanParams,
  DiseaseSeverity,
  WeatherLog,
  CreateWeatherLogParams,
  WeatherCondition,
  WeatherStats,
  PaginationParams,
  PaginationMeta,
  PaginatedResponse,
  ApiSuccessResponse,
  ApiErrorResponse,
  DateRangeFilter,
  SortOrder,
} from '../domain';

describe('Domain Types', () => {
  describe('Common Types', () => {
    it('should create valid pagination parameters', () => {
      const params: PaginationParams = {
        page: 1,
        limit: 20,
      };

      expect(params.page).toBe(1);
      expect(params.limit).toBe(20);
    });

    it('should create valid pagination metadata', () => {
      const meta: PaginationMeta = {
        page: 1,
        limit: 20,
        total: 100,
        totalPages: 5,
        hasNextPage: true,
        hasPreviousPage: false,
      };

      expect(meta.totalPages).toBe(5);
      expect(meta.hasNextPage).toBe(true);
    });

    it('should create valid paginated response', () => {
      const response: PaginatedResponse<Farm> = {
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      expect(response.data).toEqual([]);
      expect(response.pagination.total).toBe(0);
    });

    it('should create valid date range filter', () => {
      const filter: DateRangeFilter = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      };

      expect(filter.startDate).toBeInstanceOf(Date);
      expect(filter.endDate).toBeInstanceOf(Date);
    });

    it('should accept valid sort orders', () => {
      const ascOrder: SortOrder = 'asc';
      const descOrder: SortOrder = 'desc';

      expect(ascOrder).toBe('asc');
      expect(descOrder).toBe('desc');
    });
  });

  describe('Profile Types', () => {
    it('should create valid profile', () => {
      const profile: Profile = {
        id: 'profile-123',
        user_id: 'user-123',
        full_name: 'John Doe',
        phone_number: '+1234567890',
        location: 'Nairobi, Kenya',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(profile.full_name).toBe('John Doe');
      expect(profile.createdAt).toBeInstanceOf(Date);
    });

    it('should create valid create profile parameters', () => {
      const params: CreateProfileParams = {
        userId: 'user-123',
        fullName: 'John Doe',
        phoneNumber: '+1234567890',
        location: 'Nairobi, Kenya',
      };

      expect(params.fullName).toBe('John Doe');
    });

    it('should create valid update profile parameters', () => {
      const params: UpdateProfileParams = {
        fullName: 'Jane Doe',
      };

      expect(params.fullName).toBe('Jane Doe');
    });
  });

  describe('Farm Types', () => {
    it('should create valid farm', () => {
      const farm: Farm = {
        id: 'farm-123',
        user_id: 'user-123',
        name: 'Green Valley Farm',
        location: 'Nakuru, Kenya',
        size_hectares: 10.5,
        farm_type: 'mixed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(farm.name).toBe('Green Valley Farm');
      expect(farm.size_hectares).toBe(10.5);
    });

    it('should create valid create farm parameters', () => {
      const params: CreateFarmParams = {
        userId: 'user-123',
        name: 'Green Valley Farm',
        location: 'Nakuru, Kenya',
        sizeHectares: 10.5,
        farmType: 'mixed',
      };

      expect(params.name).toBe('Green Valley Farm');
    });

    it('should create valid farm with details', () => {
      const farmWithDetails: FarmWithDetails = {
        id: 'farm-123',
        user_id: 'user-123',
        name: 'Green Valley Farm',
        location: 'Nakuru, Kenya',
        size_hectares: 10.5,
        farm_type: 'mixed',
        createdAt: new Date(),
        updatedAt: new Date(),
        cropCount: 5,
        soilReportCount: 3,
        diseaseScanCount: 2,
        weatherLogCount: 10,
      };

      expect(farmWithDetails.cropCount).toBe(5);
      expect(farmWithDetails.soilReportCount).toBe(3);
    });

    it('should create valid farm list parameters', () => {
      const params: FarmListParams = {
        page: 1,
        limit: 20,
        sortBy: 'created_at',
        order: 'desc',
        farmType: 'mixed',
      };

      expect(params.sortBy).toBe('created_at');
      expect(params.order).toBe('desc');
    });
  });

  describe('Crop Types', () => {
    it('should create valid crop', () => {
      const crop: Crop = {
        id: 'crop-123',
        farm_id: 'farm-123',
        crop_name: 'Maize',
        variety: 'Hybrid 614',
        plantingDate: new Date('2024-01-15'),
        expectedHarvestDate: new Date('2024-06-15'),
        status: 'growing',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(crop.crop_name).toBe('Maize');
      expect(crop.status).toBe('growing');
    });

    it('should accept valid crop statuses', () => {
      const statuses: CropStatus[] = ['planted', 'growing', 'harvested', 'failed'];
      
      statuses.forEach(status => {
        expect(['planted', 'growing', 'harvested', 'failed']).toContain(status);
      });
    });

    it('should create valid create crop parameters', () => {
      const params: CreateCropParams = {
        farmId: 'farm-123',
        cropName: 'Maize',
        variety: 'Hybrid 614',
        plantingDate: new Date('2024-01-15'),
        status: 'planted',
      };

      expect(params.cropName).toBe('Maize');
    });
  });

  describe('Soil Report Types', () => {
    it('should create valid soil report', () => {
      const report: SoilReport = {
        id: 'report-123',
        farm_id: 'farm-123',
        ph_level: 6.5,
        nitrogen: 45.2,
        phosphorus: 30.1,
        potassium: 25.8,
        organic_matter: 3.5,
        recommendations: 'Add lime to increase pH',
        createdAt: new Date(),
      };

      expect(report.ph_level).toBe(6.5);
      expect(report.nitrogen).toBe(45.2);
    });

    it('should accept valid soil health statuses', () => {
      const statuses: SoilHealthStatus[] = ['excellent', 'good', 'fair', 'poor'];
      
      statuses.forEach(status => {
        expect(['excellent', 'good', 'fair', 'poor']).toContain(status);
      });
    });

    it('should create valid soil report with analysis', () => {
      const reportWithAnalysis: SoilReportWithAnalysis = {
        id: 'report-123',
        farm_id: 'farm-123',
        ph_level: 6.5,
        nitrogen: 45.2,
        phosphorus: 30.1,
        potassium: 25.8,
        organic_matter: 3.5,
        recommendations: 'Add lime to increase pH',
        createdAt: new Date(),
        healthStatus: 'good',
        npkRatio: '45:30:26',
        deficiencies: ['potassium'],
        strengths: ['nitrogen', 'phosphorus'],
      };

      expect(reportWithAnalysis.healthStatus).toBe('good');
      expect(reportWithAnalysis.deficiencies).toContain('potassium');
    });

    it('should create valid create soil report parameters', () => {
      const params: CreateSoilReportParams = {
        farmId: 'farm-123',
        phLevel: 6.5,
        nitrogen: 45.2,
        phosphorus: 30.1,
        potassium: 25.8,
        organicMatter: 3.5,
      };

      expect(params.phLevel).toBe(6.5);
    });
  });

  describe('Disease Scan Types', () => {
    it('should create valid disease scan', () => {
      const scan: DiseaseScan = {
        id: 'scan-123',
        farm_id: 'farm-123',
        crop_type: 'Maize',
        image_url: 'https://example.com/image.jpg',
        disease_detected: 'Leaf Blight',
        confidence_score: 85.5,
        treatment_recommendations: 'Apply fungicide',
        createdAt: new Date(),
      };

      expect(scan.disease_detected).toBe('Leaf Blight');
      expect(scan.confidence_score).toBe(85.5);
    });

    it('should accept valid disease severity levels', () => {
      const severities: DiseaseSeverity[] = ['low', 'medium', 'high', 'critical'];
      
      severities.forEach(severity => {
        expect(['low', 'medium', 'high', 'critical']).toContain(severity);
      });
    });

    it('should create valid create disease scan parameters', () => {
      const params: CreateDiseaseScanParams = {
        farmId: 'farm-123',
        cropType: 'Maize',
        imageUrl: 'https://example.com/image.jpg',
        diseaseDetected: 'Leaf Blight',
        confidenceScore: 85.5,
      };

      expect(params.cropType).toBe('Maize');
    });
  });

  describe('Weather Log Types', () => {
    it('should create valid weather log', () => {
      const log: WeatherLog = {
        id: 'log-123',
        farm_id: 'farm-123',
        temperature: 25.5,
        humidity: 65.0,
        rainfall: 10.2,
        wind_speed: 15.0,
        conditions: 'partly_cloudy',
        recordedAt: new Date(),
        createdAt: new Date(),
      };

      expect(log.temperature).toBe(25.5);
      expect(log.humidity).toBe(65.0);
    });

    it('should accept valid weather conditions', () => {
      const conditions: WeatherCondition[] = [
        'sunny',
        'cloudy',
        'rainy',
        'stormy',
        'foggy',
        'windy',
        'partly_cloudy',
      ];
      
      conditions.forEach(condition => {
        expect([
          'sunny',
          'cloudy',
          'rainy',
          'stormy',
          'foggy',
          'windy',
          'partly_cloudy',
        ]).toContain(condition);
      });
    });

    it('should create valid weather stats', () => {
      const stats: WeatherStats = {
        averageTemperature: 25.5,
        minTemperature: 18.0,
        maxTemperature: 32.0,
        averageHumidity: 65.0,
        totalRainfall: 150.5,
        averageWindSpeed: 12.5,
        mostCommonCondition: 'sunny',
        recordCount: 30,
      };

      expect(stats.averageTemperature).toBe(25.5);
      expect(stats.recordCount).toBe(30);
    });

    it('should create valid create weather log parameters', () => {
      const params: CreateWeatherLogParams = {
        farmId: 'farm-123',
        temperature: 25.5,
        humidity: 65.0,
        rainfall: 10.2,
        windSpeed: 15.0,
        conditions: 'partly_cloudy',
        recordedAt: new Date(),
      };

      expect(params.temperature).toBe(25.5);
    });
  });

  describe('API Response Types', () => {
    it('should create valid success response', () => {
      const response: ApiSuccessResponse<Farm> = {
        success: true,
        data: {
          id: 'farm-123',
          user_id: 'user-123',
          name: 'Green Valley Farm',
          location: 'Nakuru, Kenya',
          size_hectares: 10.5,
          farm_type: 'mixed',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      expect(response.success).toBe(true);
      expect(response.data.name).toBe('Green Valley Farm');
    });

    it('should create valid error response', () => {
      const response: ApiErrorResponse = {
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          fields: {
            name: ['Name is required'],
            location: ['Location is required'],
          },
        },
      };

      expect(response.success).toBe(false);
      expect(response.error.message).toBe('Validation failed');
      expect(response.error.fields?.name).toContain('Name is required');
    });
  });
});
