// backend/jest.setup.js
// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DB_DIALECT = 'postgres'; // Use postgres instead of sqlite
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

// Mock for ioredis
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

// Mock for amqplib
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

// Mock node-fetch
jest.mock('node-fetch', () => {
  return jest.fn().mockImplementation(() => Promise.resolve({
    ok: true,
    json: jest.fn().mockResolvedValue({}),
    text: jest.fn().mockResolvedValue(''),
  }));
});

// Mock fs
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn().mockReturnValue('{}'),
  writeFileSync: jest.fn(),
  promises: {
    readFile: jest.fn().mockResolvedValue('{}'),
    writeFile: jest.fn().mockResolvedValue(),
  }
}));

// Mock child_process
jest.mock('child_process', () => ({
  exec: jest.fn((command, callback) => {
    if (callback) callback(null, { stdout: '2\n', stderr: '' });
    return { stdout: '2\n', stderr: '' };
  }),
  execSync: jest.fn(() => Buffer.from('test')),
  spawn: jest.fn(() => ({
    stdout: { on: jest.fn() },
    stderr: { on: jest.fn() },
    on: jest.fn()
  }))
}));

// Mock node-schedule
jest.mock('node-schedule', () => ({
  scheduleJob: jest.fn(() => ({
    cancel: jest.fn()
  }))
}));

// Mock sqlite3 module to avoid binding issues
jest.mock('sqlite3', () => ({
  Database: jest.fn(),
  verbose: jest.fn(() => ({
    Database: jest.fn()
  }))
}));

// Mock Sequelize DataTypes
const mockDataTypes = {
  STRING: jest.fn((length) => `STRING(${length || ''})`),
  TEXT: 'TEXT',
  INTEGER: 'INTEGER',
  BOOLEAN: 'BOOLEAN',
  DATE: 'DATE',
  UUID: 'UUID',
  UUIDV4: 'UUIDV4',
  DECIMAL: jest.fn((precision, scale) => `DECIMAL(${precision || 10},${scale || 2})`),
  ENUM: jest.fn((...values) => `ENUM(${values.join(',')})`),
  JSONB: 'JSONB',
  ARRAY: jest.fn(type => `ARRAY(${type})`),
};

// Mock Sequelize
jest.mock('sequelize', () => {
  // Mock Sequelize class
  class MockSequelize {
    constructor() {
      this.models = {};
      this.options = {};
      this.config = {};
      this.dialect = 'postgres';
    }

    authenticate() {
      return Promise.resolve();
    }

    sync() {
      return Promise.resolve();
    }

    define(modelName, attributes, options = {}) {
      const model = {
        name: modelName,
        attributes,
        options,
        associate: null,
        sync: jest.fn().mockResolvedValue({}),
        findOne: jest.fn().mockResolvedValue({}),
        findAll: jest.fn().mockResolvedValue([]),
        findByPk: jest.fn().mockResolvedValue({}),
        findAndCountAll: jest.fn().mockResolvedValue({ count: 0, rows: [] }),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockImplementation(data => {
          const instance = {
            ...data,
            id: 'mock-id',
            createdAt: new Date(),
            updatedAt: new Date(),
            toJSON: () => ({ ...instance }),
            reload: () => Promise.resolve(instance),
            update: jest.fn().mockImplementation(updateData => {
              Object.assign(instance, updateData);
              return Promise.resolve(instance);
            })
          };
          
          // Run beforeCreate hooks if defined
          if (options.hooks && options.hooks.beforeCreate) {
            options.hooks.beforeCreate(instance);
          }
          
          return Promise.resolve(instance);
        }),
        update: jest.fn().mockResolvedValue([1]),
        destroy: jest.fn().mockResolvedValue(1),
        bulkCreate: jest.fn().mockResolvedValue([]),
      };

      this.models[modelName] = model;
      return model;
    }

    transaction(callback) {
      const transaction = {
        commit: jest.fn(),
        rollback: jest.fn()
      };
      
      if (callback) {
        return Promise.resolve(callback(transaction));
      }
      
      return Promise.resolve(transaction);
    }

    query() {
      return Promise.resolve([]);
    }
  }

  // Add static properties to mock class
  MockSequelize.DataTypes = mockDataTypes;
  MockSequelize.Op = {
    eq: Symbol('eq'),
    ne: Symbol('ne'),
    gt: Symbol('gt'),
    lt: Symbol('lt'),
    gte: Symbol('gte'),
    lte: Symbol('lte'),
    in: Symbol('in'),
    notIn: Symbol('notIn'),
    like: Symbol('like'),
    iLike: Symbol('iLike'),
    or: Symbol('or'),
    and: Symbol('and')
  };

  return MockSequelize;
});

// Clean up after all tests
afterAll(() => {
  jest.clearAllMocks();
});