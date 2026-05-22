# Kulima AgriTech Database Schema Documentation

**Generated:** 2024-01-20  
**Database:** PostgreSQL 15+ via Supabase  
**Project ID:** hjvnkintvjogwljchwcq  
**Migration Version:** 20240101000000_initial_schema

## Overview

This document provides comprehensive documentation of the Kulima AgriTech platform database schema, including all tables, columns, data types, constraints, foreign key relationships, indexes, and Row Level Security (RLS) policies.

The schema is designed to support an African agricultural technology platform that helps farmers manage their farms, monitor soil health, detect crop diseases, and track weather conditions.

## Schema Principles

1. **Security First**: All user-facing tables have RLS enabled with policies enforcing user ownership
2. **Data Integrity**: Foreign key constraints ensure referential integrity across related tables
3. **Audit Trail**: All tables include `created_at` timestamps; mutable tables include `updated_at` with automatic triggers
4. **Performance**: Strategic indexes on foreign keys and timestamp columns for efficient queries
5. **Validation**: Database-level constraints validate data ranges and business rules

## Entity Relationship Diagram

```
┌─────────────┐
│ auth.users  │ (Supabase Auth)
└──────┬──────┘
       │
       │ 1:1
       ↓
┌─────────────┐
│  profiles   │
└──────┬──────┘
       │
       │ 1:N
       ↓
┌─────────────┐
│    farms    │
└──────┬──────┘
       │
       ├─────────────┬─────────────┬─────────────┬─────────────┐
       │ 1:N         │ 1:N         │ 1:N         │ 1:N         │ 1:N
       ↓             ↓             ↓             ↓             ↓
┌──────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  crops   │  │ soil_reports │  │disease_scans │  │ weather_logs │
└──────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

## Tables

### 1. profiles

**Purpose:** Stores user profile information linked to Supabase Auth users.

**Relationship:** One-to-one with `auth.users` (Supabase Auth table)

#### Columns

| Column Name    | Data Type      | Nullable | Default              | Description                          |
|----------------|----------------|----------|----------------------|--------------------------------------|
| id             | UUID           | NO       | gen_random_uuid()    | Primary key                          |
| user_id        | UUID           | NO       | -                    | Foreign key to auth.users(id)        |
| full_name      | TEXT           | NO       | -                    | User's full name                     |
| phone_number   | TEXT           | YES      | NULL                 | User's phone number (optional)       |
| location       | TEXT           | YES      | NULL                 | User's location (optional)           |
| created_at     | TIMESTAMPTZ    | NO       | NOW()                | Record creation timestamp            |
| updated_at     | TIMESTAMPTZ    | NO       | NOW()                | Record last update timestamp         |

#### Constraints

- **PRIMARY KEY:** `profiles_pkey` on `id`
- **UNIQUE:** `profiles_user_id_key` on `user_id` (ensures one profile per user)
- **FOREIGN KEY:** `profiles_user_id_fkey` 
  - `user_id` → `auth.users(id)`
  - ON DELETE CASCADE (deleting auth user deletes profile)

#### Indexes

- `idx_profiles_user_id` on `user_id` (for efficient user lookups)
- `profiles_pkey` on `id` (primary key index)

#### Triggers

- `update_profiles_updated_at`: Automatically updates `updated_at` timestamp on row updates

#### Row Level Security (RLS)

**Status:** ENABLED

**Policies:**

1. **"Users can view own profile"** (SELECT)
   - USING: `auth.uid() = user_id`
   - Users can only view their own profile

2. **"Users can update own profile"** (UPDATE)
   - USING: `auth.uid() = user_id`
   - Users can only update their own profile

3. **"Users can insert own profile"** (INSERT)
   - WITH CHECK: `auth.uid() = user_id`
   - Users can only create profiles for themselves

---

### 2. farms

**Purpose:** Stores farm information owned by users.

**Relationship:** Many-to-one with `auth.users`

#### Columns

| Column Name    | Data Type      | Nullable | Default              | Description                          |
|----------------|----------------|----------|----------------------|--------------------------------------|
| id             | UUID           | NO       | gen_random_uuid()    | Primary key                          |
| user_id        | UUID           | NO       | -                    | Foreign key to auth.users(id)        |
| name           | TEXT           | NO       | -                    | Farm name                            |
| location       | TEXT           | NO       | -                    | Farm location/address                |
| size_hectares  | DECIMAL(10,2)  | YES      | NULL                 | Farm size in hectares (optional)     |
| farm_type      | TEXT           | YES      | NULL                 | Type of farm (optional)              |
| created_at     | TIMESTAMPTZ    | NO       | NOW()                | Record creation timestamp            |
| updated_at     | TIMESTAMPTZ    | NO       | NOW()                | Record last update timestamp         |

#### Constraints

- **PRIMARY KEY:** `farms_pkey` on `id`
- **FOREIGN KEY:** `farms_user_id_fkey`
  - `user_id` → `auth.users(id)`
  - ON DELETE CASCADE (deleting user deletes their farms)
- **CHECK:** `valid_size`
  - Ensures `size_hectares IS NULL OR size_hectares > 0`
  - Farm size must be positive if provided

#### Indexes

- `idx_farms_user_id` on `user_id` (for efficient user farm queries)
- `idx_farms_created_at` on `created_at DESC` (for sorting by creation date)
- `farms_pkey` on `id` (primary key index)

#### Triggers

- `update_farms_updated_at`: Automatically updates `updated_at` timestamp on row updates

#### Row Level Security (RLS)

**Status:** ENABLED

**Policies:**

1. **"Users can view own farms"** (SELECT)
   - USING: `auth.uid() = user_id`
   - Users can only view their own farms

2. **"Users can insert own farms"** (INSERT)
   - WITH CHECK: `auth.uid() = user_id`
   - Users can only create farms for themselves

3. **"Users can update own farms"** (UPDATE)
   - USING: `auth.uid() = user_id`
   - Users can only update their own farms

4. **"Users can delete own farms"** (DELETE)
   - USING: `auth.uid() = user_id`
   - Users can only delete their own farms

---

### 3. crops

**Purpose:** Stores crop information for farms.

**Relationship:** Many-to-one with `farms`

#### Columns

| Column Name            | Data Type      | Nullable | Default              | Description                          |
|------------------------|----------------|----------|----------------------|--------------------------------------|
| id                     | UUID           | NO       | gen_random_uuid()    | Primary key                          |
| farm_id                | UUID           | NO       | -                    | Foreign key to farms(id)             |
| crop_name              | TEXT           | NO       | -                    | Name of the crop                     |
| variety                | TEXT           | YES      | NULL                 | Crop variety (optional)              |
| planting_date          | DATE           | YES      | NULL                 | Date crop was planted (optional)     |
| expected_harvest_date  | DATE           | YES      | NULL                 | Expected harvest date (optional)     |
| status                 | TEXT           | NO       | 'planted'            | Crop status (e.g., planted, growing) |
| created_at             | TIMESTAMPTZ    | NO       | NOW()                | Record creation timestamp            |
| updated_at             | TIMESTAMPTZ    | NO       | NOW()                | Record last update timestamp         |

#### Constraints

- **PRIMARY KEY:** `crops_pkey` on `id`
- **FOREIGN KEY:** `crops_farm_id_fkey`
  - `farm_id` → `farms(id)`
  - ON DELETE CASCADE (deleting farm deletes its crops)
- **CHECK:** `valid_harvest_date`
  - Ensures `expected_harvest_date IS NULL OR planting_date IS NULL OR expected_harvest_date >= planting_date`
  - Harvest date cannot be before planting date

#### Indexes

- `idx_crops_farm_id` on `farm_id` (for efficient farm crop queries)
- `idx_crops_planting_date` on `planting_date DESC` (for sorting by planting date)
- `crops_pkey` on `id` (primary key index)

#### Triggers

- `update_crops_updated_at`: Automatically updates `updated_at` timestamp on row updates

#### Row Level Security (RLS)

**Status:** ENABLED

**Policies:**

1. **"Users can view crops from own farms"** (SELECT)
   - USING: `EXISTS (SELECT 1 FROM farms WHERE farms.id = crops.farm_id AND farms.user_id = auth.uid())`
   - Users can only view crops from farms they own

2. **"Users can insert crops to own farms"** (INSERT)
   - WITH CHECK: `EXISTS (SELECT 1 FROM farms WHERE farms.id = crops.farm_id AND farms.user_id = auth.uid())`
   - Users can only add crops to farms they own

3. **"Users can update crops in own farms"** (UPDATE)
   - USING: `EXISTS (SELECT 1 FROM farms WHERE farms.id = crops.farm_id AND farms.user_id = auth.uid())`
   - Users can only update crops in farms they own

4. **"Users can delete crops from own farms"** (DELETE)
   - USING: `EXISTS (SELECT 1 FROM farms WHERE farms.id = crops.farm_id AND farms.user_id = auth.uid())`
   - Users can only delete crops from farms they own

---

### 4. soil_reports

**Purpose:** Stores soil analysis reports for farms.

**Relationship:** Many-to-one with `farms`

#### Columns

| Column Name      | Data Type      | Nullable | Default              | Description                          |
|------------------|----------------|----------|----------------------|--------------------------------------|
| id               | UUID           | NO       | gen_random_uuid()    | Primary key                          |
| farm_id          | UUID           | NO       | -                    | Foreign key to farms(id)             |
| ph_level         | DECIMAL(3,1)   | NO       | -                    | Soil pH level (0-14)                 |
| nitrogen         | DECIMAL(5,2)   | NO       | -                    | Nitrogen content (N)                 |
| phosphorus       | DECIMAL(5,2)   | NO       | -                    | Phosphorus content (P)               |
| potassium        | DECIMAL(5,2)   | NO       | -                    | Potassium content (K)                |
| organic_matter   | DECIMAL(5,2)   | YES      | NULL                 | Organic matter percentage (optional) |
| recommendations  | TEXT           | YES      | NULL                 | Soil improvement recommendations     |
| created_at       | TIMESTAMPTZ    | NO       | NOW()                | Record creation timestamp            |

#### Constraints

- **PRIMARY KEY:** `soil_reports_pkey` on `id`
- **FOREIGN KEY:** `soil_reports_farm_id_fkey`
  - `farm_id` → `farms(id)`
  - ON DELETE CASCADE (deleting farm deletes its soil reports)
- **CHECK:** `valid_ph`
  - Ensures `ph_level >= 0 AND ph_level <= 14`
  - pH must be in valid range
- **CHECK:** `valid_nitrogen`
  - Ensures `nitrogen >= 0`
  - Nitrogen content must be non-negative
- **CHECK:** `valid_phosphorus`
  - Ensures `phosphorus >= 0`
  - Phosphorus content must be non-negative
- **CHECK:** `valid_potassium`
  - Ensures `potassium >= 0`
  - Potassium content must be non-negative

#### Indexes

- `idx_soil_reports_farm_id` on `farm_id` (for efficient farm report queries)
- `idx_soil_reports_created_at` on `created_at DESC` (for sorting by date)
- `soil_reports_pkey` on `id` (primary key index)

#### Triggers

None (no `updated_at` column as soil reports are immutable)

#### Row Level Security (RLS)

**Status:** ENABLED

**Policies:**

1. **"Users can view soil reports from own farms"** (SELECT)
   - USING: `EXISTS (SELECT 1 FROM farms WHERE farms.id = soil_reports.farm_id AND farms.user_id = auth.uid())`
   - Users can only view soil reports from farms they own

2. **"Users can insert soil reports to own farms"** (INSERT)
   - WITH CHECK: `EXISTS (SELECT 1 FROM farms WHERE farms.id = soil_reports.farm_id AND farms.user_id = auth.uid())`
   - Users can only create soil reports for farms they own

---

### 5. disease_scans

**Purpose:** Stores crop disease detection scan results.

**Relationship:** Many-to-one with `farms`

#### Columns

| Column Name               | Data Type      | Nullable | Default              | Description                          |
|---------------------------|----------------|----------|----------------------|--------------------------------------|
| id                        | UUID           | NO       | gen_random_uuid()    | Primary key                          |
| farm_id                   | UUID           | NO       | -                    | Foreign key to farms(id)             |
| crop_type                 | TEXT           | NO       | -                    | Type of crop scanned                 |
| image_url                 | TEXT           | NO       | -                    | URL to uploaded crop image           |
| disease_detected          | TEXT           | YES      | NULL                 | Detected disease name (if any)       |
| confidence_score          | DECIMAL(5,2)   | YES      | NULL                 | Detection confidence (0-100)         |
| treatment_recommendations | TEXT           | YES      | NULL                 | Treatment recommendations            |
| created_at                | TIMESTAMPTZ    | NO       | NOW()                | Record creation timestamp            |

#### Constraints

- **PRIMARY KEY:** `disease_scans_pkey` on `id`
- **FOREIGN KEY:** `disease_scans_farm_id_fkey`
  - `farm_id` → `farms(id)`
  - ON DELETE CASCADE (deleting farm deletes its disease scans)
- **CHECK:** `valid_confidence`
  - Ensures `confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100)`
  - Confidence score must be between 0 and 100 if provided

#### Indexes

- `idx_disease_scans_farm_id` on `farm_id` (for efficient farm scan queries)
- `idx_disease_scans_created_at` on `created_at DESC` (for sorting by date)
- `disease_scans_pkey` on `id` (primary key index)

#### Triggers

None (no `updated_at` column as disease scans are immutable)

#### Row Level Security (RLS)

**Status:** ENABLED

**Policies:**

1. **"Users can view disease scans from own farms"** (SELECT)
   - USING: `EXISTS (SELECT 1 FROM farms WHERE farms.id = disease_scans.farm_id AND farms.user_id = auth.uid())`
   - Users can only view disease scans from farms they own

2. **"Users can insert disease scans to own farms"** (INSERT)
   - WITH CHECK: `EXISTS (SELECT 1 FROM farms WHERE farms.id = disease_scans.farm_id AND farms.user_id = auth.uid())`
   - Users can only create disease scans for farms they own

---

### 6. weather_logs

**Purpose:** Stores weather condition logs for farms.

**Relationship:** Many-to-one with `farms`

#### Columns

| Column Name    | Data Type      | Nullable | Default              | Description                          |
|----------------|----------------|----------|----------------------|--------------------------------------|
| id             | UUID           | NO       | gen_random_uuid()    | Primary key                          |
| farm_id        | UUID           | NO       | -                    | Foreign key to farms(id)             |
| temperature    | DECIMAL(5,2)   | NO       | -                    | Temperature in Celsius               |
| humidity       | DECIMAL(5,2)   | NO       | -                    | Humidity percentage (0-100)          |
| rainfall       | DECIMAL(6,2)   | NO       | 0                    | Rainfall in millimeters              |
| wind_speed     | DECIMAL(5,2)   | YES      | NULL                 | Wind speed (optional)                |
| conditions     | TEXT           | YES      | NULL                 | Weather conditions description       |
| recorded_at    | TIMESTAMPTZ    | NO       | -                    | When weather was recorded            |
| created_at     | TIMESTAMPTZ    | NO       | NOW()                | Record creation timestamp            |

#### Constraints

- **PRIMARY KEY:** `weather_logs_pkey` on `id`
- **FOREIGN KEY:** `weather_logs_farm_id_fkey`
  - `farm_id` → `farms(id)`
  - ON DELETE CASCADE (deleting farm deletes its weather logs)
- **CHECK:** `valid_humidity`
  - Ensures `humidity >= 0 AND humidity <= 100`
  - Humidity must be between 0 and 100
- **CHECK:** `valid_rainfall`
  - Ensures `rainfall >= 0`
  - Rainfall must be non-negative

#### Indexes

- `idx_weather_logs_farm_id` on `farm_id` (for efficient farm weather queries)
- `idx_weather_logs_recorded_at` on `recorded_at DESC` (for sorting by recording time)
- `idx_weather_logs_created_at` on `created_at DESC` (for sorting by creation time)
- `weather_logs_pkey` on `id` (primary key index)

#### Triggers

None (no `updated_at` column as weather logs are immutable)

#### Row Level Security (RLS)

**Status:** ENABLED

**Policies:**

1. **"Users can view weather logs from own farms"** (SELECT)
   - USING: `EXISTS (SELECT 1 FROM farms WHERE farms.id = weather_logs.farm_id AND farms.user_id = auth.uid())`
   - Users can only view weather logs from farms they own

2. **"Users can insert weather logs to own farms"** (INSERT)
   - WITH CHECK: `EXISTS (SELECT 1 FROM farms WHERE farms.id = weather_logs.farm_id AND farms.user_id = auth.uid())`
   - Users can only create weather logs for farms they own

---

## Database Functions

### update_updated_at_column()

**Purpose:** Trigger function that automatically updates the `updated_at` timestamp when a row is modified.

**Returns:** TRIGGER

**Language:** plpgsql

**Definition:**
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Used By:**
- `profiles` table (trigger: `update_profiles_updated_at`)
- `farms` table (trigger: `update_farms_updated_at`)
- `crops` table (trigger: `update_crops_updated_at`)

---

## Foreign Key Relationships Summary

| Child Table    | Child Column | Parent Table | Parent Column | Delete Rule | Update Rule |
|----------------|--------------|--------------|---------------|-------------|-------------|
| profiles       | user_id      | auth.users   | id            | CASCADE     | CASCADE     |
| farms          | user_id      | auth.users   | id            | CASCADE     | CASCADE     |
| crops          | farm_id      | farms        | id            | CASCADE     | CASCADE     |
| soil_reports   | farm_id      | farms        | id            | CASCADE     | CASCADE     |
| disease_scans  | farm_id      | farms        | id            | CASCADE     | CASCADE     |
| weather_logs   | farm_id      | farms        | id            | CASCADE     | CASCADE     |

**Cascade Behavior:**
- Deleting a user from `auth.users` cascades to delete their profile and all farms
- Deleting a farm cascades to delete all associated crops, soil reports, disease scans, and weather logs
- This ensures referential integrity and prevents orphaned records

---

## Index Summary

### Performance Indexes

| Table          | Index Name                      | Columns                | Purpose                          |
|----------------|---------------------------------|------------------------|----------------------------------|
| profiles       | idx_profiles_user_id            | user_id                | User profile lookups             |
| farms          | idx_farms_user_id               | user_id                | User farm queries                |
| farms          | idx_farms_created_at            | created_at DESC        | Sorting farms by date            |
| crops          | idx_crops_farm_id               | farm_id                | Farm crop queries                |
| crops          | idx_crops_planting_date         | planting_date DESC     | Sorting crops by planting date   |
| soil_reports   | idx_soil_reports_farm_id        | farm_id                | Farm soil report queries         |
| soil_reports   | idx_soil_reports_created_at     | created_at DESC        | Sorting reports by date          |
| disease_scans  | idx_disease_scans_farm_id       | farm_id                | Farm disease scan queries        |
| disease_scans  | idx_disease_scans_created_at    | created_at DESC        | Sorting scans by date            |
| weather_logs   | idx_weather_logs_farm_id        | farm_id                | Farm weather log queries         |
| weather_logs   | idx_weather_logs_recorded_at    | recorded_at DESC       | Sorting logs by recording time   |
| weather_logs   | idx_weather_logs_created_at     | created_at DESC        | Sorting logs by creation time    |

**Index Strategy:**
- Foreign key columns are indexed for efficient JOIN operations
- Timestamp columns are indexed with DESC order for recent-first queries
- All indexes support the common query patterns in the application

---

## Row Level Security (RLS) Summary

### Security Model

All user-facing tables implement Row Level Security with the following principles:

1. **User Ownership:** Users can only access data they own
2. **Transitive Ownership:** For child tables (crops, soil_reports, etc.), ownership is validated through the parent farm
3. **Operation-Specific Policies:** Separate policies for SELECT, INSERT, UPDATE, and DELETE operations
4. **Auth Integration:** Policies use `auth.uid()` to identify the authenticated user

### RLS Status by Table

| Table          | RLS Enabled | SELECT Policy | INSERT Policy | UPDATE Policy | DELETE Policy |
|----------------|-------------|---------------|---------------|---------------|---------------|
| profiles       | ✓           | ✓             | ✓             | ✓             | ✗             |
| farms          | ✓           | ✓             | ✓             | ✓             | ✓             |
| crops          | ✓           | ✓             | ✓             | ✓             | ✓             |
| soil_reports   | ✓           | ✓             | ✓             | ✗             | ✗             |
| disease_scans  | ✓           | ✓             | ✓             | ✗             | ✗             |
| weather_logs   | ✓           | ✓             | ✓             | ✗             | ✗             |

**Notes:**
- Profiles cannot be deleted directly (CASCADE from auth.users handles deletion)
- Soil reports, disease scans, and weather logs are immutable (no UPDATE/DELETE policies)
- All policies enforce ownership validation

---

## Data Validation Summary

### Check Constraints

| Table          | Constraint Name      | Validation Rule                                    |
|----------------|----------------------|----------------------------------------------------|
| farms          | valid_size           | size_hectares IS NULL OR size_hectares > 0         |
| crops          | valid_harvest_date   | expected_harvest_date >= planting_date (if both set) |
| soil_reports   | valid_ph             | ph_level >= 0 AND ph_level <= 14                   |
| soil_reports   | valid_nitrogen       | nitrogen >= 0                                      |
| soil_reports   | valid_phosphorus     | phosphorus >= 0                                    |
| soil_reports   | valid_potassium      | potassium >= 0                                     |
| disease_scans  | valid_confidence     | confidence_score >= 0 AND confidence_score <= 100  |
| weather_logs   | valid_humidity       | humidity >= 0 AND humidity <= 100                  |
| weather_logs   | valid_rainfall       | rainfall >= 0                                      |

**Validation Strategy:**
- Database-level constraints ensure data integrity at the lowest level
- Constraints validate business rules (e.g., positive sizes, valid ranges)
- Application-level validation (Zod schemas) provides user-friendly error messages

---

## Schema Verification Checklist

### Requirements Verification

This schema satisfies the following requirements from the design document:

- ✅ **R1.1-R1.5:** Database schema inspection and documentation complete
- ✅ **R3.1-R3.8:** All foreign key relationships defined with appropriate CASCADE rules
- ✅ **R4.1-R4.6:** RLS enabled on all user tables with appropriate policies
- ✅ **R5.1-R5.7:** Performance indexes created on foreign keys and timestamp columns

### Design Verification

- ✅ All 6 core tables defined: profiles, farms, crops, soil_reports, disease_scans, weather_logs
- ✅ All tables have UUID primary keys with `gen_random_uuid()` default
- ✅ All tables have `created_at` timestamp with `NOW()` default
- ✅ Mutable tables (profiles, farms, crops) have `updated_at` with automatic trigger
- ✅ All foreign keys reference correct parent tables
- ✅ All foreign keys have ON DELETE CASCADE for proper cleanup
- ✅ All user-facing tables have RLS enabled
- ✅ All RLS policies use `auth.uid()` for user identification
- ✅ All numeric fields have appropriate precision and scale
- ✅ All validation constraints enforce business rules

---

## Migration History

| Version                      | Applied Date | Description                                    |
|------------------------------|--------------|------------------------------------------------|
| 20240101000000_initial_schema | 2024-01-01   | Initial schema with all core tables, RLS, indexes |

---

## Next Steps

Based on this schema documentation, the following tasks can proceed:

1. ✅ **Task 2.1 Complete:** Schema inspection and documentation finished
2. ⏭️ **Task 2.2:** Create migration system foundation (MIGRATIONS.md)
3. ⏭️ **Task 2.3:** Verify initial schema migration is applied
4. ⏭️ **Task 2.4:** Create additional indexes migration if needed
5. ⏭️ **Task 3.1:** Generate TypeScript types from schema (already done in database.types.ts)

---

## Appendix: Schema Comparison with Design Document

### Tables Defined in Design vs. Actual Schema

| Table          | In Design | In Schema | Status |
|----------------|-----------|-----------|--------|
| profiles       | ✓         | ✓         | ✅ Match |
| farms          | ✓         | ✓         | ✅ Match |
| crops          | ✓         | ✓         | ✅ Match |
| soil_reports   | ✓         | ✓         | ✅ Match |
| disease_scans  | ✓         | ✓         | ✅ Match |
| weather_logs   | ✓         | ✓         | ✅ Match |

### Column Comparison

All columns defined in the design document are present in the actual schema with matching data types, constraints, and defaults. The schema implementation is **100% compliant** with the design specification.

### RLS Policy Comparison

All RLS policies defined in the design document are implemented in the actual schema. Policy names and logic match the design specification exactly.

### Index Comparison

All indexes specified in the design document are present in the actual schema. Index definitions match the design specification.

---

**Document Version:** 1.0  
**Last Updated:** 2024-01-20  
**Maintained By:** Kulima Development Team
