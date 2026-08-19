import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';

function loadEnv() {
  try {
    delete require.cache[require.resolve('../env')];
  } catch {}
  return require('../env');
}

describe('Environment Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset modules and environment before each test
    jest.resetModules();
    delete require.cache[require.resolve('../env')];
    process.env = { ...originalEnv } as NodeJS.ProcessEnv;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.DATABASE_URL;
    delete process.env.LOG_LEVEL;
    process.env.NODE_ENV = 'test';
    process.env.NEXTAUTH_SECRET = 'test-nextauth-secret-key';
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Valid Environment Variables', () => {
    it('should validate and export environment variables when all required vars are present', () => {
      // Arrange
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
      process.env.NEXTAUTH_SECRET = 'test-nextauth-secret-key';
      process.env.NODE_ENV = 'test';
      process.env.LOG_LEVEL = 'info';

      // Act
      const { env } = loadEnv();

      // Assert
      expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe('https://test.supabase.co');
      expect(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).toBe('test-publishable-key');
      expect(env.SUPABASE_SERVICE_ROLE_KEY).toBe('test-service-role-key');
      expect(env.NODE_ENV).toBe('test');
      expect(env.LOG_LEVEL).toBe('info');
    });

    it('should accept optional DATABASE_URL when provided', () => {
      // Arrange
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
      process.env.NEXTAUTH_SECRET = 'test-nextauth-secret-key';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.NODE_ENV = 'test';

      // Act
      const { env } = loadEnv();

      // Assert
      expect(env.DATABASE_URL).toBe('postgresql://user:pass@localhost:5432/db');
    });

    it('should use default values for NODE_ENV and LOG_LEVEL when not provided', () => {
      // Arrange
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
      process.env.NEXTAUTH_SECRET = 'test-nextauth-secret-key';
      delete process.env.NODE_ENV;
      delete process.env.LOG_LEVEL;

      // Act
      const { env } = loadEnv();

      // Assert
      expect(env.NODE_ENV).toBe('development');
      expect(env.LOG_LEVEL).toBe('info');
    });
  });

  describe('Invalid Environment Variables', () => {
    it('should throw error when NEXT_PUBLIC_SUPABASE_URL is missing', () => {
      // Arrange
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-key';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

      // Act & Assert
      expect(() => {
        loadEnv();
      }).toThrow('Environment validation failed');
    });

    it('should throw error when NEXT_PUBLIC_SUPABASE_URL is invalid', () => {
      // Arrange
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'not-a-valid-url';
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-key';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

      // Act & Assert
      expect(() => {
        loadEnv();
      }).toThrow('Environment validation failed');
    });

    it('should throw error when NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing', () => {
      // Arrange
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

      // Act & Assert
      expect(() => {
        loadEnv();
      }).toThrow('Environment validation failed');
    });

    it('should throw error when SUPABASE_SERVICE_ROLE_KEY is missing', () => {
      // Arrange
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-key';
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      // Act & Assert
      expect(() => {
        loadEnv();
      }).toThrow('Environment validation failed');
    });

    it('should throw error when DATABASE_URL is invalid', () => {
      // Arrange
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-key';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
      process.env.DATABASE_URL = 'not-a-valid-database-url';

      // Act & Assert
      expect(() => {
        loadEnv();
      }).toThrow('Environment validation failed');
    });

    it('should throw error when NODE_ENV has invalid value', () => {
      // Arrange
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-key';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
      process.env.NODE_ENV = 'invalid-env' as any;

      // Act & Assert
      expect(() => {
        loadEnv();
      }).toThrow('Environment validation failed');
    });

    it('should throw error when LOG_LEVEL has invalid value', () => {
      // Arrange
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-key';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
      process.env.LOG_LEVEL = 'invalid-level' as any;

      // Act & Assert
      expect(() => {
        loadEnv();
      }).toThrow('Environment validation failed');
    });
  });

  describe('Type Safety', () => {
    it('should export Env type for type-safe access', () => {
      // Arrange
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-key';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
      process.env.NEXTAUTH_SECRET = 'test-nextauth-secret-key';

      // Act
      const { env } = loadEnv();

      // Assert - TypeScript will catch type errors at compile time
      expect(typeof env.NEXT_PUBLIC_SUPABASE_URL).toBe('string');
      expect(typeof env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).toBe('string');
      expect(typeof env.SUPABASE_SERVICE_ROLE_KEY).toBe('string');
      expect(['development', 'production', 'test']).toContain(env.NODE_ENV);
      expect(['debug', 'info', 'warn', 'error']).toContain(env.LOG_LEVEL);
    });
  });
});
