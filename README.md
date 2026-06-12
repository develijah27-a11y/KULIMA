# Kulima AgriTech Platform - Backend Foundation

A production-ready, scalable backend foundation for the Kulima AgriTech platform built with Next.js 14+, TypeScript, and Supabase.

## 🏗️ Architecture Overview

The platform follows a **layered architecture** with clear separation of concerns:

```
├── Presentation Layer    → Next.js App Router, React Components
├── API Layer            → REST API endpoints with validation
├── Business Logic Layer → Service modules by feature
├── Data Access Layer    → Supabase client wrappers
└── Database Layer       → PostgreSQL with RLS policies
```

### Design Principles

- **Database Safety First**: All schema changes through versioned migrations
- **Type-Driven Development**: Types generated from schema, validated with Zod
- **Service Layer Abstraction**: No direct database queries from components
- **Feature-Based Organization**: Code grouped by domain (auth, farms, soil, disease, weather)
- **Security in Depth**: RLS at database + auth middleware + input validation

## 📁 Folder Structure

```
kulima/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API route handlers
│   │   │   ├── auth/          # Authentication endpoints
│   │   │   ├── farms/         # Farm management endpoints
│   │   │   ├── soil-reports/  # Soil analysis endpoints
│   │   │   ├── disease-scans/ # Disease detection endpoints
│   │   │   └── weather-logs/  # Weather tracking endpoints
│   │   └── (pages)/           # UI pages
│   ├── features/              # Feature modules
│   │   ├── auth/              # Authentication
│   │   │   ├── services/      # Business logic
│   │   │   ├── validation/    # Zod schemas
│   │   │   └── hooks/         # React hooks
│   │   ├── farms/             # Farm management
│   │   ├── soil/              # Soil reports
│   │   ├── disease-detection/ # Disease scanning
│   │   └── weather/           # Weather logging
│   ├── lib/                   # Shared libraries
│   │   ├── supabase/          # Supabase clients
│   │   └── database.types.ts  # Generated DB types
│   ├── types/                 # TypeScript types
│   │   ├── api.ts             # API contract types
│   │   └── domain.ts          # Domain types
│   ├── utils/                 # Utility functions
│   │   ├── error-handler.ts   # Centralized error handling
│   │   ├── logger.ts          # Structured logging
│   │   ├── pagination.ts      # Pagination helpers
│   │   └── validators.ts      # Common validators
│   └── config/                # Configuration
│       └── env.ts             # Environment validation
├── supabase/                  # Database
│   ├── migrations/            # SQL migrations (17 files)
│   ├── config.toml            # Supabase config
│   └── SCHEMA.md              # Schema documentation
└── package.json
```

## 🗄️ Database Schema

### Tables

| Table | Description | RLS Enabled |
|-------|-------------|-------------|
| `profiles` | User profiles | ✓ |
| `farms` | Farm records | ✓ |
| `crops` | Crop tracking | ✓ |
| `soil_reports` | Soil analysis data | ✓ |
| `disease_scans` | Disease detection scans | ✓ |
| `weather_logs` | Weather observations | ✓ |

### Relationships

```
profiles (user_id) ← farms (user_id)
farms (id) ← crops (farm_id)
farms (id) ← soil_reports (farm_id)
farms (id) ← disease_scans (farm_id)
farms (id) ← weather_logs (farm_id)
```

All foreign keys use **CASCADE DELETE** to maintain referential integrity.

### Performance Indexes

- 12 indexes on frequently queried columns
- Composite indexes for efficient filtering
- Indexes on foreign keys and timestamp fields

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL (via Supabase)
- Supabase CLI

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd kulima

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

### Environment Variables

Required variables in `.env.local`:

```env
# Supabase - Client-safe (public)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Supabase - Server-only (secret)
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
DATABASE_URL=your_database_connection_string
```

### Database Setup

```bash
# Start Supabase locally
supabase start

# Run migrations
supabase db push

# Generate TypeScript types
npm run generate:types
```

### Development

```bash
# Start development server
npm run dev

# Server runs on http://localhost:3000
```

### Build & Production

```bash
# Build for production
npm run build

# Start production server
npm start

# Run type checking
npm run type-check

# Run linter
npm run lint
```

## 📡 API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create new user account |
| POST | `/api/auth/login` | Authenticate user |
| POST | `/api/auth/logout` | End user session |

### Farm Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/farms` | List user's farms (paginated) |
| POST | `/api/farms` | Create new farm |
| GET | `/api/farms/[id]` | Get farm details |
| PUT | `/api/farms/[id]` | Update farm |
| DELETE | `/api/farms/[id]` | Delete farm |

### Soil Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/soil-reports?farmId=xxx` | List soil reports for farm |
| POST | `/api/soil-reports` | Create soil report |
| GET | `/api/soil-reports/[id]` | Get soil report details |

### Disease Scans

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/disease-scans?farmId=xxx` | List disease scans for farm |
| POST | `/api/disease-scans` | Create disease scan |
| GET | `/api/disease-scans/[id]` | Get scan details |

### Weather Logs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/weather-logs?farmId=xxx` | List weather logs (with date range) |
| POST | `/api/weather-logs` | Create weather log |
| GET | `/api/weather-logs/[id]` | Get weather log details |

### API Response Format

All endpoints return consistent JSON responses:

**Success Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "message": "Error message",
    "code": "ERROR_CODE",
    "fields": { "fieldName": ["error1", "error2"] }
  }
}
```

### Pagination

List endpoints support pagination:

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20, max: 100)
- `sortBy` (varies by endpoint)
- `order` (asc|desc)

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

## 🔐 Authentication & Security

### Row Level Security (RLS)

All tables enforce RLS policies:
- Users can only access their own data
- Admin roles can view all data
- Policies evaluated at database level

### Authentication Flow

1. User signs up → auth.users + profiles table created
2. User logs in → session token issued
3. Middleware validates session on protected routes
4. Service layer validates ownership on data access

### API Security

- All API routes validate authentication
- Request bodies validated with Zod schemas
- Sensitive data sanitized from logs
- SQL injection prevented by Supabase client

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- auth.schema.test.ts

# Check test coverage
npm test -- --coverage
```

## 📦 NPM Scripts

| Script | Description |
|--------|-------------|
| `dev` | Start development server |
| `build` | Build for production |
| `start` | Start production server |
| `lint` | Run ESLint |
| `type-check` | Run TypeScript compiler |
| `generate:types` | Generate types from Supabase schema |
| `test` | Run Jest tests |

## 🛠️ Tech Stack

- **Framework**: Next.js 16.2.6 (App Router)
- **Language**: TypeScript 6.0.3 (strict mode)
- **Database**: PostgreSQL (via Supabase)
- **Auth**: Supabase Auth
- **Validation**: Zod 4.4.3
- **Styling**: Tailwind CSS 4.3.0
- **Testing**: Jest + ts-jest

## 📚 Additional Documentation

- [CONTRIBUTING.md](./CONTRIBUTING.md) - Development guidelines
- [supabase/MIGRATIONS.md](./supabase/MIGRATIONS.md) - Migration guide
- [supabase/SCHEMA.md](./supabase/SCHEMA.md) - Database schema details

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines, coding standards, and git workflow.

## 📄 License

[Your License Here]

## 👥 Team

Kulima AgriTech Development Team

---

**Built with ❤️ for African farmers**
