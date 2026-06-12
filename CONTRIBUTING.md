# Contributing to Kulima AgriTech Platform

Thank you for your interest in contributing! This document provides guidelines and standards for development.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Coding Standards](#coding-standards)
- [Git Workflow](#git-workflow)
- [Testing Requirements](#testing-requirements)
- [Database Migrations](#database-migrations)
- [Pull Request Process](#pull-request-process)

## 🤝 Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Collaborate openly and transparently
- Prioritize user needs and data safety

## 🚀 Getting Started

### Development Setup

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables in `.env.local`
4. Start Supabase locally: `supabase start`
5. Run migrations: `supabase db push`
6. Generate types: `npm run generate:types`
7. Start dev server: `npm run dev`

### Project Structure

Familiarize yourself with the folder structure:
- `/src/app/api` - API route handlers
- `/src/features` - Feature modules (services, validation, hooks)
- `/src/lib` - Shared libraries
- `/src/utils` - Utility functions
- `/supabase/migrations` - Database migrations

## 📏 Coding Standards

### TypeScript

- **Strict mode enabled** - all TypeScript strict checks must pass
- **Type everything** - avoid `any`, use proper types
- **Generate types from schema** - run `npm run generate:types` after schema changes
- **Use type imports** - `import type { ... }` for type-only imports

### File Size Limits

- **Maximum 300 lines per file** - break larger files into modules
- Extract shared logic into utility functions
- Split large services into multiple focused services

### Naming Conventions

#### Files

```
snake_case.ts         → database tables, migrations
kebab-case.ts         → components, pages
PascalCase.tsx        → React components
camelCase.ts          → utilities, services, hooks
```

#### Variables & Functions

```typescript
const userId = '123';              // camelCase for variables
function getUserProfile() {}       // camelCase for functions
interface User {}                  // PascalCase for types/interfaces
const API_TIMEOUT = 5000;          // UPPER_SNAKE_CASE for constants
```

### Code Organization

#### Services

```typescript
// features/farms/services/farm.service.ts

// 1. Imports
import { createClient } from '@/lib/supabase/server';

// 2. Types
export interface CreateFarmParams { ... }

// 3. Functions (documented with JSDoc)
/**
 * Create a new farm
 * @param params - Farm creation parameters
 * @returns Created farm
 * @throws {AuthorizationError} If user doesn't have permission
 */
export async function createFarm(params: CreateFarmParams): Promise<Farm> {
  // Implementation
}
```

#### API Routes

```typescript
// app/api/farms/route.ts

// 1. Imports
import { NextRequest, NextResponse } from 'next/server';

// 2. Handler with error handling
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user) throw new AuthenticationError();
    
    // 2. Validate
    const body = await request.json();
    const validation = schema.safeParse(body);
    if (!validation.success) { /* return errors */ }
    
    // 3. Process
    const result = await service.create(validation.data);
    
    // 4. Respond
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    const { response, statusCode } = handleError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}
```

### Error Handling

- **Use custom error classes** - `NotFoundError`, `AuthenticationError`, etc.
- **Never expose sensitive details** - use centralized error handler
- **Log errors with context** - include user ID, endpoint, timestamp
- **Return consistent error format** - use `ApiErrorResponse` type

### Validation

- **Validate at API boundary** - use Zod schemas for all request bodies
- **Define schemas in feature modules** - `/features/[name]/validation/`
- **Export TypeScript types** - `export type Input = z.infer<typeof schema>`
- **Provide descriptive error messages** - help users fix issues

## 🔀 Git Workflow

### Branch Naming

```
feature/farm-crud       → New feature
fix/auth-session-bug    → Bug fix
refactor/error-handling → Code refactoring
docs/api-documentation  → Documentation
test/farm-service       → Tests only
chore/update-deps       → Maintenance
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(farms): add farm update endpoint
fix(auth): resolve session expiry issue
docs(readme): update setup instructions
refactor(error): centralize error handling
test(soil): add soil report service tests
chore(deps): upgrade Next.js to 14.2.0
```

**Format:**
```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `refactor` - Code change that neither fixes a bug nor adds a feature
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

### Workflow Steps

1. **Create branch** from `main`:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/your-feature
   ```

2. **Make changes** following coding standards

3. **Commit regularly** with descriptive messages:
   ```bash
   git add .
   git commit -m "feat(farms): add farm list endpoint"
   ```

4. **Keep branch updated**:
   ```bash
   git fetch origin
   git rebase origin/main
   ```

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature
   ```

6. **Create Pull Request** with clear description

## 🧪 Testing Requirements

### Unit Tests

Required for:
- ✅ All service methods
- ✅ Validation schemas
- ✅ Utility functions

```typescript
// features/farms/__tests__/farm.service.test.ts

describe('createFarm', () => {
  it('should create farm with valid data', async () => {
    const result = await createFarm(validParams);
    expect(result).toHaveProperty('id');
  });

  it('should validate farm ownership', async () => {
    await expect(createFarm(invalidParams)).rejects.toThrow(AuthorizationError);
  });
});
```

### Integration Tests

Required for:
- ✅ API endpoints (optional but recommended)
- ✅ Complete user flows (optional but recommended)

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test farm.service.test.ts

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

### Test Standards

- **Test behavior, not implementation** - focus on what, not how
- **Use descriptive test names** - clear expectations
- **Arrange-Act-Assert pattern** - organize test logic
- **Mock external dependencies** - isolate units
- **Clean up after tests** - reset state

## 🗄️ Database Migrations

### Creating Migrations

```bash
# Create new migration
supabase migration new description_of_change

# This creates: supabase/migrations/[timestamp]_description_of_change.sql
```

### Migration Guidelines

1. **One logical change per migration** - don't bundle unrelated changes

2. **Always include rollback plan** in comments:
   ```sql
   -- Migration: Add email_verified column to profiles
   -- Rollback: ALTER TABLE profiles DROP COLUMN email_verified;
   
   ALTER TABLE profiles 
   ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
   ```

3. **Use IF EXISTS / IF NOT EXISTS** for safety:
   ```sql
   ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN;
   ```

4. **Test migrations locally first**:
   ```bash
   supabase db reset  # Reset local database
   supabase db push   # Apply all migrations
   ```

5. **Document breaking changes** in migration file header

6. **Use CREATE INDEX CONCURRENTLY** for production:
   ```sql
   CREATE INDEX CONCURRENTLY idx_farms_user_id ON farms(user_id);
   ```

### RLS Policies

When adding/modifying RLS policies:

```sql
-- Create policy
CREATE POLICY "Users can view own farms"
ON farms FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Drop policy (for rollback)
-- DROP POLICY IF EXISTS "Users can view own farms" ON farms;
```

### Migration Checklist

- [ ] Migration file created with timestamp
- [ ] Rollback plan documented in comments
- [ ] Tested locally with `supabase db reset && supabase db push`
- [ ] Generated new types: `npm run generate:types`
- [ ] Updated schema documentation if needed
- [ ] No breaking changes to existing data

## 📥 Pull Request Process

### Before Submitting

1. **Run linter**: `npm run lint`
2. **Run type checker**: `npm run type-check`
3. **Run tests**: `npm test`
4. **Test locally**: Verify your changes work end-to-end
5. **Update documentation**: Add/update relevant docs

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] All tests passing

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console.log statements
- [ ] Migrations tested (if applicable)
```

### Review Process

1. **Automated checks** must pass:
   - TypeScript compilation
   - Linting
   - Tests

2. **Code review** by at least one maintainer

3. **Address feedback** promptly and professionally

4. **Squash commits** before merge (if requested)

### Merging

- **Squash and merge** for feature branches
- **Regular merge** for release branches
- **Delete branch** after merge

## 🔒 Security Guidelines

- **Never commit secrets** - use environment variables
- **Sanitize user input** - validate and escape
- **Use parameterized queries** - Supabase client handles this
- **Log sensitive operations** - but redact sensitive data
- **Follow principle of least privilege** - minimal permissions

## 📞 Getting Help

- **Questions**: Open a discussion
- **Bugs**: Create an issue with reproduction steps
- **Security**: Email security@kulima.com (do not open public issue)

## 📜 License

By contributing, you agree that your contributions will be licensed under the project's license.

---

Thank you for contributing to Kulima! 🌾
