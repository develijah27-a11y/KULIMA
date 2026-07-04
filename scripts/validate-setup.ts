#!/usr/bin/env ts-node
/**
 * Setup Validation Script
 * 
 * Validates that the development environment is correctly configured.
 * Run with: npx ts-node scripts/validate-setup.ts
 * 
 * Requirements: 25.6
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

interface ValidationResult {
  category: string;
  check: string;
  passed: boolean;
  message?: string;
}

const results: ValidationResult[] = [];

function addResult(category: string, check: string, passed: boolean, message?: string) {
  results.push({ category, check, passed, message });
}

async function validateEnvironmentVariables() {
  const category = 'Environment Variables';

  // Check required variables
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];

  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!value || value.includes('your_')) {
      addResult(category, varName, false, 'Missing or using placeholder value');
    } else {
      addResult(category, varName, true);
    }
  }
}

async function validateSupabaseConnection() {
  const category = 'Supabase Connection';

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      addResult(category, 'Connection Test', false, 'Missing credentials');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Test connection by fetching from a public table or checking health
    const { error } = await supabase.from('profiles').select('id').limit(1);

    if (error && error.message.includes('relation') && error.message.includes('does not exist')) {
      addResult(category, 'Connection Test', false, 'Database tables not created. Run migrations.');
    } else if (error) {
      addResult(category, 'Connection Test', false, `Connection error: ${error.message}`);
    } else {
      addResult(category, 'Connection Test', true);
    }
  } catch (error: any) {
    addResult(category, 'Connection Test', false, error.message);
  }
}

async function validateDatabaseTables() {
  const category = 'Database Tables';

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      addResult(category, 'Table Check', false, 'Missing credentials');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const requiredTables = ['profiles', 'farms', 'soil_reports', 'disease_scans', 'weather_logs'];

    for (const table of requiredTables) {
      const { error } = await supabase.from(table).select('id').limit(1);

      if (error && error.message.includes('does not exist')) {
        addResult(category, `Table: ${table}`, false, 'Table does not exist');
      } else if (error) {
        addResult(category, `Table: ${table}`, false, error.message);
      } else {
        addResult(category, `Table: ${table}`, true);
      }
    }
  } catch (error: any) {
    addResult(category, 'Table Check', false, error.message);
  }
}

async function validateTypeScriptSetup() {
  const category = 'TypeScript Setup';
  const fs = await import('fs');

  // Check if database types file exists
  const typesPath = resolve(process.cwd(), 'src/lib/database.types.ts');
  if (fs.existsSync(typesPath)) {
    addResult(category, 'Database Types', true);
  } else {
    addResult(category, 'Database Types', false, 'Run: npm run generate:types');
  }

  // Check tsconfig.json
  const tsconfigPath = resolve(process.cwd(), 'tsconfig.json');
  if (fs.existsSync(tsconfigPath)) {
    addResult(category, 'tsconfig.json', true);
  } else {
    addResult(category, 'tsconfig.json', false, 'tsconfig.json not found');
  }
}

function printResults() {
  console.log('\n🔍 AgriNova Setup Validation Results\n');
  console.log('═'.repeat(60));

  const categories = [...new Set(results.map(r => r.category))];

  let totalPassed = 0;
  let totalFailed = 0;

  categories.forEach(category => {
    console.log(`\n📁 ${category}`);
    console.log('─'.repeat(60));

    const categoryResults = results.filter(r => r.category === category);

    categoryResults.forEach(result => {
      const icon = result.passed ? '✅' : '❌';
      const status = result.passed ? 'PASS' : 'FAIL';
      console.log(`  ${icon} [${status}] ${result.check}`);

      if (!result.passed && result.message) {
        console.log(`     ↳ ${result.message}`);
      }

      if (result.passed) {
        totalPassed++;
      } else {
        totalFailed++;
      }
    });
  });

  console.log('\n' + '═'.repeat(60));
  console.log(`\n📊 Summary: ${totalPassed} passed, ${totalFailed} failed\n`);

  if (totalFailed > 0) {
    console.log('❌ Setup validation failed. Please fix the issues above.\n');
    process.exit(1);
  } else {
    console.log('✅ All checks passed! Your environment is ready.\n');
    process.exit(0);
  }
}

async function main() {
  console.log('Starting validation...\n');

  await validateEnvironmentVariables();
  await validateSupabaseConnection();
  await validateDatabaseTables();
  await validateTypeScriptSetup();

  printResults();
}

main().catch((error) => {
  console.error('❌ Validation script failed:', error);
  process.exit(1);
});
