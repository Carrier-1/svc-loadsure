// backend/src/__tests__/mocks/requestData.mock.js
// Mock quote request using the simple format (for insuranceController tests)
export const mockSimpleQuoteRequest = {
  description: 'Test Electronics Shipment',
  freightClass: 'class70',
  value: 25000,
  originCity: 'Chicago',
  originState: 'IL',
  destinationCity: 'Denver',
  destinationState: 'CO',
  currency: 'USD',
  dimensionLength: 48,
  dimensionWidth: 40,
  dimensionHeight: 48,
  dimensionUnit: 'in',
  weightValue: 500,
  weightUnit: 'lbs',
  equipmentTypeId: 2, // Dry Van
  carrierName: 'Test Carrier Inc.',
  carrierEmail: 'carrier@example.com',
  carrierPhone: '555-123-4567',
  carrierDotNumber: '12345678',
  userName: 'Test User',
  userEmail: 'user@example.com',
  assuredName: 'Test Company LLC',
  assuredEmail: 'company@example.com',
  integrationFeeType: 'percentage',
  integrationFeeValue: 0.1
};

// Mock quote request using the complete format
export const mockCompleteQuoteRequest = {
  user: {
    id: 'user@example.com',
    email: 'user@example.com',
    name: 'Test User'
  },
  assured: {
    name: 'Test Company LLC',
    email: 'company@example.com',
    address: {
      address1: '123 Business St',
      address2: 'Suite 100',
      city: 'Chicago',
      state: 'IL',
      postal: '60601',
      country: 'USA'
    }
  },
  shipment: {
    version: '2',
    freightId: 'FR-123456789',
    poNumber: 'PO-123456789',
    pickupDate: '2025-05-01',
    deliveryDate: '2025-05-08',
    cargo: {
      cargoValue: {
        currency: 'USD',
        value: 25000
      },
      commodity: [7], // Electronics
      fullDescriptionOfCargo: 'Test Electronics Shipment',
      weight: {
        unit: 'lbs',
        value: 500
      },
      freightClass: [
        {
          id: 'class70',
          percentage: 100
        }
      ]
    },
    carriers: [
      {
        mode: 'ROAD',
        name: 'Test Carrier Inc.',
        email: 'carrier@example.com',
        phone: '555-123-4567',
        carrierId: {
          type: 'USDOT',
          value: '12345678'
        },
        equipmentType: 2 // Dry Van
      }
    ],
    stops: [
      {
        stopType: 'PICKUP',
        stopNumber: 1,
        date: '2025-05-01',
        address: {
          address1: '123 Origin St',
          address2: 'Suite 100',
          city: 'Chicago',
          state: 'IL',
          postal: '60601',
          country: 'USA'
        }
      },
      {
        stopType: 'DELIVERY',
        stopNumber: 2,
        date: '2025-05-08',
        address: {
          address1: '456 Destination Ave',
          address2: 'Floor 3',
          city: 'Denver',
          state: 'CO',
          postal: '80202',
          country: 'USA'
        }
      }
    ],
    loadType: 'FULL_TRUCKLOAD_1',
    equipmentType: 2, // Dry Van
    integrationFeeType: 'percentage',
    integrationFeeValue: 0.1
  }
};

// Mock booking request
export const mockBookingRequest = {
  quoteId: 'QUOTE-12345'
};

// Mock certificate request
export const mockCertificateRequest = {
  certificateNumber: 'POLICY-67890',
  userId: 'user@example.com'
};

// Test callback for Express response object
export function createMockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.on = jest.fn().mockImplementation((event, callback) => {
    if (event === 'finish') {
      callback();
    }
    return res;
  });
  return res;
}

// Test callback for Express request object
export function createMockRequest(body = {}, params = {}, query = {}, headers = {}) {
  return {
    body,
    params,
    query,
    headers,
    ip: '127.0.0.1',
    id: 'test-request-id',
    originalUrl: '/test-url'
  };
}