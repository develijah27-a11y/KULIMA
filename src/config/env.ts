import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  // Accept both naming conventions — Supabase dashboard uses ANON_KEY
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key is required'),
  DATABASE_URL: z.string().url('Invalid DATABASE_URL').optional(),
  DIRECT_URL: z.string().url('Invalid DIRECT_URL').optional(),
  OPENWEATHER_API_KEY: z.string().optional(),
  GOOGLE_CLOUD_API_KEY: z.string().optional(),
  AFRICASTALKING_USERNAME: z.string().optional(),
  AFRICASTALKING_API_KEY: z.string().optional(),
  FLUTTERWAVE_SECRET_KEY: z.string().optional(),
  FLUTTERWAVE_WEBHOOK_SECRET: z.string().optional(),
  NEXTAUTH_SECRET: z.string().min(1, 'NEXTAUTH_SECRET is required'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  try {
    const parsed = envSchema.parse(process.env);
    // Require at least one Supabase key variant
    if (!parsed.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && !parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error(
        'Missing Supabase anon key. Set NEXT_PUBLIC_SUPABASE_ANON_KEY (from Supabase dashboard → ' +
        'Project Settings → API) in your .env.local file.'
      );
    }
    return parsed;
  } catch (error) {
    console.error('Invalid environment variables:');
    if (error instanceof z.ZodError) {
      error.issues.forEach((err) => {
        console.error(`  ${err.path.join('.')}: ${err.message}`);
      });
    } else if (error instanceof Error) {
      console.error(' ', error.message);
    }
    throw new Error('Environment validation failed. Check .env.local — see .env.example for required keys.');
  }
}

export const env = validateEnv();
