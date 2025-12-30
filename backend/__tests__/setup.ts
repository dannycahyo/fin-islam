import { beforeAll, afterAll, afterEach } from 'vitest';

beforeAll(() => {
  // Global setup
  process.env.NODE_ENV = 'test';
});

afterEach(() => {
  // Clear all mocks after each test
  vi.clearAllMocks();
});

afterAll(() => {
  // Global teardown
});
