// backend/src/__tests__/mocks/db.mock.js

// Create factory functions to avoid circular references
export function createMockQuote() {
  return {
    id: '12345',
    quoteId: 'QUOTE-12345',
    requestId: 'REQ-12345',
    premium: 100.00,
    currency: 'USD',
    coverageAmount: 10000.00,
    terms: 'Test terms and conditions',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    deductible: 0,
    integrationFeeType: 'percentage',
    integrationFeeValue: 0.1,
    integrationFeeAmount: 10.00,
    requestData: {
      description: 'Test cargo',
      value: 10000,
      freightClasses: [{ classId: 'class70', percentage: 100 }]
    },
    responseData: {
      quoteId: 'QUOTE-12345',
      premium: 100.00
    },
    status: 'active',
    toJSON: function() { return { ...this }; },
    update: jest.fn(function(data) {
      Object.assign(this, data);
      return Promise.resolve(this);
    }),
    reload: jest.fn(function() {
      return Promise.resolve(this);
    })
  };
}

export function createMockBooking() {
  return {
    id: '67890',
    bookingId: 'BOOKING-67890',
    requestId: 'REQ-67890',
    quoteId: 'QUOTE-12345',
    policyNumber: 'POLICY-67890',
    certificateUrl: 'https://test.loadsure.net/certificates/POLICY-67890.pdf',
    premium: 100.00,
    coverageAmount: 10000.00,
    requestData: {
      quoteId: 'QUOTE-12345'
    },
    responseData: {
      bookingId: 'BOOKING-67890',
      policyNumber: 'POLICY-67890'
    },
    status: 'active',
    toJSON: function() { return { ...this }; },
    update: jest.fn(function(data) {
      Object.assign(this, data);
      return Promise.resolve(this);
    }),
    reload: jest.fn(function() {
      return Promise.resolve(this);
    })
  };
}

export function createMockCertificate() {
  return {
    id: '54321',
    certificateNumber: 'POLICY-67890',
    bookingId: 'BOOKING-67890',
    productName: 'Cargo Insurance',
    productId: 'PROD-123',
    status: 'ACTIVE',
    coverageAmount: 10000.00,
    premium: 100.00,
    certificateLink: 'https://test.loadsure.net/certificates/POLICY-67890.pdf',
    validFrom: new Date(),
    validTo: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
    responseData: {
      certificateNumber: 'POLICY-67890',
      productName: 'Cargo Insurance'
    },
    toJSON: function() { return { ...this }; },
    update: jest.fn(function(data) {
      Object.assign(this, data);
      return Promise.resolve(this);
    }),
    reload: jest.fn(function() {
      return Promise.resolve(this);
    }),
    isActive: jest.fn(function() {
      if (this.status !== 'ACTIVE') return false;
      const now = new Date();
      if (this.validFrom && this.validTo) {
        return this.validFrom <= now && now <= this.validTo;
      }
      return true;
    })
  };
}

// Create instances to use throughout the tests
export const mockQuote = createMockQuote();
export const mockBooking = createMockBooking();
export const mockCertificate = createMockCertificate();

// Mock models
export const mockModels = {
  Quote: {
    findOne: jest.fn().mockResolvedValue(mockQuote),
    findByPk: jest.fn().mockResolvedValue(mockQuote),
    findAll: jest.fn().mockResolvedValue([mockQuote]),
    findAndCountAll: jest.fn().mockResolvedValue({ count: 1, rows: [mockQuote] }),
    create: jest.fn().mockResolvedValue(mockQuote),
    update: jest.fn().mockResolvedValue([1]),
    destroy: jest.fn().mockResolvedValue(1),
    findByQuoteId: jest.fn().mockResolvedValue(mockQuote),
    count: jest.fn().mockImplementation((options) => {
      if (!options || !options.where) return Promise.resolve(10);
      if (options.where.status === 'active') return Promise.resolve(5);
      if (options.where.status === 'expired') return Promise.resolve(3);
      if (options.where.status === 'booked') return Promise.resolve(2);
      return Promise.resolve(0);
    })
  },
  Booking: {
    findOne: jest.fn().mockResolvedValue(mockBooking),
    findByPk: jest.fn().mockResolvedValue(mockBooking),
    findAll: jest.fn().mockResolvedValue([mockBooking]),
    findAndCountAll: jest.fn().mockResolvedValue({ count: 1, rows: [mockBooking] }),
    create: jest.fn().mockResolvedValue(mockBooking),
    update: jest.fn().mockResolvedValue([1]),
    destroy: jest.fn().mockResolvedValue(1),
    findByPolicyNumber: jest.fn().mockResolvedValue(mockBooking),
    findByBookingId: jest.fn().mockResolvedValue(mockBooking),
    count: jest.fn().mockImplementation((options) => {
      if (!options || !options.where) return Promise.resolve(5);
      if (options.where.status === 'active') return Promise.resolve(5);
      return Promise.resolve(0);
    })
  },
  Certificate: {
    findOne: jest.fn().mockResolvedValue(mockCertificate),
    findByPk: jest.fn().mockResolvedValue(mockCertificate),
    findAll: jest.fn().mockResolvedValue([mockCertificate]),
    findAndCountAll: jest.fn().mockResolvedValue({ count: 1, rows: [mockCertificate] }),
    create: jest.fn().mockResolvedValue(mockCertificate),
    update: jest.fn().mockResolvedValue([1]),
    destroy: jest.fn().mockResolvedValue(1),
    findByCertificateNumber: jest.fn().mockResolvedValue(mockCertificate),
    count: jest.fn().mockResolvedValue(5)
  }
};

// Mock Sequelize
export const mockSequelize = {
  authenticate: jest.fn().mockResolvedValue(true),
  sync: jest.fn().mockResolvedValue(true),
  transaction: jest.fn(async (fn) => {
    const transaction = {
      commit: jest.fn(),
      rollback: jest.fn()
    };
    const result = await fn(transaction);
    return result;
  }),
  define: jest.fn().mockReturnValue({}),
  query: jest.fn().mockResolvedValue([]),
  model: jest.fn().mockImplementation((modelName) => mockModels[modelName] || {}),
  models: mockModels,
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
  }
};

// Mock database module for import
export const mockDatabase = {
  sequelize: mockSequelize,
  Sequelize: { Op: mockSequelize.Op },
  models: mockModels,
  testConnection: jest.fn().mockResolvedValue(true)
};