// backend/src/__tests__/mocks/db.mock.js

// Mock version of our models for testing
export const mockQuote = {
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
    toJSON: () => ({ ...mockQuote }),
    update: jest.fn().mockResolvedValue(mockQuote)
  };
  
  export const mockBooking = {
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
    toJSON: () => ({ ...mockBooking }),
    update: jest.fn().mockResolvedValue(mockBooking)
  };
  
  export const mockCertificate = {
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
    toJSON: () => ({ ...mockCertificate }),
    update: jest.fn().mockResolvedValue(mockCertificate)
  };
  
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
      findByQuoteId: jest.fn().mockResolvedValue(mockQuote)
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
      findByBookingId: jest.fn().mockResolvedValue(mockBooking)
    },
    Certificate: {
      findOne: jest.fn().mockResolvedValue(mockCertificate),
      findByPk: jest.fn().mockResolvedValue(mockCertificate),
      findAll: jest.fn().mockResolvedValue([mockCertificate]),
      findAndCountAll: jest.fn().mockResolvedValue({ count: 1, rows: [mockCertificate] }),
      create: jest.fn().mockResolvedValue(mockCertificate),
      update: jest.fn().mockResolvedValue([1]),
      destroy: jest.fn().mockResolvedValue(1),
      findByCertificateNumber: jest.fn().mockResolvedValue(mockCertificate)
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