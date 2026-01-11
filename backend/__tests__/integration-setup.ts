import { beforeAll, afterAll, afterEach, vi } from 'vitest';
import { setupTestDatabase, teardownTestDatabase, resetTestDatabase } from './helpers/test-db';

beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/islamic_finance_test';

  // Setup test database
  console.log('Setting up test database...');
  await setupTestDatabase();
});

afterEach(async () => {
  // Clear all mocks after each test
  vi.clearAllMocks();

  // Reset database for API tests (keeps schema, clears data)
  await resetTestDatabase();
});

afterAll(async () => {
  // Teardown and close connections
  console.log('Tearing down test database...');
  await teardownTestDatabase();
});
