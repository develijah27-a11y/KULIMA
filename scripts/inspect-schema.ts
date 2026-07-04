/**
 * Database Schema Inspection Script
 * 
 * This script connects to Supabase and inspects the current database schema,
 * documenting all tables, columns, data types, constraints, indexes, and RLS policies.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface TableInfo {
  tableName: string;
  columns: ColumnInfo[];
  constraints: ConstraintInfo[];
  indexes: IndexInfo[];
  rlsPolicies: RLSPolicyInfo[];
  foreignKeys: ForeignKeyInfo[];
}

interface ColumnInfo {
  columnName: string;
  dataType: string;
  isNullable: string;
  columnDefault: string | null;
  characterMaximumLength: number | null;
  numericPrecision: number | null;
  numericScale: number | null;
}

interface ConstraintInfo {
  constraintName: string;
  constraintType: string;
  checkClause: string | null;
}

interface IndexInfo {
  indexName: string;
  indexDef: string;
}

interface RLSPolicyInfo {
  policyName: string;
  permissive: string;
  roles: string[];
  cmd: string;
  qual: string | null;
  withCheck: string | null;
}

interface ForeignKeyInfo {
  constraintName: string;
  columnName: string;
  foreignTableName: string;
  foreignColumnName: string;
  deleteRule: string;
  updateRule: string;
}

async function inspectSchema(): Promise<void> {
  console.log('='.repeat(80));
  console.log('AGRINOVA AGRITECH DATABASE SCHEMA INSPECTION');
  console.log('='.repeat(80));
  console.log();

  // Get list of tables in public schema
  const { data: tables, error: tablesError } = await supabase.rpc('get_tables');
  
  if (tablesError) {
    // Fallback: Query information_schema directly
    const { data: tablesData, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE');

    if (error) {
      console.error('Error fetching tables:', error);
      // Use known tables from migration
      await inspectKnownTables();
      return;
    }
  }

  // Inspect known tables from the migration
  await inspectKnownTables();
}

async function inspectKnownTables(): Promise<void> {
  const knownTables = [
    'profiles',
    'farms',
    'crops',
    'soil_reports',
    'disease_scans',
    'weather_logs'
  ];

  for (const tableName of knownTables) {
    await inspectTable(tableName);
  }
}

async function inspectTable(tableName: string): Promise<void> {
  console.log('━'.repeat(80));
  console.log(`TABLE: ${tableName.toUpperCase()}`);
  console.log('━'.repeat(80));
  console.log();

  // Get columns
  const columns = await getColumns(tableName);
  console.log('COLUMNS:');
  console.log('-'.repeat(80));
  console.log(
    'Column Name'.padEnd(30) +
    'Data Type'.padEnd(20) +
    'Nullable'.padEnd(10) +
    'Default'
  );
  console.log('-'.repeat(80));
  
  for (const col of columns) {
    const dataType = col.numericPrecision
      ? `${col.dataType}(${col.numericPrecision},${col.numericScale})`
      : col.characterMaximumLength
      ? `${col.dataType}(${col.characterMaximumLength})`
      : col.dataType;
    
    console.log(
      col.columnName.padEnd(30) +
      dataType.padEnd(20) +
      col.isNullable.padEnd(10) +
      (col.columnDefault || '')
    );
  }
  console.log();

  // Get constraints
  const constraints = await getConstraints(tableName);
  if (constraints.length > 0) {
    console.log('CONSTRAINTS:');
    console.log('-'.repeat(80));
    for (const constraint of constraints) {
      console.log(`  ${constraint.constraintType}: ${constraint.constraintName}`);
      if (constraint.checkClause) {
        console.log(`    Check: ${constraint.checkClause}`);
      }
    }
    console.log();
  }

  // Get foreign keys
  const foreignKeys = await getForeignKeys(tableName);
  if (foreignKeys.length > 0) {
    console.log('FOREIGN KEYS:');
    console.log('-'.repeat(80));
    for (const fk of foreignKeys) {
      console.log(`  ${fk.constraintName}:`);
      console.log(`    ${tableName}.${fk.columnName} -> ${fk.foreignTableName}.${fk.foreignColumnName}`);
      console.log(`    ON DELETE ${fk.deleteRule}, ON UPDATE ${fk.updateRule}`);
    }
    console.log();
  }

  // Get indexes
  const indexes = await getIndexes(tableName);
  if (indexes.length > 0) {
    console.log('INDEXES:');
    console.log('-'.repeat(80));
    for (const idx of indexes) {
      console.log(`  ${idx.indexName}:`);
      console.log(`    ${idx.indexDef}`);
    }
    console.log();
  }

  // Get RLS policies
  const rlsPolicies = await getRLSPolicies(tableName);
  console.log('ROW LEVEL SECURITY:');
  console.log('-'.repeat(80));
  
  // Check if RLS is enabled
  const rlsEnabled = await isRLSEnabled(tableName);
  console.log(`  RLS Enabled: ${rlsEnabled ? 'YES' : 'NO'}`);
  
  if (rlsPolicies.length > 0) {
    console.log('  Policies:');
    for (const policy of rlsPolicies) {
      console.log(`    - ${policy.policyName} (${policy.cmd})`);
      console.log(`      Permissive: ${policy.permissive}`);
      console.log(`      Roles: ${policy.roles.join(', ')}`);
      if (policy.qual) {
        console.log(`      USING: ${policy.qual}`);
      }
      if (policy.withCheck) {
        console.log(`      WITH CHECK: ${policy.withCheck}`);
      }
    }
  } else {
    console.log('  No policies defined');
  }
  console.log();
}

async function getColumns(tableName: string): Promise<ColumnInfo[]> {
  const query = `
    SELECT 
      column_name,
      data_type,
      is_nullable,
      column_default,
      character_maximum_length,
      numeric_precision,
      numeric_scale
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = '${tableName}'
    ORDER BY ordinal_position;
  `;

  const { data, error } = await supabase.rpc('exec_sql', { sql: query });
  
  if (error) {
    console.error(`Error fetching columns for ${tableName}:`, error);
    return [];
  }

  return data || [];
}

async function getConstraints(tableName: string): Promise<ConstraintInfo[]> {
  const query = `
    SELECT 
      tc.constraint_name,
      tc.constraint_type,
      cc.check_clause
    FROM information_schema.table_constraints tc
    LEFT JOIN information_schema.check_constraints cc
      ON tc.constraint_name = cc.constraint_name
    WHERE tc.table_schema = 'public'
      AND tc.table_name = '${tableName}'
      AND tc.constraint_type IN ('CHECK', 'UNIQUE', 'PRIMARY KEY')
    ORDER BY tc.constraint_type, tc.constraint_name;
  `;

  const { data, error } = await supabase.rpc('exec_sql', { sql: query });
  
  if (error) {
    console.error(`Error fetching constraints for ${tableName}:`, error);
    return [];
  }

  return data || [];
}

async function getForeignKeys(tableName: string): Promise<ForeignKeyInfo[]> {
  const query = `
    SELECT 
      tc.constraint_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      rc.delete_rule,
      rc.update_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name
    WHERE tc.table_schema = 'public'
      AND tc.table_name = '${tableName}'
      AND tc.constraint_type = 'FOREIGN KEY'
    ORDER BY tc.constraint_name;
  `;

  const { data, error } = await supabase.rpc('exec_sql', { sql: query });
  
  if (error) {
    console.error(`Error fetching foreign keys for ${tableName}:`, error);
    return [];
  }

  return data || [];
}

async function getIndexes(tableName: string): Promise<IndexInfo[]> {
  const query = `
    SELECT 
      indexname AS index_name,
      indexdef AS index_def
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = '${tableName}'
    ORDER BY indexname;
  `;

  const { data, error } = await supabase.rpc('exec_sql', { sql: query });
  
  if (error) {
    console.error(`Error fetching indexes for ${tableName}:`, error);
    return [];
  }

  return data || [];
}

async function getRLSPolicies(tableName: string): Promise<RLSPolicyInfo[]> {
  const query = `
    SELECT 
      polname AS policy_name,
      CASE polpermissive WHEN true THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END AS permissive,
      polroles::regrole[] AS roles,
      polcmd AS cmd,
      pg_get_expr(polqual, polrelid) AS qual,
      pg_get_expr(polwithcheck, polrelid) AS with_check
    FROM pg_policy
    JOIN pg_class ON pg_policy.polrelid = pg_class.oid
    WHERE pg_class.relname = '${tableName}'
    ORDER BY polname;
  `;

  const { data, error } = await supabase.rpc('exec_sql', { sql: query });
  
  if (error) {
    console.error(`Error fetching RLS policies for ${tableName}:`, error);
    return [];
  }

  return data || [];
}

async function isRLSEnabled(tableName: string): Promise<boolean> {
  const query = `
    SELECT relrowsecurity
    FROM pg_class
    WHERE relname = '${tableName}'
      AND relnamespace = 'public'::regnamespace;
  `;

  const { data, error } = await supabase.rpc('exec_sql', { sql: query });
  
  if (error) {
    console.error(`Error checking RLS status for ${tableName}:`, error);
    return false;
  }

  return data && data.length > 0 && data[0].relrowsecurity;
}

// Run the inspection
inspectSchema()
  .then(() => {
    console.log('='.repeat(80));
    console.log('SCHEMA INSPECTION COMPLETE');
    console.log('='.repeat(80));
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error during schema inspection:', error);
    process.exit(1);
  });
