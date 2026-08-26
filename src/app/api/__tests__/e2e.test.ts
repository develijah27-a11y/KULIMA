/**
 * API End-to-End and Integration Contract Tests
 * Requirements: 12.4, 13.1, 13.2, 13.3
 */

import { describe, it, expect } from '@jest/globals';
import { handleError, AuthenticationError, ValidationError, NotFoundError, AuthorizationError } from '@/utils/error-handler';
import { buildPaginatedResponse, calculatePagination } from '@/utils/pagination';

describe('End-to-End API Contracts and Error Handling', () => {
  describe('Error Handling Integration', () => {
    it('should format AuthenticationError into 401 response contract', () => {
      const err = new AuthenticationError('Session expired');
      const { response, statusCode } = handleError(err);

      expect(statusCode).toBe(401);
      expect(response.success).toBe(false);
      expect(response.error.message).toBe('Session expired');
      expect(response.error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should format ValidationError with field errors into 400 response contract', () => {
      const err = new ValidationError('Invalid input data', {
        email: ['Invalid email format'],
        password: ['Password too short'],
      });
      const { response, statusCode } = handleError(err);

      expect(statusCode).toBe(400);
      expect(response.success).toBe(false);
      expect(response.error.fields?.email).toContain('Invalid email format');
    });

    it('should format NotFoundError into 404 response contract', () => {
      const err = new NotFoundError('Farm not found');
      const { response, statusCode } = handleError(err);

      expect(statusCode).toBe(404);
      expect(response.success).toBe(false);
      expect(response.error.code).toBe('NOT_FOUND');
    });

    it('should format AuthorizationError into 403 response contract', () => {
      const err = new AuthorizationError('You do not own this farm');
      const { response, statusCode } = handleError(err);

      expect(statusCode).toBe(403);
      expect(response.success).toBe(false);
      expect(response.error.code).toBe('AUTHORIZATION_ERROR');
    });
  });

  describe('Pagination Response Contract', () => {
    it('should compute and build accurate paginated response payload', () => {
      const items = [{ id: '1' }, { id: '2' }];
      const total = 45;
      const page = 2;
      const limit = 10;

      const paginationMeta = calculatePagination(page, limit, total);
      expect(paginationMeta.totalPages).toBe(5);
      expect(paginationMeta.offset).toBe(10);

      const paginated = buildPaginatedResponse(items, page, limit, total);
      expect(paginated.items).toEqual(items);
      expect(paginated.pagination.total).toBe(45);
      expect(paginated.pagination.page).toBe(2);
      expect(paginated.pagination.totalPages).toBe(5);
      expect(paginated.pagination.limit).toBe(10);
    });
  });
});
