
// Mock database/index.js
const sequelize = {
  authenticate: jest.fn().mockResolvedValue(true),
  sync: jest.fn().mockResolvedValue(true),
  define: jest.fn().mockReturnValue({
    sync: jest.fn().mockResolvedValue({})
  }),
  transaction: jest.fn(async (fn) => {
    return await fn({
      commit: jest.fn(),
      rollback: jest.fn()
    });
  })
};

const Sequelize = {
  Op: {
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
  },
  STRING: jest.fn((length) => `STRING(${length || ''})`),
  TEXT: 'TEXT',
  DECIMAL: jest.fn((precision, scale) => `DECIMAL(${precision || 10},${scale || 2})`),
  ENUM: jest.fn((...values) => `ENUM(${values.join(',')})`),
  BOOLEAN: 'BOOLEAN',
  DATE: 'DATE',
  INTEGER: 'INTEGER',
  JSONB: 'JSONB'
};

const models = {
  Quote: {
    findOne: jest.fn().mockResolvedValue({}),
    findAll: jest.fn().mockResolvedValue([]),
    findAndCountAll: jest.fn().mockResolvedValue({ count: 0, rows: [] }),
    create: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue([1])
  },
  Booking: {
    findOne: jest.fn().mockResolvedValue({}),
    findAll: jest.fn().mockResolvedValue([]),
    findAndCountAll: jest.fn().mockResolvedValue({ count: 0, rows: [] }),
    create: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue([1])
  },
  Certificate: {
    findOne: jest.fn().mockResolvedValue({}),
    findAll: jest.fn().mockResolvedValue([]),
    findAndCountAll: jest.fn().mockResolvedValue({ count: 0, rows: [] }),
    create: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue([1])
  }
};

const testConnection = jest.fn().mockResolvedValue(true);

module.exports = {
  sequelize,
  Sequelize,
  models,
  testConnection
};
