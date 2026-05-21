# Requirements Document: Kulima AgriTech Backend Foundation

## Introduction

The Kulima AgriTech platform is an African agricultural technology platform designed to help farmers manage their farms, monitor soil health, detect crop diseases, and track weather conditions. This requirements document defines the backend foundation and codebase stabilization project that will establish a production-ready, scalable, secure, and maintainable architecture.

The primary goal is to rebuild the backend foundation safely without breaking the existing database, addressing previous instability issues while establishing enterprise-grade patterns for future development.

**Technology Stack:**
- Frontend: Next.js, React, TypeScript, Tailwind CSS
- Backend: Next.js API Routes, TypeScript
- Database: PostgreSQL via Supabase
- Authentication: Supabase Auth

## Glossary

- **Kulima_Platform**: The complete AgriTech application system including frontend, backend, and database
- **Backend_Foundation**: The server-side architecture including services, API routes, database layer, and business logic
- **Database_Schema**: The PostgreSQL table structure, relationships, constraints, and indexes
- **Service_Layer**: TypeScript modules that encapsulate database operations and business logic
- **RLS**: Row Level Security - PostgreSQL security policies that restrict data access at the database level
- **Migration**: A versioned SQL file that modifies database schema in a controlled, reversible manner
- **Type_Safety**: TypeScript strict typing that prevents runtime type errors
- **Feature_Module**: A self-contained directory containing all code related to a specific domain (auth, farms, soil, etc.)
- **Auth_Session**: A user authentication session managed by Supabase Auth
- **Protected_Route**: An API endpoint or page that requires valid authentication
- **Service_Role_Key**: A privileged Supabase API key that bypasses RLS (server-side only)
- **Publishable_Key**: A public Supabase API key safe for client-side use
- **Rollback_Plan**: A documented procedure to reverse a database migration
- **API_Contract**: A defined request/response schema for an API endpoint
- **Validation_Schema**: A Zod schema that validates input data structure and types

## Requirements

### Requirement 1: Database Schema Inspection and Safety

**User Story:** As a developer, I want to inspect the current database schema before making any changes, so that I can understand existing structure and avoid data loss.

#### Acceptance Criteria

1. THE Backend_Foundation SHALL provide a mechanism to export the current Database_Schema including tables, columns, constraints, indexes, and RLS policies
2. WHEN a schema modification is proposed, THE Backend_Foundation SHALL require documentation of the current state before proceeding
3. THE Backend_Foundation SHALL prohibit operations that drop tables, truncate data, reset schemas, or disable RLS policies
4. WHEN inspecting the schema, THE Backend_Foundation SHALL identify all existing foreign key relationships and dependencies
5. THE Backend_Foundation SHALL document all existing tables including profiles, farms, crops, soil_reports, disease_scans, and weather_logs

### Requirement 2: Database Migration System

**User Story:** As a developer, I want a versioned migration system with rollback capabilities, so that I can safely evolve the database schema without risk of data loss.

#### Acceptance Criteria

1. THE Backend_Foundation SHALL implement a migration system using the /supabase/migrations directory structure
2. WHEN a Migration is created, THE Backend_Foundation SHALL assign a sequential version number with timestamp
3. WHEN a Migration is created, THE Backend_Foundation SHALL include a corresponding Rollback_Plan in documentation
4. THE Backend_Foundation SHALL execute migrations in sequential order based on version numbers
5. WHEN a Migration fails, THE Backend_Foundation SHALL halt execution and preserve the previous state
6. THE Backend_Foundation SHALL maintain a migration history table tracking applied migrations with timestamps

### Requirement 3: Database Relationships and Constraints

**User Story:** As a developer, I want properly defined table relationships with foreign keys and constraints, so that data integrity is maintained at the database level.

#### Acceptance Criteria

1. THE Database_Schema SHALL define a foreign key relationship from farms table to profiles table via user_id
2. THE Database_Schema SHALL define a foreign key relationship from crops table to farms table via farm_id
3. THE Database_Schema SHALL define a foreign key relationship from soil_reports table to farms table via farm_id
4. THE Database_Schema SHALL define a foreign key relationship from disease_scans table to farms table via farm_id
5. THE Database_Schema SHALL define a foreign key relationship from weather_logs table to farms table via farm_id
6. WHEN a foreign key constraint is violated, THE Database_Schema SHALL reject the operation and return a descriptive error
7. THE Database_Schema SHALL include ON DELETE CASCADE or ON DELETE RESTRICT policies for all foreign keys based on business logic
8. THE Database_Schema SHALL include created_at and updated_at timestamp columns on all user-facing tables

### Requirement 4: Row Level Security Implementation

**User Story:** As a security engineer, I want Row Level Security enabled on all user tables, so that users can only access their own data.

#### Acceptance Criteria

1. THE Database_Schema SHALL enable RLS on profiles, farms, crops, soil_reports, disease_scans, and weather_logs tables
2. WHEN a user queries their data, THE Database_Schema SHALL enforce RLS policies that filter results to only records owned by that user
3. THE Database_Schema SHALL define RLS policies using auth.uid() to match the authenticated user
4. WHEN RLS is enabled on a table, THE Database_Schema SHALL define explicit SELECT, INSERT, UPDATE, and DELETE policies
5. THE Database_Schema SHALL prevent users from accessing or modifying records owned by other users through RLS policies
6. THE Backend_Foundation SHALL use the Service_Role_Key only in server-side contexts where RLS bypass is required and safe

### Requirement 5: Database Indexes for Performance

**User Story:** As a developer, I want appropriate indexes on frequently queried columns, so that database queries perform efficiently at scale.

#### Acceptance Criteria

1. THE Database_Schema SHALL create an index on farms.user_id for efficient user-based queries
2. THE Database_Schema SHALL create an index on crops.farm_id for efficient farm-based queries
3. THE Database_Schema SHALL create an index on soil_reports.farm_id for efficient farm-based queries
4. THE Database_Schema SHALL create an index on disease_scans.farm_id for efficient farm-based queries
5. THE Database_Schema SHALL create an index on weather_logs.farm_id for efficient farm-based queries
6. THE Database_Schema SHALL create indexes on created_at columns for time-based queries and sorting
7. WHEN adding an index, THE Migration SHALL use CREATE INDEX CONCURRENTLY to avoid locking tables in production

### Requirement 6: Folder Structure and Architecture

**User Story:** As a developer, I want a clean, scalable folder structure, so that the codebase is organized and maintainable as it grows.

#### Acceptance Criteria

1. THE Backend_Foundation SHALL implement a /src directory containing /app, /components, /features, /services, /hooks, /types, /utils, /lib, /config, and /server subdirectories
2. THE Backend_Foundation SHALL organize domain logic into Feature_Modules within /src/features including /auth, /farms, /soil, /weather, and /disease-detection
3. WHEN a Feature_Module is created, THE Backend_Foundation SHALL include subdirectories for components, types, hooks, services, validation, and business logic
4. THE Backend_Foundation SHALL place shared utilities in /src/utils and shared types in /src/types
5. THE Backend_Foundation SHALL place database client configuration in /src/lib
6. THE Backend_Foundation SHALL place environment configuration in /src/config
7. THE Backend_Foundation SHALL place server-only code in /src/server to prevent client-side bundling

### Requirement 7: Service Layer Architecture

**User Story:** As a developer, I want a service layer that encapsulates all database operations, so that components never directly query the database.

#### Acceptance Criteria

1. THE Backend_Foundation SHALL implement service modules including auth.service.ts, farm.service.ts, soil.service.ts, disease.service.ts, and weather.service.ts
2. THE Service_Layer SHALL encapsulate all database queries, inserts, updates, and deletes
3. THE Service_Layer SHALL handle input validation using Validation_Schema before database operations
4. THE Service_Layer SHALL handle error transformation and return consistent error responses
5. WHEN a component needs data, THE Backend_Foundation SHALL require the component to call a Service_Layer method
6. THE Service_Layer SHALL use TypeScript interfaces for all input parameters and return types
7. THE Service_Layer SHALL implement pagination for list operations that may return large result sets

### Requirement 8: Type Safety and Generated Types

**User Story:** As a developer, I want strict TypeScript types throughout the codebase, so that type errors are caught at compile time rather than runtime.

#### Acceptance Criteria

1. THE Backend_Foundation SHALL enable TypeScript strict mode in tsconfig.json
2. THE Backend_Foundation SHALL generate database types from the Database_Schema into database.types.ts
3. THE Backend_Foundation SHALL define domain types in farm.types.ts, auth.types.ts, soil.types.ts, disease.types.ts, and weather.types.ts
4. THE Backend_Foundation SHALL define API_Contract types in api.types.ts for all request and response payloads
5. THE Backend_Foundation SHALL minimize use of 'any' type and require explicit typing for function parameters and return values
6. WHEN database schema changes, THE Backend_Foundation SHALL regenerate database.types.ts to maintain type synchronization
7. THE Backend_Foundation SHALL use TypeScript utility types (Pick, Omit, Partial) to derive types rather than duplicating definitions

### Requirement 9: Environment Variable Management

**User Story:** As a security engineer, I want proper separation of client-safe and server-only environment variables, so that sensitive credentials are never exposed to the frontend.

#### Acceptance Criteria

1. THE Backend_Foundation SHALL define NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as client-safe environment variables
2. THE Backend_Foundation SHALL define SUPABASE_SERVICE_ROLE_KEY and DATABASE_URL as server-only environment variables
3. THE Backend_Foundation SHALL prevent server-only environment variables from being bundled in client-side code
4. THE Backend_Foundation SHALL provide a configuration module in /src/config that validates required environment variables at startup
5. WHEN a required environment variable is missing, THE Backend_Foundation SHALL throw a descriptive error during application initialization
6. THE Backend_Foundation SHALL document all required environment variables in a .env.example file
7. THE Backend_Foundation SHALL use the Publishable_Key for client-side Supabase operations and Service_Role_Key only in server-side contexts

### Requirement 10: Authentication Foundation

**User Story:** As a user, I want secure authentication with session persistence, so that I can safely access my account across sessions.

#### Acceptance Criteria

1. THE Backend_Foundation SHALL implement user signup using Supabase Auth with email and password
2. THE Backend_Foundation SHALL implement user login using Supabase Auth with email and password
3. THE Backend_Foundation SHALL persist Auth_Session using Supabase session management
4. THE Backend_Foundation SHALL implement session validation middleware for Protected_Routes
5. WHEN a user accesses a Protected_Route without a valid Auth_Session, THE Backend_Foundation SHALL return a 401 Unauthorized response
6. THE Backend_Foundation SHALL implement logout functionality that clears the Auth_Session
7. THE Backend_Foundation SHALL create a user profile record in the profiles table when a new user signs up
8. THE Backend_Foundation SHALL validate authentication tokens on the server side before processing requests

### Requirement 11: Protected Routes and Middleware

**User Story:** As a developer, I want middleware that automatically protects routes requiring authentication, so that authorization is enforced consistently.

#### Acceptance Criteria

1. THE Backend_Foundation SHALL implement Next.js middleware that validates Auth_Session for Protected_Routes
2. WHEN middleware detects an invalid or missing Auth_Session, THE Backend_Foundation SHALL redirect to the login page
3. THE Backend_Foundation SHALL define route patterns that require authentication in middleware configuration
4. THE Backend_Foundation SHALL allow public routes (login, signup, landing page) to bypass authentication middleware
5. THE Backend_Foundation SHALL extract user identity from Auth_Session and make it available to Protected_Routes
6. THE Backend_Foundation SHALL refresh expired sessions automatically when possible
7. WHEN session refresh fails, THE Backend_Foundation SHALL redirect to login and clear invalid session data

### Requirement 12: API Request and Response Schemas

**User Story:** As a developer, I want defined request and response schemas for all API endpoints, so that API contracts are clear and validated.

#### Acceptance Criteria

1. THE Backend_Foundation SHALL define Validation_Schema using Zod for all API endpoint request bodies
2. THE Backend_Foundation SHALL define TypeScript interfaces for all API endpoint response payloads
3. WHEN an API request is received, THE Backend_Foundation SHALL validate the request body against the Validation_Schema
4. WHEN validation fails, THE Backend_Foundation SHALL return a 400 Bad Request response with descriptive error messages
5. THE Backend_Foundation SHALL return consistent response structures including success status, data, and error fields
6. THE Backend_Foundation SHALL define schemas for farm creation, soil report submission, disease scan upload, and weather log creation
7. THE Backend_Foundation SHALL export all API_Contract types for use in frontend code

### Requirement 13: Error Handling and Logging

**User Story:** As a developer, I want consistent error handling and logging, so that I can diagnose issues quickly in production.

#### Acceptance Criteria

1. THE Backend_Foundation SHALL implement a centralized error handling utility that transforms errors into consistent response formats
2. WHEN a database error occurs, THE Backend_Foundation SHALL log the error details and return a user-friendly error message
3. WHEN a validation error occurs, THE Backend_Foundation SHALL return specific field-level error messages
4. THE Backend_Foundation SHALL log errors with severity levels (error, warn, info, debug)
5. THE Backend_Foundation SHALL include request context (user ID, endpoint, timestamp) in error logs
6. THE Backend_Foundation SHALL prevent sensitive information (passwords, tokens, Service_Role_Key) from appearing in logs
7. WHEN an unhandled error occurs, THE Backend_Foundation SHALL return a 500 Internal Server Error response with a generic message

### Requirement 14: Farm Management Service

**User Story:** As a farmer, I want to create and manage my farms, so that I can organize my agricultural operations.

#### Acceptance Criteria

1. THE Service_Layer SHALL implement createFarm method that inserts a farm record linked to the authenticated user
2. THE Service_Layer SHALL implement getFarmsByUser method that retrieves all farms owned by the authenticated user
3. THE Service_Layer SHALL implement getFarmById method that retrieves a single farm by ID with ownership validation
4. THE Service_Layer SHALL implement updateFarm method that modifies farm details with ownership validation
5. THE Service_Layer SHALL implement deleteFarm method that removes a farm and handles cascading deletes for related records
6. WHEN creating a farm, THE Service_Layer SHALL validate required fields (name, location) using Validation_Schema
7. THE Service_Layer SHALL return typed farm objects matching the farm.types.ts interface

### Requirement 15: Soil Report Service

**User Story:** As a farmer, I want to submit and view soil reports for my farms, so that I can monitor soil health over time.

#### Acceptance Criteria

1. THE Service_Layer SHALL implement createSoilReport method that inserts a soil report linked to a farm
2. THE Service_Layer SHALL implement getSoilReportsByFarm method that retrieves all soil reports for a specific farm with pagination
3. THE Service_Layer SHALL implement getSoilReportById method that retrieves a single soil report with ownership validation
4. WHEN creating a soil report, THE Service_Layer SHALL validate farm ownership before insertion
5. WHEN creating a soil report, THE Service_Layer SHALL validate required fields (pH, nitrogen, phosphorus, potassium) using Validation_Schema
6. THE Service_Layer SHALL return typed soil report objects matching the soil.types.ts interface
7. THE Service_Layer SHALL order soil reports by created_at descending by default

### Requirement 16: Disease Detection Service

**User Story:** As a farmer, I want to upload crop images for disease detection, so that I can identify and treat plant diseases early.

#### Acceptance Criteria

1. THE Service_Layer SHALL implement createDiseaseScan method that inserts a disease scan record linked to a farm
2. THE Service_Layer SHALL implement getDiseaseScansByFarm method that retrieves all disease scans for a specific farm with pagination
3. THE Service_Layer SHALL implement getDiseaseScanById method that retrieves a single disease scan with ownership validation
4. WHEN creating a disease scan, THE Service_Layer SHALL validate farm ownership before insertion
5. WHEN creating a disease scan, THE Service_Layer SHALL validate required fields (image_url, crop_type) using Validation_Schema
6. THE Service_Layer SHALL return typed disease scan objects matching the disease.types.ts interface
7. THE Service_Layer SHALL store image URLs referencing Supabase Storage buckets

### Requirement 17: Weather Logging Service

**User Story:** As a farmer, I want to log weather conditions for my farms, so that I can correlate weather with crop performance.

#### Acceptance Criteria

1. THE Service_Layer SHALL implement createWeatherLog method that inserts a weather log linked to a farm
2. THE Service_Layer SHALL implement getWeatherLogsByFarm method that retrieves weather logs for a specific farm with date range filtering
3. THE Service_Layer SHALL implement getWeatherLogById method that retrieves a single weather log with ownership validation
4. WHEN creating a weather log, THE Service_Layer SHALL validate farm ownership before insertion
5. WHEN creating a weather log, THE Service_Layer SHALL validate required fields (temperature, humidity, rainfall) using Validation_Schema
6. THE Service_Layer SHALL return typed weather log objects matching the weather.types.ts interface
7. THE Service_Layer SHALL support querying weather logs by date range for trend analysis

### Requirement 18: Reusable React Hooks

**User Story:** As a frontend developer, I want reusable React hooks for data fetching, so that I can access backend services consistently across components.

#### Acceptance Criteria

1. THE Backend_Foundation SHALL implement custom hooks including useFarms, useSoilReports, useDiseaseScans, and useWeatherLogs
2. WHEN a custom hook is called, THE Backend_Foundation SHALL handle loading states, error states, and data states
3. THE Backend_Foundation SHALL implement hooks that call Service_Layer methods rather than direct database queries
4. THE Backend_Foundation SHALL implement mutation hooks (useCreateFarm, useUpdateFarm) that handle optimistic updates
5. THE Backend_Foundation SHALL implement hooks that automatically refetch data after mutations
6. THE Backend_Foundation SHALL type hook return values using TypeScript interfaces
7. THE Backend_Foundation SHALL implement hooks that handle authentication errors and trigger re-login when needed

### Requirement 19: Code Organization and Modularity

**User Story:** As a developer, I want modular, reusable code without duplication, so that the codebase is maintainable and scalable.

#### Acceptance Criteria

1. THE Backend_Foundation SHALL limit file size to a maximum of 300 lines of code per file
2. WHEN a file exceeds 300 lines, THE Backend_Foundation SHALL refactor into smaller, focused modules
3. THE Backend_Foundation SHALL extract shared logic into utility functions in /src/utils
4. THE Backend_Foundation SHALL avoid duplicating validation logic by defining Validation_Schema once per domain
5. THE Backend_Foundation SHALL avoid duplicating database queries by centralizing them in Service_Layer methods
6. THE Backend_Foundation SHALL use dependency injection patterns to make services testable
7. THE Backend_Foundation SHALL follow single responsibility principle with each module having one clear purpose

### Requirement 20: Performance Optimization

**User Story:** As a user, I want fast response times for all operations, so that the platform feels responsive and professional.

#### Acceptance Criteria

1. THE Backend_Foundation SHALL implement pagination for all list endpoints with configurable page size
2. THE Backend_Foundation SHALL use database indexes to optimize query performance on foreign keys and timestamp columns
3. THE Backend_Foundation SHALL implement query result caching for frequently accessed, slowly changing data
4. THE Backend_Foundation SHALL use SELECT with specific columns rather than SELECT * to minimize data transfer
5. THE Backend_Foundation SHALL implement connection pooling for database connections
6. WHEN a query returns more than 100 records, THE Backend_Foundation SHALL require pagination parameters
7. THE Backend_Foundation SHALL monitor and log slow queries exceeding 1 second execution time

### Requirement 21: Supabase Client Configuration

**User Story:** As a developer, I want properly configured Supabase clients for client-side and server-side use, so that authentication and RLS work correctly in all contexts.

#### Acceptance Criteria

1. THE Backend_Foundation SHALL implement a client-side Supabase client using the Publishable_Key
2. THE Backend_Foundation SHALL implement a server-side Supabase client using the Service_Role_Key
3. THE Backend_Foundation SHALL configure the client-side Supabase client to persist Auth_Session in browser storage
4. THE Backend_Foundation SHALL configure the server-side Supabase client to bypass RLS only when necessary
5. THE Backend_Foundation SHALL export Supabase clients from /src/lib/supabase for consistent usage
6. THE Backend_Foundation SHALL prevent the server-side Supabase client from being imported in client-side code
7. THE Backend_Foundation SHALL configure Supabase clients with appropriate timeout and retry settings

### Requirement 22: Database Type Generation

**User Story:** As a developer, I want automatically generated TypeScript types from the database schema, so that types stay synchronized with the database structure.

#### Acceptance Criteria

1. THE Backend_Foundation SHALL provide a script to generate TypeScript types from the Database_Schema
2. WHEN the Database_Schema changes, THE Backend_Foundation SHALL allow regeneration of types via npm script
3. THE Backend_Foundation SHALL generate types for all tables, views, and functions in database.types.ts
4. THE Backend_Foundation SHALL generate types that include nullable fields, foreign key relationships, and enum types
5. THE Backend_Foundation SHALL use generated types in Service_Layer method signatures
6. THE Backend_Foundation SHALL document the type generation process in README.md
7. THE Backend_Foundation SHALL include type generation in the development workflow checklist

### Requirement 23: API Route Structure

**User Story:** As a developer, I want a consistent API route structure, so that endpoints are predictable and follow REST conventions.

#### Acceptance Criteria

1. THE Backend_Foundation SHALL implement API routes under /app/api following Next.js App Router conventions
2. THE Backend_Foundation SHALL organize API routes by resource: /api/farms, /api/soil-reports, /api/disease-scans, /api/weather-logs
3. THE Backend_Foundation SHALL implement standard HTTP methods: GET for retrieval, POST for creation, PUT/PATCH for updates, DELETE for removal
4. THE Backend_Foundation SHALL return appropriate HTTP status codes: 200 for success, 201 for creation, 400 for validation errors, 401 for authentication errors, 404 for not found, 500 for server errors
5. THE Backend_Foundation SHALL implement route handlers that validate authentication before processing requests
6. THE Backend_Foundation SHALL implement route handlers that call Service_Layer methods rather than direct database access
7. THE Backend_Foundation SHALL return JSON responses with consistent structure across all endpoints

### Requirement 24: Input Validation with Zod

**User Story:** As a developer, I want runtime input validation using Zod schemas, so that invalid data is rejected before reaching the database.

#### Acceptance Criteria

1. THE Backend_Foundation SHALL define Zod schemas for farm creation, update, and query parameters
2. THE Backend_Foundation SHALL define Zod schemas for soil report creation and query parameters
3. THE Backend_Foundation SHALL define Zod schemas for disease scan creation and query parameters
4. THE Backend_Foundation SHALL define Zod schemas for weather log creation and query parameters
5. WHEN validation fails, THE Backend_Foundation SHALL return field-specific error messages indicating which fields are invalid and why
6. THE Backend_Foundation SHALL validate string lengths, number ranges, email formats, and required fields using Zod
7. THE Backend_Foundation SHALL export Zod schemas for reuse in frontend validation

### Requirement 25: Documentation and Developer Experience

**User Story:** As a new developer joining the project, I want comprehensive documentation, so that I can understand the architecture and contribute effectively.

#### Acceptance Criteria

1. THE Backend_Foundation SHALL provide a README.md documenting architecture overview, folder structure, and setup instructions
2. THE Backend_Foundation SHALL provide a CONTRIBUTING.md documenting coding standards, git workflow, and testing requirements
3. THE Backend_Foundation SHALL document all Service_Layer methods with JSDoc comments including parameters, return types, and examples
4. THE Backend_Foundation SHALL provide a .env.example file documenting all required environment variables
5. THE Backend_Foundation SHALL document the migration process including how to create, apply, and rollback migrations
6. THE Backend_Foundation SHALL provide setup scripts that validate environment configuration and database connectivity
7. THE Backend_Foundation SHALL document the relationship between tables in an entity relationship diagram or markdown table

## Summary

This requirements document defines 25 comprehensive requirements covering database safety, architecture, security, type safety, and developer experience for the Kulima AgriTech platform backend foundation. The requirements prioritize:

1. **Database Safety**: Never breaking existing data through careful inspection, migrations, and rollback plans
2. **Security**: RLS policies, proper authentication, environment variable separation
3. **Architecture**: Clean folder structure, service layer, feature modules
4. **Type Safety**: Strict TypeScript, generated types, Zod validation
5. **Maintainability**: Modular code, documentation, consistent patterns
6. **Performance**: Indexes, pagination, optimized queries
7. **Developer Experience**: Clear structure, reusable hooks, comprehensive documentation

All requirements follow EARS patterns and INCOSE quality rules to ensure clarity, testability, and completeness.
