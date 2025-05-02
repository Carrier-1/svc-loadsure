// backend/tests/unit/database/models/Booking.test.js
import { jest } from '@jest/globals';
import { Sequelize } from 'sequelize';

// Mock data
const mockBookingData = {
  bookingId: 'booking-12345',
  requestId: 'req-12345',
  quoteId: 'quote-12345',
  policyNumber: 'POL-12345-ABC',
  certificateUrl: 'https://example.com/certificates/POL-12345-ABC.pdf',
  status: 'active',
  premium: 150.50,
  coverageAmount: 25000.00,
  requestData: { quoteId: 'quote-12345' },
  responseData: { bookingId: 'booking-12345', policyNumber: 'POL-12345-ABC' },
  metadata: { source: 'test' }
};

// Create a mock Sequelize instance
const mockSequelize = new Sequelize('sqlite::memory:');

describe('Booking Model', () => {
  let Booking;
  let Quote;
  let Certificate;
  
  beforeAll(async () => {
    // Import the model definitions
    const defineBookingModel = (await import('../../../database/models/Booking.js')).default;
    const defineQuoteModel = (await import('../../../database/models/Quote.js')).default;
    const defineCertificateModel = (await import('../../../database/models/Certificate.js')).default;
    
    // Define the models with the mock Sequelize instance
    Booking = defineBookingModel(mockSequelize);
    Quote = defineQuoteModel(mockSequelize);
    Certificate = defineCertificateModel(mockSequelize);
    
    // Set up associations
    sequelize.models = { Quote, Booking, Certificate };
    
    if (Booking.associate) {
      Booking.associate(sequelize.models);
    }
    
    if (Quote.associate) {
      Quote.associate(sequelize.models);
    }
    
    if (Certificate.associate) {
      Certificate.associate(sequelize.models);
    }
    
    // Sync the models to create the tables
    await mockSequelize.sync({ force: true });
  });
  
  beforeEach(async () => {
    // Clear the tables before each test
    await Booking.destroy({ truncate: true, cascade: true });
    await Quote.destroy({ truncate: true, cascade: true });
    await Certificate.destroy({ truncate: true, cascade: true });
    
    // Create a mock quote for testing
    await Quote.create({
      quoteId: mockBookingData.quoteId,
      requestId: 'req-quote-12345',
      premium: mockBookingData.premium,
      currency: 'USD',
      coverageAmount: mockBookingData.coverageAmount,
      terms: 'These are sample terms and conditions.',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      status: 'active'
    });
  });
  
  test('should create a booking with correct fields', async () => {
    const booking = await Booking.create(mockBookingData);
    
    // Check that the booking was created correctly
    expect(booking.bookingId).toBe(mockBookingData.bookingId);
    expect(booking.requestId).toBe(mockBookingData.requestId);
    expect(booking.quoteId).toBe(mockBookingData.quoteId);
    expect(booking.policyNumber).toBe(mockBookingData.policyNumber);
    expect(booking.certificateUrl).toBe(mockBookingData.certificateUrl);
    expect(booking.status).toBe(mockBookingData.status);
    expect(booking.premium).toBe(mockBookingData.premium);
    expect(booking.coverageAmount).toBe(mockBookingData.coverageAmount);
    
    // Check that the timestamps were set
    expect(booking.createdAt).toBeInstanceOf(Date);
    expect(booking.updatedAt).toBeInstanceOf(Date);
  });
  
  test('should mark the quote as booked when a booking is created', async () => {
    // Create a booking
    await Booking.create(mockBookingData);
    
    // Check that the associated quote was marked as booked
    const quote = await Quote.findByQuoteId(mockBookingData.quoteId);
    expect(quote.status).toBe('booked');
  });
  
  test('should find booking by policyNumber', async () => {
    // Create a booking
    await Booking.create(mockBookingData);
    
    // Find the booking by policyNumber
    const booking = await Booking.findByPolicyNumber(mockBookingData.policyNumber);
    
    // Check that the booking was found
    expect(booking).not.toBeNull();
    expect(booking.policyNumber).toBe(mockBookingData.policyNumber);
  });
  
  test('should find booking by bookingId', async () => {
    // Create a booking
    await Booking.create(mockBookingData);
    
    // Find the booking by bookingId
    const booking = await Booking.findByBookingId(mockBookingData.bookingId);
    
    // Check that the booking was found
    expect(booking).not.toBeNull();
    expect(booking.bookingId).toBe(mockBookingData.bookingId);
  });
  
  test('should update an existing booking', async () => {
    // Create a booking
    const booking = await Booking.create(mockBookingData);
    
    // Update the booking
    const updatedStatus = 'cancelled';
    const updatedMetadata = { source: 'test-updated', note: 'This is a test update' };
    
    await booking.update({
      status: updatedStatus,
      metadata: updatedMetadata
    });
    
    // Reload the booking from the database to ensure changes were saved
    await booking.reload();
    
    // Check that the booking was updated correctly
    expect(booking.status).toBe(updatedStatus);
    expect(booking.metadata).toEqual(updatedMetadata);
    
    // Check that only the specified fields were updated
    expect(booking.bookingId).toBe(mockBookingData.bookingId);
    expect(booking.policyNumber).toBe(mockBookingData.policyNumber);
  });
  
  test('should create a certificate when a booking is created', async () => {
    // Spy on Certificate.create
    const certificateCreateSpy = jest.spyOn(Certificate, 'create');
    
    // Create a booking
    await Booking.create(mockBookingData);
    
    // Check that Certificate.create was called with the correct parameters
    expect(certificateCreateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        certificateNumber: mockBookingData.policyNumber,
        bookingId: mockBookingData.bookingId,
        certificateLink: mockBookingData.certificateUrl,
        status: 'ACTIVE',
        premium: mockBookingData.premium,
        coverageAmount: mockBookingData.coverageAmount
      })
    );
    
    // Check that the certificate was actually created
    const certificate = await Certificate.findOne({
      where: { certificateNumber: mockBookingData.policyNumber }
    });
    
    expect(certificate).not.toBeNull();
    expect(certificate.certificateNumber).toBe(mockBookingData.policyNumber);
    expect(certificate.bookingId).toBe(mockBookingData.bookingId);
  });
  
  test('should handle error in afterCreate hook gracefully', async () => {
    // Mock console.error to catch the error
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Mock Quote.update to throw an error
    const originalQuoteUpdate = Quote.update;
    Quote.update = jest.fn().mockRejectedValue(new Error('Mock update error'));
    
    try {
      // Create a booking - this should still succeed even though the Quote.update fails
      const booking = await Booking.create(mockBookingData);
      
      // Check that the booking was created correctly
      expect(booking.bookingId).toBe(mockBookingData.bookingId);
      
      // Check that console.error was called with the error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error updating quote status after booking:',
        expect.any(Error)
      );
    } finally {
      // Restore mocks
      Quote.update = originalQuoteUpdate;
      consoleErrorSpy.mockRestore();
    }
  });
});