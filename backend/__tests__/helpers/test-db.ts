import { adminClient, testDb, testMigrationClient } from '@/db/test-config';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { documents, documentChunks } from '@/db/schema';
import { sql } from 'drizzle-orm';

export async function setupTestDatabase() {
  try {
    // Check if test database exists
    const result = await adminClient`
      SELECT 1 FROM pg_database WHERE datname = 'islamic_finance_test'
    `;

    // Create test database if it doesn't exist
    if (result.length === 0) {
      await adminClient.unsafe('CREATE DATABASE islamic_finance_test');
      console.log('✓ Test database created');

      // Install pgvector extension
      await testMigrationClient.unsafe('CREATE EXTENSION IF NOT EXISTS vector');
      console.log('✓ pgvector extension installed');
    } else {
      // Ensure pgvector extension exists even if DB already exists
      await testMigrationClient.unsafe('CREATE EXTENSION IF NOT EXISTS vector');
    }

    // Run migrations
    await migrate(testDb, {
      migrationsFolder: './db/migrations',
    });
    console.log('✓ Test database migrations complete');
  } catch (error) {
    console.error('Failed to setup test database:', error);
    throw error;
  }
}

export async function cleanupTestData() {
  try {
    // Delete in correct order due to foreign key constraints
    await testDb.delete(documentChunks);
    await testDb.delete(documents);
  } catch (error) {
    console.error('Failed to cleanup test data:', error);
    throw error;
  }
}

export async function teardownTestDatabase() {
  try {
    await testMigrationClient.end();
    await adminClient.end();
  } catch (error) {
    console.error('Failed to teardown test database:', error);
  }
}

export async function resetTestDatabase() {
  try {
    // Truncate all tables
    await testDb.execute(sql`TRUNCATE TABLE document_chunks CASCADE`);
    await testDb.execute(sql`TRUNCATE TABLE documents CASCADE`);
  } catch (error) {
    console.error('Failed to reset test database:', error);
    throw error;
  }
}
