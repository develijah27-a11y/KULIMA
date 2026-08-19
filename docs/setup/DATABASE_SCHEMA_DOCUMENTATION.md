# Kulima AgriTech Platform - Database Schema Documentation

**Generated:** 2024
**Migration File:** `supabase/migrations/20240101000000_initial_schema.sql`
**Database:** PostgreSQL via Supabase
**Purpose:** Complete documentation of existing database schema for the Kulima AgriTech backend foundation

---

## Table of Contents

1. [Overview](#overview)
2. [Entity Relationship Diagram](#entity-relationship-diagram)
3. [Table Definitions](#table-definitions)
4. [Foreign Key Relationships](#foreign-key-relationships)
5. [Row Level Security (RLS) Policies](#row-level-security-rls-policies)
6. [Indexes](#indexes)
7. [Constraints](#constraints)
8. [Triggers](#triggers)
9. [Schema Verification](#schema-verification)

---

## Overview

The Kulima AgriTech database schema consists of **6 core tables** that support agricultural farm management, soil health monitoring, crop disease detection, and weather tracking. The schema is designed with:

- **Security First**: Row Level Security (RLS) enabled on all user-facing tables
- **Data Integrity**: Foreign key constraints with CASCADE delete policies
- **Performance**: Strategic indexes on foreign keys and timestamp columns
- **Audit Trail**: Automatic `created_at` and `updated_at` timestamps
- **Validation**: CHECK constraints for data quality

### Core Tables

1. **profiles** - User profile information linked to Supabase Auth
2. **farms** - Farm records owned by users
3. **crops** - Crop plantings associated with farms
4. **soil_reports** - Soil health analysis reports for farms
5. **disease_scans** - Crop disease detection scans with image analysis
6. **weather_logs** - Weather condition logs for farms

---

## Entity Relationship Diagram

```
┌─────────────────┐
│   auth.users    │ (Supabase Auth)
│   (External)    │
└────────┬────────┘
         │
         │ 1:1
         ▼
┌─────────────────┐
│    profiles     │
│  - id (PK)      │
│  - user_id (FK) │
│  - full_name    │
│  - phone_number │
│  - location     │
└────────┬────────┘
         │
         │ 1:N (via user_id)
         ▼
┌─────────────────┐
│      farms      │
│  - id (PK)      │
│  - user_id (FK) │──┐
│  - name         │  │
│  - location     │  │
│  - size_hectares│  │
│  - farm_type    │  │
└─────────────────┘  │
         │           │
         ├───────────┼─────────────┬─────────────┐
         │           │             │             │
         │ 1:N       │ 1:N         │ 1:N         │ 1:N
         ▼           ▼             ▼             ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│    crops     │ │ soil_reports │ │disease_scans │ │ weather_logs │
│ - id (PK)    │ │ - id (PK)    │ │ - id (PK)    │ │ - id (PK)    │
│ - farm_id(FK)│ │ - farm_id(FK)│ │ - farm_id(FK)│ │ - farm_id(FK)│
│ - crop_name  │ │ - ph_level   │ │ - crop_type  │ │ - temperature│
│ - variety    │ │ - nitrogen   │ │ - image_url  │ │ - humidity   │
│ - dates      │ │ - phosphorus │ │ - disease    │ │ - rainfall   │
│ - status     │ │ - potassium  │ │ - confidence │ │ - wind_speed │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

**Relationship Summary:**
- `auth.users` → `profiles` (1:1 via user_id)
- `auth.users` → `farms` (1:N via user_id)
- `farms` → `crops` (1:N via farm_id)
- `farms` → `soil_reports` (1:N via farm_id)
- `farms` → `disease_scans` (1:N via farm_id)
- `farms` → `weather_logs` (1:N via farm_id)

---

## Table Definitions

### 1. profiles

**Purpose:** Stores user profile information linked to Supabase Auth users.

**Columns:**

| Column Name    | Data Type    | Nullable | Default              | Description                          |
|----------------|--------------|----------|----------------------|--------------------------------------|
| id             | UUID         | NOT NULL | gen_random_uuid()    | Primary key                          |
| user_id        | UUID         | NOT NULL | -                    | Foreign key to auth.users(id)        |
| full_name      | TEXT         | NOT NULL | -                    | User's full name                     |
| phone_number   | TEXT         | NULL     | -                    | User's phone number (optional)       |
| location       | TEXT         | NULL     | -                    | User's location (optional)           |
| created_at     | TIMESTAMPTZ  | NOT NULL | NOW()                | Record creation timestamp            |
| updated_at     | TIMESTAMPTZ  | NOT NULL | NOW()                | Record last update timestamp         |

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `user_id` REFERENCES `auth.users(id)` ON DELETE CASCADE
- UNIQUE: `user_id` (one profile per user)

**RLS Enabled:** ✅ Yes

---

### 2. farms

**Purpose:** Stores farm information owned by users.

**Columns:**

| Column Name    | Data Type    | Nullable | Default              | Description                          |
|----------------|--------------|----------|----------------------|--------------------------------------|
| id             | UUID         | NOT NULL | gen_random_uuid()    | Primary key                          |
| user_id        | UUID         | NOT NULL | -                    | Foreign key to auth.users(id)        |
| name           | TEXT         | NOT NULL | -                    | Farm name                            |
| location       | TEXT         | NOT NULL | -                    | Farm location/address                |
| size_hectares  | DECIMAL(10,2)| NULL     | -                    | Farm size in hectares                |
| farm_type      | TEXT         | NULL     | -                    | Type of farm (e.g., crop, livestock) |
| created_at     | TIMESTAMPTZ  | NOT NULL | NOW()                | Record creation timestamp            |
| updated_at     | TIMESTAMPTZ  | NOT NULL | NOW()                | Record last update timestamp         |

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `user_id` REFERENCES `auth.users(id)` ON DELETE CASCADE
- CHECK: `valid_size` - `size_hectares IS NULL OR size_hectares > 0`

**RLS Enabled:** ✅ Yes

---

### 3. crops

**Purpose:** Stores crop planting information for farms.

**Columns:**

| Column Name           | Data Type    | Nullable | Default              | Description                          |
|-----------------------|--------------|----------|----------------------|--------------------------------------|
| id                    | UUID         | NOT NULL | gen_random_uuid()    | Primary key                          |
| farm_id               | UUID         | NOT NULL | -                    | Foreign key to farms(id)             |
| crop_name             | TEXT         | NOT NULL | -                    | Name of the crop                     |
| variety               | TEXT         | NULL     | -                    | Crop variety (optional)              |
| planting_date         | DATE         | NULL     | -                    | Date crop was planted                |
| expected_harvest_date | DATE         | NULL     | -                    | Expected harvest date                |
| status                | TEXT         | NOT NULL | 'planted'            | Crop status (e.g., planted, growing) |
| created_at            | TIMESTAMPTZ  | NOT NULL | NOW()                | Record creation timestamp            |
| updated_at            | TIMESTAMPTZ  | NOT NULL | NOW()                | Record last update timestamp         |

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `farm_id` REFERENCES `farms(id)` ON DELETE CASCADE
- CHECK: `valid_harvest_date` - `expected_harvest_date IS NULL OR planting_date IS NULL OR expected_harvest_date >= planting_date`

**RLS Enabled:** ✅ Yes

---

### 4. soil_reports

**Purpose:** Stores soil health analysis reports for farms.

**Columns:**

| Column Name      | Data Type    | Nullable | Default              | Description                          |
|------------------|--------------|----------|----------------------|--------------------------------------|
| id               | UUID         | NOT NULL | gen_random_uuid()    | Primary key                          |
| farm_id          | UUID         | NOT NULL | -                    | Foreign key to farms(id)             |
| ph_level         | DECIMAL(3,1) | NOT NULL | -                    | Soil pH level (0-14)                 |
| nitrogen         | DECIMAL(5,2) | NOT NULL | -                    | Nitrogen content (N)                 |
| phosphorus       | DECIMAL(5,2) | NOT NULL | -                    | Phosphorus content (P)               |
| potassium        | DECIMAL(5,2) | NOT NULL | -                    | Potassium content (K)                |
| organic_matter   | DECIMAL(5,2) | NULL     | -                    | Organic matter percentage (optional) |
| recommendations  | TEXT         | NULL     | -                    | Soil improvement recommendations     |
| created_at       | TIMESTAMPTZ  | NOT NULL | NOW()                | Record creation timestamp            |

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `farm_id` REFERENCES `farms(id)` ON DELETE CASCADE
- CHECK: `valid_ph` - `ph_level >= 0 AND ph_level <= 14`
- CHECK: `valid_nitrogen` - `nitrogen >= 0`
- CHECK: `valid_phosphorus` - `phosphorus >= 0`
- CHECK: `valid_potassium` - `potassium >= 0`

**RLS Enabled:** ✅ Yes

**Note:** No `updated_at` column - soil reports are immutable once created.

---

### 5. disease_scans

**Purpose:** Stores crop disease detection scans with image analysis results.

**Columns:**

| Column Name              | Data Type    | Nullable | Default              | Description                          |
|--------------------------|--------------|----------|----------------------|--------------------------------------|
| id                       | UUID         | NOT NULL | gen_random_uuid()    | Primary key                          |
| farm_id                  | UUID         | NOT NULL | -                    | Foreign key to farms(id)             |
| crop_type                | TEXT         | NOT NULL | -                    | Type of crop scanned                 |
| image_url                | TEXT         | NOT NULL | -                    | URL to uploaded crop image           |
| disease_detected         | TEXT         | NULL     | -                    | Detected disease name (if any)       |
| confidence_score         | DECIMAL(5,2) | NULL     | -                    | Detection confidence (0-100%)        |
| treatment_recommendations| TEXT         | NULL     | -                    | Treatment recommendations            |
| created_at               | TIMESTAMPTZ  | NOT NULL | NOW()                | Record creation timestamp            |

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `farm_id` REFERENCES `farms(id)` ON DELETE CASCADE
- CHECK: `valid_confidence` - `confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100)`

**RLS Enabled:** ✅ Yes

**Note:** No `updated_at` column - disease scans are immutable once created.

---

### 6. weather_logs

**Purpose:** Stores weather condition logs for farms.

**Columns:**

| Column Name    | Data Type    | Nullable | Default              | Description                          |
|----------------|--------------|----------|----------------------|--------------------------------------|
| id             | UUID         | NOT NULL | gen_random_uuid()    | Primary key                          |
| farm_id        | UUID         | NOT NULL | -                    | Foreign key to farms(id)             |
| temperature    | DECIMAL(5,2) | NOT NULL | -                    | Temperature in Celsius               |
| humidity       | DECIMAL(5,2) | NOT NULL | -                    | Humidity percentage (0-100%)         |
| rainfall       | DECIMAL(6,2) | NOT NULL | 0                    | Rainfall in millimeters              |
| wind_speed     | DECIMAL(5,2) | NULL     | -                    | Wind speed (optional)                |
| conditions     | TEXT         | NULL     | -                    | Weather conditions description       |
| recorded_at    | TIMESTAMPTZ  | NOT NULL | -                    | When weather was recorded            |
| created_at     | TIMESTAMPTZ  | NOT NULL | NOW()                | Record creation timestamp            |

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `farm_id` REFERENCES `farms(id)` ON DELETE CASCADE
- CHECK: `valid_humidity` - `humidity >= 0 AND humidity <= 100`
- CHECK: `valid_rainfall` - `rainfall >= 0`

**RLS Enabled:** ✅ Yes

**Note:** No `updated_at` column - weather logs are immutable once created.

---

## Foreign Key Relationships

### Summary Table

| Child Table    | Column   | Parent Table | Parent Column | On Delete Policy | Description                          |
|----------------|----------|--------------|---------------|------------------|--------------------------------------|
| profiles       | user_id  | auth.users   | id            | CASCADE          | User profile linked to auth user     |
| farms          | user_id  | auth.users   | id            | CASCADE          | Farm owned by user                   |
| crops          | farm_id  | farms        | id            | CASCADE          | Crop belongs to farm                 |
| soil_reports   | farm_id  | farms        | id            | CASCADE          | Soil report for farm                 |
| disease_scans  | farm_id  | farms        | id            | CASCADE          | Disease scan for farm                |
| weather_logs   | farm_id  | farms        | id            | CASCADE          | Weather log for farm                 |

### Cascade Behavior

**ON DELETE CASCADE** is used for all foreign keys, meaning:

1. **When a user is deleted from `auth.users`:**
   - Their `profiles` record is deleted
   - All their `farms` records are deleted
   - All related `crops`, `soil_reports`, `disease_scans`, and `weather_logs` are deleted (cascading from farms)

2. **When a farm is deleted from `farms`:**
   - All associated `crops` are deleted
   - All associated `soil_reports` are deleted
   - All associated `disease_scans` are deleted
   - All associated `weather_logs` are deleted

**Rationale:** This ensures data consistency and prevents orphaned records. When a user or farm is removed, all dependent data is automatically cleaned up.

---

## Row Level Security (RLS) Policies

All user-facing tables have RLS enabled to ensure users can only access their own data.

### profiles Table

| Policy Name                  | Operation | Policy Logic                                    |
|------------------------------|-----------|------------------------------------------------|
| Users can view own profile   | SELECT    | `auth.uid() = user_id`                         |
| Users can update own profile | UPDATE    | `auth.uid() = user_id`                         |
| Users can insert own profile | INSERT    | `auth.uid() = user_id`                         |

**Security:** Users can only view, update, and create their own profile.

---

### farms Table

| Policy Name                | Operation | Policy Logic                                    |
|----------------------------|-----------|------------------------------------------------|
| Users can view own farms   | SELECT    | `auth.uid() = user_id`                         |
| Users can insert own farms | INSERT    | `auth.uid() = user_id`                         |
| Users can update own farms | UPDATE    | `auth.uid() = user_id`                         |
| Users can delete own farms | DELETE    | `auth.uid() = user_id`                         |

**Security:** Users can only manage (CRUD) their own farms.

---

### crops Table

| Policy Name                        | Operation | Policy Logic                                                                                      |
|------------------------------------|-----------|--------------------------------------------------------------------------------------------------|
| Users can view crops from own farms| SELECT    | `EXISTS (SELECT 1 FROM farms WHERE farms.id = crops.farm_id AND farms.user_id = auth.uid())`    |
| Users can insert crops to own farms| INSERT    | `EXISTS (SELECT 1 FROM farms WHERE farms.id = crops.farm_id AND farms.user_id = auth.uid())`    |
| Users can update crops in own farms| UPDATE    | `EXISTS (SELECT 1 FROM farms WHERE farms.id = crops.farm_id AND farms.user_id = auth.uid())`    |
| Users can delete crops from own farms| DELETE  | `EXISTS (SELECT 1 FROM farms WHERE farms.id = crops.farm_id AND farms.user_id = auth.uid())`    |

**Security:** Users can only manage crops that belong to their own farms. Ownership is verified through the farms table.

---

### soil_reports Table

| Policy Name                                | Operation | Policy Logic                                                                                              |
|--------------------------------------------|-----------|----------------------------------------------------------------------------------------------------------|
| Users can view soil reports from own farms | SELECT    | `EXISTS (SELECT 1 FROM farms WHERE farms.id = soil_reports.farm_id AND farms.user_id = auth.uid())`     |
| Users can insert soil reports to own farms | INSERT    | `EXISTS (SELECT 1 FROM farms WHERE farms.id = soil_reports.farm_id AND farms.user_id = auth.uid())`     |

**Security:** Users can only view and create soil reports for their own farms. No UPDATE or DELETE policies (reports are immutable).

---

### disease_scans Table

| Policy Name                                | Operation | Policy Logic                                                                                              |
|--------------------------------------------|-----------|----------------------------------------------------------------------------------------------------------|
| Users can view disease scans from own farms| SELECT    | `EXISTS (SELECT 1 FROM farms WHERE farms.id = disease_scans.farm_id AND farms.user_id = auth.uid())`    |
| Users can insert disease scans to own farms| INSERT    | `EXISTS (SELECT 1 FROM farms WHERE farms.id = disease_scans.farm_id AND farms.user_id = auth.uid())`    |

**Security:** Users can only view and create disease scans for their own farms. No UPDATE or DELETE policies (scans are immutable).

---

### weather_logs Table

| Policy Name                                | Operation | Policy Logic                                                                                              |
|--------------------------------------------|-----------|----------------------------------------------------------------------------------------------------------|
| Users can view weather logs from own farms | SELECT    | `EXISTS (SELECT 1 FROM farms WHERE farms.id = weather_logs.farm_id AND farms.user_id = auth.uid())`     |
| Users can insert weather logs to own farms | INSERT    | `EXISTS (SELECT 1 FROM farms WHERE farms.id = weather_logs.farm_id AND farms.user_id = auth.uid())`     |

**Security:** Users can only view and create weather logs for their own farms. No UPDATE or DELETE policies (logs are immutable).

---

## Indexes

Indexes are created to optimize query performance, particularly for foreign key lookups and time-based queries.

### Index Summary

| Table          | Index Name                      | Columns                | Type      | Purpose                                      |
|----------------|---------------------------------|------------------------|-----------|----------------------------------------------|
| profiles       | idx_profiles_user_id            | user_id                | B-tree    | Fast lookup by user_id                       |
| farms          | idx_farms_user_id               | user_id                | B-tree    | Fast lookup of user's farms                  |
| farms          | idx_farms_created_at            | created_at DESC        | B-tree    | Fast sorting by creation date                |
| crops          | idx_crops_farm_id               | farm_id                | B-tree    | Fast lookup of farm's crops                  |
| crops          | idx_crops_planting_date         | planting_date DESC     | B-tree    | Fast sorting by planting date                |
| soil_reports   | idx_soil_reports_farm_id        | farm_id                | B-tree    | Fast lookup of farm's soil reports           |
| soil_reports   | idx_soil_reports_created_at     | created_at DESC        | B-tree    | Fast sorting by creation date                |
| disease_scans  | idx_disease_scans_farm_id       | farm_id                | B-tree    | Fast lookup of farm's disease scans          |
| disease_scans  | idx_disease_scans_created_at    | created_at DESC        | B-tree    | Fast sorting by creation date                |
| weather_logs   | idx_weather_logs_farm_id        | farm_id                | B-tree    | Fast lookup of farm's weather logs           |
| weather_logs   | idx_weather_logs_recorded_at    | recorded_at DESC       | B-tree    | Fast sorting by recorded time                |
| weather_logs   | idx_weather_logs_created_at     | created_at DESC        | B-tree    | Fast sorting by creation date                |

**Total Indexes:** 12 (excluding primary key indexes)

### Performance Benefits

1. **Foreign Key Indexes:** All foreign key columns (`user_id`, `farm_id`) have indexes for fast JOIN operations
2. **Timestamp Indexes:** Descending indexes on date/time columns enable efficient sorting and pagination
3. **RLS Performance:** Indexes on `user_id` and `farm_id` improve RLS policy evaluation speed

---

## Constraints

### CHECK Constraints

| Table          | Constraint Name       | Logic                                                                                      | Purpose                                      |
|----------------|-----------------------|--------------------------------------------------------------------------------------------|----------------------------------------------|
| farms          | valid_size            | `size_hectares IS NULL OR size_hectares > 0`                                               | Ensure farm size is positive if provided     |
| crops          | valid_harvest_date    | `expected_harvest_date IS NULL OR planting_date IS NULL OR expected_harvest_date >= planting_date` | Harvest date must be after planting date     |
| soil_reports   | valid_ph              | `ph_level >= 0 AND ph_level <= 14`                                                        | pH must be in valid range (0-14)             |
| soil_reports   | valid_nitrogen        | `nitrogen >= 0`                                                                            | Nitrogen content must be non-negative        |
| soil_reports   | valid_phosphorus      | `phosphorus >= 0`                                                                          | Phosphorus content must be non-negative      |
| soil_reports   | valid_potassium       | `potassium >= 0`                                                                           | Potassium content must be non-negative       |
| disease_scans  | valid_confidence      | `confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100)`          | Confidence score must be 0-100% if provided  |
| weather_logs   | valid_humidity        | `humidity >= 0 AND humidity <= 100`                                                        | Humidity must be 0-100%                      |
| weather_logs   | valid_rainfall        | `rainfall >= 0`                                                                            | Rainfall must be non-negative                |

**Total CHECK Constraints:** 9

### UNIQUE Constraints

| Table          | Constraint            | Columns    | Purpose                                      |
|----------------|-----------------------|------------|----------------------------------------------|
| profiles       | UNIQUE(user_id)       | user_id    | One profile per user                         |

---

## Triggers

### update_updated_at_column() Function

**Purpose:** Automatically update the `updated_at` timestamp when a record is modified.

**Function Definition:**
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Trigger Assignments

| Table     | Trigger Name                  | Event         | Function                      |
|-----------|-------------------------------|---------------|-------------------------------|
| profiles  | update_profiles_updated_at    | BEFORE UPDATE | update_updated_at_column()    |
| farms     | update_farms_updated_at       | BEFORE UPDATE | update_updated_at_column()    |
| crops     | update_crops_updated_at       | BEFORE UPDATE | update_updated_at_column()    |

**Note:** `soil_reports`, `disease_scans`, and `weather_logs` do NOT have `updated_at` triggers because these records are immutable once created.

---

## Schema Verification

### Verification Checklist

✅ **All Required Tables Exist:**
- [x] profiles
- [x] farms
- [x] crops
- [x] soil_reports
- [x] disease_scans
- [x] weather_logs

✅ **Foreign Key Relationships:**
- [x] profiles.user_id → auth.users.id (CASCADE)
- [x] farms.user_id → auth.users.id (CASCADE)
- [x] crops.farm_id → farms.id (CASCADE)
- [x] soil_reports.farm_id → farms.id (CASCADE)
- [x] disease_scans.farm_id → farms.id (CASCADE)
- [x] weather_logs.farm_id → farms.id (CASCADE)

✅ **RLS Policies:**
- [x] All 6 tables have RLS enabled
- [x] profiles: 3 policies (SELECT, UPDATE, INSERT)
- [x] farms: 4 policies (SELECT, INSERT, UPDATE, DELETE)
- [x] crops: 4 policies (SELECT, INSERT, UPDATE, DELETE)
- [x] soil_reports: 2 policies (SELECT, INSERT)
- [x] disease_scans: 2 policies (SELECT, INSERT)
- [x] weather_logs: 2 policies (SELECT, INSERT)

✅ **Indexes:**
- [x] 12 indexes created for performance optimization
- [x] All foreign keys have indexes
- [x] Timestamp columns have descending indexes

✅ **Constraints:**
- [x] 9 CHECK constraints for data validation
- [x] 1 UNIQUE constraint (profiles.user_id)
- [x] All NOT NULL constraints properly defined

✅ **Triggers:**
- [x] update_updated_at_column() function created
- [x] 3 triggers assigned (profiles, farms, crops)

### Design Document Alignment

This schema matches the design document specifications in:
- `c:\Users\PwezaCore\Desktop\KULIMA\.kiro\specs\kulima-backend-foundation\design.md`

**Verified Requirements:**
- R1.1: Database schema inspection ✅
- R1.3: Foreign key relationships documented ✅
- R1.5: All 6 tables documented ✅
- R3.1-R3.5: Foreign key relationships defined ✅
- R3.7: ON DELETE CASCADE policies ✅
- R3.8: Timestamp columns on all tables ✅
- R4.1-R4.4: RLS enabled with policies ✅
- R5.1-R5.6: Indexes on foreign keys and timestamps ✅

---

## Summary

The Kulima AgriTech database schema is **production-ready** with:

- **6 core tables** supporting farm management, soil health, disease detection, and weather tracking
- **6 foreign key relationships** with CASCADE delete for data consistency
- **17 RLS policies** ensuring users can only access their own data
- **12 performance indexes** optimizing queries on foreign keys and timestamps
- **9 CHECK constraints** validating data quality at the database level
- **3 automatic triggers** maintaining audit timestamps

**Security:** All user-facing tables have RLS enabled with comprehensive policies.

**Performance:** Strategic indexes on all foreign keys and timestamp columns.

**Data Integrity:** Foreign key constraints with CASCADE delete and CHECK constraints for validation.

**Audit Trail:** Automatic `created_at` and `updated_at` timestamps on mutable tables.

---

**Document Status:** ✅ Complete
**Last Updated:** 2024
**Maintained By:** Kulima AgriTech Development Team
