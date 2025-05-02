// backend/jest.setup.js

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DB_DIALECT = 'sqlite';
process.env.DB_STORAGE = ':memory:';
process.env.RABBITMQ_URL = 'amqp://localhost';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.LOADSURE_API_KEY = 'MiphvjLVlwfZHrfhGklLgHzvjxiTbzIunOCrIAizpjVFiiRSufowtNhGGCLAiSmN';
process.env.LOADSURE_BASE_URL = 'https://portal.loadsure.net';

// Add global jest timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  // Keep error but suppress other console methods
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Leave error unmocked for debugging
  // error: jest.fn(),
};

// Add global mocks
jest.mock('ioredis', () => {
  const redisMock = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(0),
    keys: jest.fn().mockResolvedValue([]),
    ping: jest.fn().mockResolvedValue('PONG'),
    on: jest.fn(),
    quit: jest.fn(),
    disconnect: jest.fn(),
  };
  
  return jest.fn(() => redisMock);
});

jest.mock('amqplib', () => {
  const channelMock = {
    assertQueue: jest.fn().mockResolvedValue({}),
    consume: jest.fn().mockResolvedValue({}),
    sendToQueue: jest.fn(),
    ack: jest.fn(),
    nack: jest.fn(),
    prefetch: jest.fn(),
    close: jest.fn(),
    cancel: jest.fn(),
    checkQueue: jest.fn(),
  };

  const connectionMock = {
    createChannel: jest.fn().mockResolvedValue(channelMock),
    close: jest.fn(),
    on: jest.fn(),
  };

  return {
    connect: jest.fn().mockResolvedValue(connectionMock),
  };
});

// Clean up after all tests
afterAll(() => {
  jest.clearAllMocks();
});