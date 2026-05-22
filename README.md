# Kulima - Smart Farm Management Platform

African AgriTech platform for farm management, soil health monitoring, disease detection, and weather tracking.

## 🌾 Features

- **Farm Management**: Create and manage multiple farms
- **Soil Health Monitoring**: Track soil nutrients and pH levels
- **Disease Detection**: Upload crop images for disease identification
- **Weather Tracking**: Log and analyze weather conditions
- **Secure Authentication**: User authentication with Supabase Auth
- **Row Level Security**: Data isolation at the database level

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, TypeScript
- **Database**: PostgreSQL via Supabase
- **Authentication**: Supabase Auth
- **Validation**: Zod

## 📋 Prerequisites

- Node.js 18+ installed
- npm or yarn
- Supabase account and project

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase project details:

**Required Variables:**
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL (client-safe)
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Your Supabase anon/public key (client-safe)
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (server-only, keep secret!)

**Optional Variables:**
- `DATABASE_URL`: Direct PostgreSQL connection string (for advanced use cases)
- `NODE_ENV`: Application environment (development, production, test)
- `LOG_LEVEL`: Logging level (debug, info, warn, error)

**Environment Validation:**

The application automatically validates all environment variables at startup using Zod schemas. If any required variables are missing or invalid, you'll see a descriptive error message indicating which variables need to be fixed.

Example error:
```
❌ Invalid environment variables:
  NEXT_PUBLIC_SUPABASE_URL: Invalid Supabase URL
  SUPABASE_SERVICE_ROLE_KEY: Supabase service role key is required
```

**Security Notes:**
- Variables prefixed with `NEXT_PUBLIC_` are safe for client-side use
- Server-only variables (without prefix) are NEVER exposed to the browser
- The service role key bypasses Row Level Security - use only in server-side code
- Never commit `.env.local` to version control

### 3. Apply Database Migrations

**IMPORTANT**: You need to apply the database schema to your Supabase project.

#### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/hjvnkintvjogwljchwcq
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/20240101000000_initial_schema.sql`
4. Paste into the SQL Editor and click **Run**
5. Verify all tables were created successfully

#### Option B: Using Supabase CLI

```bash
# Link to your project (you'll need your database password)
npx supabase link --project-ref hjvnkintvjogwljchwcq

# Push migrations
npx supabase db push
```

### 4. Generate Database Types

After applying migrations, generate TypeScript types from your database schema:

```bash
npx supabase gen types typescript --project-id hjvnkintvjogwljchwcq > src/lib/database.types.ts
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
kulima/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/               # API routes
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Home page
│   ├── features/              # Feature modules (to be created)
│   │   ├── auth/             # Authentication feature
│   │   ├── farms/            # Farm management
│   │   ├── soil/             # Soil reports
│   │   ├── disease-detection/# Disease scanning
│   │   └── weather/          # Weather logging
│   ├── lib/                   # Third-party library configs
│   │   ├── supabase/         # Supabase clients
│   │   └── database.types.ts # Generated DB types
│   ├── types/                 # Shared TypeScript types
│   ├── utils/                 # Utility functions
│   ├── config/                # Configuration
│   │   └── env.ts            # Environment validation
│   └── server/                # Server-only code
├── supabase/
│   ├── migrations/            # Database migrations
│   └── config.toml           # Supabase configuration
├── .env.local                 # Local environment variables (not committed)
├── .env.example              # Environment template
└── README.md                 # This file
```

## 🗄️ Database Schema

The platform uses the following tables:

- **profiles**: User profile information
- **farms**: Farm records owned by users
- **crops**: Crops planted on farms
- **soil_reports**: Soil health analysis reports
- **disease_scans**: Disease detection scans with images
- **weather_logs**: Weather condition logs

All tables have Row Level Security (RLS) enabled to ensure users can only access their own data.

## 🔐 Security

- **Row Level Security (RLS)**: Enabled on all user tables
- **Environment Variables**: Sensitive keys stored in `.env.local` (never committed)
- **Server-Only Keys**: Service role key only used in server-side code
- **Input Validation**: Zod schemas validate all API inputs

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## 🧪 Testing

Testing infrastructure will be added in future phases.

## 📚 Documentation

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

## 🤝 Contributing

Contributions are welcome! Please read CONTRIBUTING.md for guidelines.

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Troubleshooting

### Database Connection Issues

If you can't connect to the database:
1. Verify your Supabase URL and keys in `.env.local`
2. Check that your Supabase project is active
3. Ensure migrations have been applied

### Type Errors

If you see TypeScript errors related to database types:
1. Make sure migrations are applied
2. Regenerate types: `npx supabase gen types typescript --project-id hjvnkintvjogwljchwcq > src/lib/database.types.ts`

### Environment Variable Errors

If you see environment validation errors:
1. Check that all required variables are in `.env.local`
2. Restart the development server after changing environment variables

## 📞 Support

For issues and questions, please open an issue on GitHub.

---

Built with ❤️ for African farmers
