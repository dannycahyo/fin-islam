import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const testConnectionString =
  process.env.TEST_DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/islamic_finance_test';

// For test queries
const testQueryClient = postgres(testConnectionString);
export const testDb = drizzle(testQueryClient, { schema });

// For test migrations
export const testMigrationClient = postgres(testConnectionString, { max: 1 });

// For database creation
export const adminClient = postgres('postgresql://postgres:postgres@localhost:5432/postgres');
