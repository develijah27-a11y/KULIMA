# Implementation Plan: Kulima AgriTech Backend Foundation

## Overview

This implementation plan establishes a production-ready, scalable, and secure backend foundation for the Kulima AgriTech platform. The approach prioritizes database safety, type safety, clean architecture, and security by default. Implementation follows a layered architecture with clear separation between presentation, business logic, and data access.

**Key Implementation Principles:**
- Database safety first: All schema changes through versioned migrations with rollback plans
- Service layer abstraction: No direct database queries from components
- Type-driven development: Generate types from schema, validate with Zod, enforce with TypeScript
- Feature-based organization: Group code by domain (farms, soil, disease, weather)
- Security in depth: RLS at database, auth middleware at routes, validation at API boundary

## Tasks

- [ ] 1. Project initialization and configuration
  - [ ] 1.1 Initialize Next.js project with TypeScript and App Router
    - Create Next.js 14+ project with TypeScript template
    - Configure tsconfig.json with strict mode enabled
    - Set up Tailwind CSS configuration
    - Create initial folder structure: /src/app, /src/features, /src/lib, /src/types, /src/utils, /src/config, /src/server
    - _Requirements: 6.1, 6.4, 8.1_

  - [ ] 1.2 Configure environment variables and validation
    - Create .env.example with all required variables documented
    - Create /src/config/env.ts with Zod schema for environment validation
    - Define NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (client-safe)
    - Define SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL (server-only)
    - Implement startup validation that throws descriptive errors for missing variables
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [ ] 1.3 Set up Supabase project and install dependencies
    - Install @supabase/supabase-js, @supabase/ssr, zod, and other core dependencies
    - Initialize Supabase project locally with supabase init
    - Configure supabase/config.toml with project settings
    - Document Supabase project setup in README.md
    - _Requirements: 21.1, 21.2, 25.1_

- [ ] 2. Database schema inspection and migration foundation
  - [ ] 2.1 Inspect and document existing database schema
    - Export current schema including tables, columns, constraints, indexes, RLS policies
    - Document all existing tables: profiles, farms, crops, soil_reports, disease_scans, weather_logs
    - Identify all foreign key relationships and dependencies
    - Create schema documentation in supabase/SCHEMA.md
    - _Requirements: 1.1, 1.2, 1.4, 1.5_

  - [ ] 2.2 Create migration system foundation
    - Create supabase/migrations directory structure
    - Create schema_migrations tracking table
    - Document migration naming convention: YYYYMMDDHHMMSS_description.sql
    - Document rollback plan template in supabase/MIGRATIONS.md
    - _Requirements: 2.1, 2.2, 2.3, 2.6_

  - [ ] 2.3 Create initial schema migration with all tables
    - Create 20240101000000_initial_schema.sql migration
    - Define profiles table with RLS policies and indexes
    - Define farms table with RLS policies, foreign keys, and indexes
    - Define crops table with RLS policies, foreign keys, constraints, and indexes
    - Define soil_reports table with RLS policies, foreign keys, constraints, and indexes
    - Define disease_scans table with RLS policies, foreign keys, constraints, and indexes
    - Define weather_logs table with RLS policies, foreign keys, constraints, and indexes
    - Include updated_at trigger function and triggers for all tables
    - Document rollback plan for this migration
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.7, 3.8, 4.1, 4.2, 4.3, 4.4_

  - [ ] 2.4 Create indexes migration for performance optimization
    - Create 20240102000000_add_indexes.sql migration
    - Add index on farms.user_id
    - Add index on crops.farm_id
    - Add index on soil_reports.farm_id and soil_reports.created_at
    - Add index on disease_scans.farm_id and disease_scans.created_at
    - Add index on weather_logs.farm_id, weather_logs.recorded_at, and weather_logs.created_at
    - Use CREATE INDEX CONCURRENTLY for production safety
    - Document rollback plan
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 20.2_


- [ ] 3. Type system and validation schemas
  - [ ] 3.1 Generate database types from schema
    - Install Supabase CLI and configure type generation
    - Create npm script "generate:types" that runs supabase gen types typescript
    - Generate /src/lib/database.types.ts from database schema
    - Document type generation process in README.md
    - _Requirements: 8.2, 22.1, 22.2, 22.3, 22.6_

  - [ ] 3.2 Create domain types for all features
    - Create /src/features/auth/types/auth.types.ts with User, Profile, Session, AuthResult interfaces
    - Create /src/features/farms/types/farm.types.ts with Farm, CreateFarmParams, UpdateFarmParams interfaces
    - Create /src/features/soil/types/soil.types.ts with SoilReport, CreateSoilReportParams interfaces
    - Create /src/features/disease-detection/types/disease.types.ts with DiseaseScan, CreateDiseaseScanParams interfaces
    - Create /src/features/weather/types/weather.types.ts with WeatherLog, CreateWeatherLogParams interfaces
    - Use TypeScript utility types (Pick, Omit, Partial) to derive types
    - _Requirements: 8.3, 8.7_

  - [ ] 3.3 Create API contract types
    - Create /src/types/api.types.ts with ApiResponse, ApiError, PaginationParams, PaginatedResponse interfaces
    - Define consistent response structure with success, data, and error fields
    - Define pagination types with page, limit, total, totalPages
    - Export all API contract types for frontend use
    - _Requirements: 8.4, 12.5, 12.7_

  - [ ] 3.4 Create Zod validation schemas for authentication
    - Create /src/features/auth/validation/auth.schema.ts
    - Define signupSchema with email, password, fullName, phoneNumber, location validation
    - Define loginSchema with email and password validation
    - Validate email format, password strength (min 8 chars), required fields
    - _Requirements: 12.1, 24.6_

  - [ ] 3.5 Create Zod validation schemas for farms
    - Create /src/features/farms/validation/farm.schema.ts
    - Define createFarmSchema with name, location, sizeHectares, farmType validation
    - Define updateFarmSchema with optional fields
    - Define farmQuerySchema for pagination and sorting parameters
    - Validate required fields, string lengths, number ranges
    - _Requirements: 12.1, 24.1, 24.6_

  - [ ] 3.6 Create Zod validation schemas for soil, disease, and weather
    - Create /src/features/soil/validation/soil.schema.ts with createSoilReportSchema
    - Create /src/features/disease-detection/validation/disease.schema.ts with createDiseaseScanSchema
    - Create /src/features/weather/validation/weather.schema.ts with createWeatherLogSchema
    - Validate pH range (0-14), nutrient values (>=0), confidence score (0-100), humidity (0-100)
    - Validate required fields and data types for each schema
    - _Requirements: 12.1, 24.2, 24.3, 24.4, 24.6_

- [ ] 4. Supabase client configuration
  - [ ] 4.1 Create client-side Supabase client
    - Create /src/lib/supabase/client.ts
    - Configure client using NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    - Configure session persistence in browser storage
    - Export createBrowserClient function
    - _Requirements: 21.1, 21.3, 21.5_

  - [ ] 4.2 Create server-side Supabase client
    - Create /src/lib/supabase/server.ts
    - Configure server client using Service Role Key for RLS bypass when necessary
    - Configure appropriate timeout and retry settings
    - Prevent server client from being imported in client-side code
    - Export createServerClient function
    - _Requirements: 21.2, 21.4, 21.5, 21.6, 21.7_

  - [ ] 4.3 Create middleware Supabase client
    - Create /src/lib/supabase/middleware.ts
    - Configure middleware client for session validation in Next.js middleware
    - Export createMiddlewareClient function
    - _Requirements: 21.5_

- [ ] 5. Checkpoint - Verify foundation setup
  - Ensure all configuration files are created and valid
  - Verify environment variables are properly configured
  - Ensure database types are generated successfully
  - Verify Supabase clients are configured correctly
  - Ask the user if questions arise


- [ ] 6. Shared utilities and error handling
  - [ ] 6.1 Create centralized error handling utility
    - Create /src/utils/error-handler.ts
    - Implement ApiError class with status code, message, and field errors
    - Implement handleError function that transforms errors into consistent response format
    - Handle database errors, validation errors, authentication errors
    - Return user-friendly error messages while logging detailed error information
    - Prevent sensitive information from appearing in error responses
    - _Requirements: 13.1, 13.2, 13.3, 13.6_

  - [ ] 6.2 Create logging utility
    - Create /src/utils/logger.ts
    - Implement log function with severity levels (error, warn, info, debug)
    - Include request context (user ID, endpoint, timestamp) in logs
    - Prevent sensitive information (passwords, tokens, keys) from appearing in logs
    - _Requirements: 13.4, 13.5, 13.6_

  - [ ] 6.3 Create pagination utility
    - Create /src/utils/pagination.ts
    - Implement calculatePagination function that computes offset, limit, totalPages
    - Implement buildPaginatedResponse function that formats paginated results
    - Set default page size to 20, maximum to 100
    - _Requirements: 20.1, 20.6_

  - [ ] 6.4 Create common validators utility
    - Create /src/utils/validators.ts
    - Implement validateUUID function for ID validation
    - Implement validateDateRange function for date filtering
    - Implement sanitizeInput function for string sanitization
    - _Requirements: 12.6_

- [ ] 7. Authentication service and API routes
  - [ ] 7.1 Implement authentication service
    - Create /src/features/auth/services/auth.service.ts
    - Implement signup method that creates user and profile record
    - Implement login method that authenticates user and returns session
    - Implement logout method that clears session
    - Implement getCurrentUser method that retrieves authenticated user
    - Implement getSession method that retrieves current session
    - Use server-side Supabase client for auth operations
    - _Requirements: 10.1, 10.2, 10.6, 10.7_

  - [ ] 7.2 Create signup API route
    - Create /src/app/api/auth/signup/route.ts
    - Implement POST handler that validates request with signupSchema
    - Call auth.service.signup method
    - Return 201 Created with user and profile data on success
    - Return 400 Bad Request with field errors on validation failure
    - _Requirements: 10.1, 10.7, 12.2, 12.4, 23.3, 23.4_

  - [ ] 7.3 Create login API route
    - Create /src/app/api/auth/login/route.ts
    - Implement POST handler that validates request with loginSchema
    - Call auth.service.login method
    - Return 200 OK with user and session data on success
    - Return 401 Unauthorized on invalid credentials
    - _Requirements: 10.2, 12.2, 12.4, 23.3, 23.4_

  - [ ] 7.4 Create logout API route
    - Create /src/app/api/auth/logout/route.ts
    - Implement POST handler that calls auth.service.logout
    - Clear session and return 200 OK
    - _Requirements: 10.6, 23.3, 23.4_

  - [ ] 7.5 Implement authentication middleware
    - Create /src/app/middleware.ts
    - Validate session for protected routes using middleware Supabase client
    - Redirect to login page on invalid or missing session
    - Allow public routes (login, signup, landing) to bypass authentication
    - Extract user identity and make available to protected routes
    - Refresh expired sessions automatically when possible
    - _Requirements: 10.4, 10.5, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

  - [ ]* 7.6 Write unit tests for authentication service
    - Test signup with valid data creates user and profile
    - Test signup with duplicate email returns error
    - Test login with valid credentials returns session
    - Test login with invalid credentials returns error
    - Test logout clears session
    - _Requirements: 10.1, 10.2, 10.6_


- [ ] 8. Farm management service and API routes
  - [ ] 8.1 Implement farm service
    - Create /src/features/farms/services/farm.service.ts
    - Implement createFarm method that inserts farm record linked to authenticated user
    - Implement getFarmsByUser method with pagination support
    - Implement getFarmById method with ownership validation
    - Implement updateFarm method with ownership validation
    - Implement deleteFarm method with cascading delete handling
    - Use server-side Supabase client for database operations
    - Return typed farm objects matching farm.types.ts
    - _Requirements: 7.1, 7.2, 14.1, 14.2, 14.3, 14.4, 14.5, 14.7_

  - [ ] 8.2 Create farms list and create API route
    - Create /src/app/api/farms/route.ts
    - Implement GET handler with pagination, sorting, and filtering
    - Implement POST handler that validates request with createFarmSchema
    - Validate authentication before processing requests
    - Call farm.service methods
    - Return 200 OK for GET with paginated results
    - Return 201 Created for POST with farm data
    - Return consistent JSON responses with success, data, error fields
    - _Requirements: 14.1, 14.2, 14.6, 23.2, 23.3, 23.4, 23.5, 23.6, 23.7_

  - [ ] 8.3 Create farm detail API route
    - Create /src/app/api/farms/[id]/route.ts
    - Implement GET handler that retrieves single farm by ID
    - Implement PUT handler that validates request with updateFarmSchema
    - Implement DELETE handler that removes farm
    - Validate authentication and ownership for all operations
    - Return 404 Not Found if farm doesn't exist or user doesn't own it
    - _Requirements: 14.3, 14.4, 14.5, 23.3, 23.4, 23.5_

  - [ ]* 8.4 Write unit tests for farm service
    - Test createFarm with valid data creates farm record
    - Test getFarmsByUser returns only user's farms
    - Test getFarmById validates ownership
    - Test updateFarm validates ownership and updates fields
    - Test deleteFarm removes farm and cascades to related records
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [ ] 9. Soil report service and API routes
  - [ ] 9.1 Implement soil report service
    - Create /src/features/soil/services/soil.service.ts
    - Implement createSoilReport method with farm ownership validation
    - Implement getSoilReportsByFarm method with pagination, ordered by created_at DESC
    - Implement getSoilReportById method with ownership validation
    - Validate required fields (pH, nitrogen, phosphorus, potassium) before insertion
    - Return typed soil report objects matching soil.types.ts
    - _Requirements: 7.1, 7.2, 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7_

  - [ ] 9.2 Create soil reports list and create API route
    - Create /src/app/api/soil-reports/route.ts
    - Implement GET handler with required farmId query parameter and pagination
    - Implement POST handler that validates request with createSoilReportSchema
    - Validate authentication and farm ownership before processing
    - Return 200 OK for GET with paginated results
    - Return 201 Created for POST with soil report data
    - _Requirements: 15.1, 15.2, 15.4, 15.5, 23.2, 23.3, 23.4, 23.7_

  - [ ] 9.3 Create soil report detail API route
    - Create /src/app/api/soil-reports/[id]/route.ts
    - Implement GET handler that retrieves single soil report by ID
    - Validate authentication and ownership
    - Return 404 Not Found if report doesn't exist or user doesn't own the farm
    - _Requirements: 15.3, 23.3, 23.4_

  - [ ]* 9.4 Write unit tests for soil report service
    - Test createSoilReport validates farm ownership
    - Test createSoilReport validates required nutrient fields
    - Test getSoilReportsByFarm returns reports ordered by date
    - Test getSoilReportById validates ownership
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ] 10. Disease detection service and API routes
  - [ ] 10.1 Implement disease detection service
    - Create /src/features/disease-detection/services/disease.service.ts
    - Implement createDiseaseScan method with farm ownership validation
    - Implement getDiseaseScansByFarm method with pagination
    - Implement getDiseaseScanById method with ownership validation
    - Validate required fields (image_url, crop_type) before insertion
    - Store image URLs referencing Supabase Storage buckets
    - Return typed disease scan objects matching disease.types.ts
    - _Requirements: 7.1, 7.2, 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7_

  - [ ] 10.2 Create disease scans list and create API route
    - Create /src/app/api/disease-scans/route.ts
    - Implement GET handler with required farmId query parameter and pagination
    - Implement POST handler that validates request with createDiseaseScanSchema
    - Validate authentication and farm ownership before processing
    - Return 200 OK for GET with paginated results
    - Return 201 Created for POST with disease scan data
    - _Requirements: 16.1, 16.2, 16.4, 16.5, 23.2, 23.3, 23.4, 23.7_

  - [ ] 10.3 Create disease scan detail API route
    - Create /src/app/api/disease-scans/[id]/route.ts
    - Implement GET handler that retrieves single disease scan by ID
    - Validate authentication and ownership
    - Return 404 Not Found if scan doesn't exist or user doesn't own the farm
    - _Requirements: 16.3, 23.3, 23.4_

  - [ ]* 10.4 Write unit tests for disease detection service
    - Test createDiseaseScan validates farm ownership
    - Test createDiseaseScan validates required fields
    - Test getDiseaseScansByFarm returns paginated results
    - Test getDiseaseScanById validates ownership
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_


- [ ] 11. Weather logging service and API routes
  - [ ] 11.1 Implement weather logging service
    - Create /src/features/weather/services/weather.service.ts
    - Implement createWeatherLog method with farm ownership validation
    - Implement getWeatherLogsByFarm method with date range filtering and pagination
    - Implement getWeatherLogById method with ownership validation
    - Validate required fields (temperature, humidity, rainfall) before insertion
    - Support querying by date range for trend analysis
    - Return typed weather log objects matching weather.types.ts
    - _Requirements: 7.1, 7.2, 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7_

  - [ ] 11.2 Create weather logs list and create API route
    - Create /src/app/api/weather-logs/route.ts
    - Implement GET handler with required farmId, optional startDate/endDate query parameters, and pagination
    - Implement POST handler that validates request with createWeatherLogSchema
    - Validate authentication and farm ownership before processing
    - Return 200 OK for GET with paginated results filtered by date range
    - Return 201 Created for POST with weather log data
    - _Requirements: 17.1, 17.2, 17.4, 17.5, 17.7, 23.2, 23.3, 23.4, 23.7_

  - [ ] 11.3 Create weather log detail API route
    - Create /src/app/api/weather-logs/[id]/route.ts
    - Implement GET handler that retrieves single weather log by ID
    - Validate authentication and ownership
    - Return 404 Not Found if log doesn't exist or user doesn't own the farm
    - _Requirements: 17.3, 23.3, 23.4_

  - [ ]* 11.4 Write unit tests for weather logging service
    - Test createWeatherLog validates farm ownership
    - Test createWeatherLog validates required fields
    - Test getWeatherLogsByFarm filters by date range
    - Test getWeatherLogById validates ownership
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

- [ ] 12. Checkpoint - Verify all services and API routes
  - Ensure all service methods are implemented and typed correctly
  - Verify all API routes handle authentication, validation, and errors consistently
  - Test API routes manually with valid and invalid requests
  - Ensure all routes return consistent JSON response structure
  - Ask the user if questions arise

- [ ] 13. React hooks for data fetching and mutations
  - [ ] 13.1 Create authentication hooks
    - Create /src/features/auth/hooks/useAuth.ts
    - Implement useAuth hook that provides signup, login, logout methods
    - Handle loading, error, and success states
    - Implement useSession hook that retrieves current session
    - _Requirements: 18.1, 18.2, 18.6_

  - [~] 13.2 Create farm management hooks
    - Create /src/features/farms/hooks/useFarms.ts for fetching farms list
    - Create /src/features/farms/hooks/useCreateFarm.ts for creating farms
    - Create /src/features/farms/hooks/useUpdateFarm.ts for updating farms
    - Create /src/features/farms/hooks/useDeleteFarm.ts for deleting farms
    - Implement optimistic updates for mutations
    - Automatically refetch data after mutations
    - Handle authentication errors and trigger re-login when needed
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7_

  - [~] 13.3 Create soil report hooks
    - Create /src/features/soil/hooks/useSoilReports.ts for fetching soil reports by farm
    - Create /src/features/soil/hooks/useCreateSoilReport.ts for creating soil reports
    - Handle loading, error, and data states
    - Call API routes rather than service methods directly
    - _Requirements: 18.1, 18.2, 18.3, 18.6_

  - [~] 13.4 Create disease detection hooks
    - Create /src/features/disease-detection/hooks/useDiseaseScans.ts for fetching disease scans by farm
    - Create /src/features/disease-detection/hooks/useCreateDiseaseScan.ts for creating disease scans
    - Handle loading, error, and data states
    - _Requirements: 18.1, 18.2, 18.3, 18.6_

  - [~] 13.5 Create weather logging hooks
    - Create /src/features/weather/hooks/useWeatherLogs.ts for fetching weather logs by farm with date filtering
    - Create /src/features/weather/hooks/useCreateWeatherLog.ts for creating weather logs
    - Handle loading, error, and data states
    - _Requirements: 18.1, 18.2, 18.3, 18.6_

  - [ ]* 13.6 Write integration tests for hooks
    - Test useFarms fetches and displays farms correctly
    - Test useCreateFarm creates farm and refetches list
    - Test hooks handle authentication errors appropriately
    - _Requirements: 18.1, 18.2, 18.4, 18.5, 18.7_


- [ ] 14. Code quality and modularity improvements
  - [~] 14.1 Refactor large files and extract shared logic
    - Review all files and ensure none exceed 300 lines
    - Extract shared validation logic into reusable functions
    - Extract shared database query patterns into utility functions
    - Ensure each module has single responsibility
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.7_

  - [~] 14.2 Implement dependency injection for testability
    - Refactor services to accept Supabase client as parameter
    - Create service factory functions for easier testing
    - Document dependency injection patterns in CONTRIBUTING.md
    - _Requirements: 19.6_

  - [ ]* 14.3 Write schema validation tests
    - Test all Zod schemas with valid and invalid inputs
    - Verify field-level error messages are descriptive
    - Test edge cases for numeric ranges and string lengths
    - _Requirements: 12.1, 12.4, 24.5, 24.6_

- [ ] 15. Performance optimization and monitoring
  - [~] 15.1 Implement database connection pooling
    - Create /src/server/db/connection.ts
    - Configure connection pooling for Supabase client
    - Document connection pool settings
    - _Requirements: 20.5_

  - [~] 15.2 Optimize database queries
    - Review all service methods and use SELECT with specific columns
    - Ensure all list queries use pagination
    - Add query performance logging for queries exceeding 1 second
    - _Requirements: 20.4, 20.6, 20.7_

  - [~] 15.3 Implement query result caching
    - Identify frequently accessed, slowly changing data
    - Implement caching strategy for farm metadata
    - Document cache invalidation rules
    - _Requirements: 20.3_

  - [ ]* 15.4 Write performance tests
    - Test pagination with large datasets
    - Verify indexes improve query performance
    - Test connection pooling under load
    - _Requirements: 20.1, 20.2, 20.5_

- [ ] 16. Documentation and developer experience
  - [~] 16.1 Create comprehensive README.md
    - Document architecture overview with layer descriptions
    - Document folder structure and organization principles
    - Provide setup instructions including environment variables, database setup, and running locally
    - Document npm scripts for development, build, test, and type generation
    - Include entity relationship diagram or markdown table showing table relationships
    - _Requirements: 25.1, 25.4, 25.7_

  - [~] 16.2 Create CONTRIBUTING.md
    - Document coding standards (TypeScript strict mode, file size limits, naming conventions)
    - Document git workflow (branch naming, commit messages, PR process)
    - Document testing requirements (unit tests for services, integration tests for API routes)
    - Document migration creation and rollback process
    - _Requirements: 25.2, 25.5_

  - [~] 16.3 Add JSDoc comments to all service methods
    - Document parameters, return types, and examples for all service methods
    - Document error conditions and exceptions
    - Document ownership validation behavior
    - _Requirements: 25.3_

  - [~] 16.4 Create setup validation script
    - Create script that validates environment configuration
    - Verify database connectivity
    - Check that all required environment variables are present
    - Provide helpful error messages for common setup issues
    - _Requirements: 25.6_

  - [~] 16.5 Document migration process
    - Create supabase/MIGRATIONS.md with detailed migration guide
    - Document how to create new migrations
    - Document how to apply migrations locally and in production
    - Document rollback procedures with examples
    - _Requirements: 25.5_

- [ ] 17. Final integration and testing
  - [~] 17.1 Run all migrations and verify database state
    - Apply all migrations in sequence
    - Verify all tables, indexes, and RLS policies are created
    - Test RLS policies by attempting unauthorized access
    - Verify foreign key constraints work correctly
    - _Requirements: 2.4, 2.5, 3.6, 4.1, 4.2, 4.5_

  - [~] 17.2 Test complete authentication flow
    - Test signup creates user and profile
    - Test login returns valid session
    - Test protected routes reject unauthenticated requests
    - Test middleware redirects to login for invalid sessions
    - Test logout clears session
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 11.1, 11.2_

  - [~] 17.3 Test complete farm management flow
    - Test creating farm as authenticated user
    - Test fetching farms returns only user's farms
    - Test updating farm validates ownership
    - Test deleting farm cascades to related records
    - Test pagination works correctly
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 20.1_

  - [~] 17.4 Test complete soil, disease, and weather flows
    - Test creating soil report validates farm ownership
    - Test creating disease scan validates farm ownership
    - Test creating weather log validates farm ownership
    - Test fetching records by farm returns correct results
    - Test date range filtering for weather logs
    - _Requirements: 15.1, 15.2, 15.4, 16.1, 16.2, 16.4, 17.1, 17.2, 17.4_

  - [ ]* 17.5 Write end-to-end integration tests
    - Test complete user journey from signup to data creation
    - Test error handling across all endpoints
    - Test validation errors return descriptive messages
    - _Requirements: 12.4, 13.1, 13.2, 13.3_

- [~] 18. Final checkpoint and deployment preparation
  - Ensure all tests pass
  - Verify all documentation is complete and accurate
  - Review code for security issues (exposed secrets, SQL injection, XSS)
  - Verify environment variables are properly separated (client vs server)
  - Ensure all API routes return consistent response structure
  - Ask the user if questions arise and if ready for deployment


## Notes

- **Optional Tasks**: Tasks marked with `*` are optional and can be skipped for faster MVP delivery. These include unit tests, integration tests, performance tests, and schema validation tests. However, implementing these tests is strongly recommended for production readiness.

- **Requirements Traceability**: Each task explicitly references the requirements it implements, ensuring complete coverage of all 25 requirements.

- **Incremental Validation**: Checkpoint tasks are placed at strategic points to ensure the foundation is solid before proceeding to the next phase.

- **Database Safety**: All schema changes go through versioned migrations with documented rollback plans. No direct schema modifications are allowed.

- **Type Safety**: Types are generated from the database schema and used throughout the stack. Zod schemas provide runtime validation at API boundaries.

- **Security by Default**: RLS policies enforce data access at the database level, authentication middleware protects routes, and input validation prevents injection attacks.

- **Clean Architecture**: Service layer encapsulates all database operations, components never directly query the database, and feature modules keep related code together.

- **Performance**: Indexes optimize queries, pagination limits result sets, and connection pooling manages database connections efficiently.

- **Developer Experience**: Comprehensive documentation, reusable hooks, consistent patterns, and setup validation scripts make the codebase accessible to new developers.

- **Testing Strategy**: Unit tests validate service logic, integration tests verify API contracts, and end-to-end tests ensure complete user flows work correctly.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["2.3"] },
    { "id": 3, "tasks": ["2.4", "3.1"] },
    { "id": 4, "tasks": ["3.2", "3.3", "4.1", "4.2", "4.3"] },
    { "id": 5, "tasks": ["3.4", "3.5", "3.6", "6.1", "6.2", "6.3", "6.4"] },
    { "id": 6, "tasks": ["7.1"] },
    { "id": 7, "tasks": ["7.2", "7.3", "7.4", "7.5"] },
    { "id": 8, "tasks": ["7.6", "8.1"] },
    { "id": 9, "tasks": ["8.2", "8.3"] },
    { "id": 10, "tasks": ["8.4", "9.1"] },
    { "id": 11, "tasks": ["9.2", "9.3"] },
    { "id": 12, "tasks": ["9.4", "10.1"] },
    { "id": 13, "tasks": ["10.2", "10.3"] },
    { "id": 14, "tasks": ["10.4", "11.1"] },
    { "id": 15, "tasks": ["11.2", "11.3"] },
    { "id": 16, "tasks": ["11.4", "13.1", "13.2", "13.3", "13.4", "13.5"] },
    { "id": 17, "tasks": ["13.6", "14.1", "14.2"] },
    { "id": 18, "tasks": ["14.3", "15.1", "15.2", "15.3"] },
    { "id": 19, "tasks": ["15.4", "16.1", "16.2", "16.3", "16.4", "16.5"] },
    { "id": 20, "tasks": ["17.1"] },
    { "id": 21, "tasks": ["17.2", "17.3", "17.4"] },
    { "id": 22, "tasks": ["17.5"] }
  ]
}
```
