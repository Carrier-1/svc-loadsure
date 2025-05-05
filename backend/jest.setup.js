// jest.setup.js
// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.RABBITMQ_URL = 'amqp://localhost';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.LOADSURE_API_KEY = 'test-api-key';
process.env.LOADSURE_BASE_URL = 'https://test-api.com';

// Add global jest timeout
jest.setTimeout(10000);

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: console.error // Keep error for debugging
};

// Clean up after all tests
afterAll(() => {
  jest.clearAllMocks();
});