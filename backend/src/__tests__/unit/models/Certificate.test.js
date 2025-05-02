// backend/tests/unit/database/models/Certificate.test.js
import { jest } from '@jest/globals';
import { Sequelize } from 'sequelize';

// Mock data
const mockCertificateData = {
  certificateNumber: 'POL-12345-ABC',
  bookingId: 'booking-12345',
  productName: 'Standard Coverage',
  productId: 'STANDARD-1',
  status: 'ACTIVE',
  coverageAmount: 25000.00,
  premium: 150.50,
  certificateLink: 'https://example.com/certificates/POL-12345-ABC.pdf',
  validFrom: new Date(),
  validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
  requestData: { certificateNumber: 'POL-12345-ABC' },
  responseData: { certificateNumber: 'POL-12345-ABC', limit: 25000.00 }
};

// Create a mock Sequelize instance
const mockSequelize = new Sequelize('sqlite::memory:');

describe('Certificate Model', () => {
  let Certificate;
  let Booking;
  
  beforeAll(async () => {
    // Import the model definitions
    const defineCertificateModel = (await import('../../../database/models/Certificate.js')).default;
    const defineBookingModel = (await import('../../../database/models/Booking.js')).default;
    
    // Define the models with the mock Sequelize instance
    Certificate = defineCertificateModel(mockSequelize);
    Booking = defineBookingModel(mockSequelize);
    
    // Set up associations
    sequelize.models = { Certificate, Booking };
    
    if (Certificate.associate) {
      Certificate.associate(sequelize.models);
    }
    
    if (Booking.associate) {
      Booking.associate(sequelize.models);
    }
    
    // Sync the models to create the tables
    await mockSequelize.sync({ force: true });
  });
  
  beforeEach(async () => {
    // Clear the tables before each test
    await Certificate.destroy({ truncate: true, cascade: true });
    await Booking.destroy({ truncate: true, cascade: true });
    
    // Create a mock booking for testing
    await Booking.create({
      bookingId: mockCertificateData.bookingId,
      requestId: 'req-12345',
      quoteId: 'quote-12345',
      policyNumber: mockCertificateData.certificateNumber,
      certificateUrl: mockCertificateData.certificateLink,
      status: 'active',
      premium: mockCertificateData.premium,
      coverageAmount: mockCertificateData.coverageAmount
    });
  });
  
  test('should create a certificate with correct fields', async () => {
    const certificate = await Certificate.create(mockCertificateData);
    
    // Check that the certificate was created correctly
    expect(certificate.certificateNumber).toBe(mockCertificateData.certificateNumber);
    expect(certificate.bookingId).toBe(mockCertificateData.bookingId);
    expect(certificate.productName).toBe(mockCertificateData.productName);
    expect(certificate.productId).toBe(mockCertificateData.productId);
    expect(certificate.status).toBe(mockCertificateData.status);
    expect(certificate.coverageAmount).toBe(mockCertificateData.coverageAmount);
    expect(certificate.premium).toBe(mockCertificateData.premium);
    expect(certificate.certificateLink).toBe(mockCertificateData.certificateLink);
    
    // Check that the timestamps were set
    expect(certificate.createdAt).toBeInstanceOf(Date);
    expect(certificate.updatedAt).toBeInstanceOf(Date);
  });
  
  test('should find certificate by certificateNumber', async () => {
    // Create a certificate
    await Certificate.create(mockCertificateData);
    
    // Find the certificate by certificateNumber
    const certificate = await Certificate.findByCertificateNumber(mockCertificateData.certificateNumber);
    
    // Check that the certificate was found
    expect(certificate).not.toBeNull();
    expect(certificate.certificateNumber).toBe(mockCertificateData.certificateNumber);
  });
  
  test('should update an existing certificate', async () => {
    // Create a certificate
    const certificate = await Certificate.create(mockCertificateData);
    
    // Update the certificate
    const updatedStatus = 'EXPIRED';
    const updatedProductName = 'Premium Coverage';
    
    await certificate.update({
      status: updatedStatus,
      productName: updatedProductName
    });
    
    // Reload the certificate from the database to ensure changes were saved
    await certificate.reload();
    
    // Check that the certificate was updated correctly
    expect(certificate.status).toBe(updatedStatus);
    expect(certificate.productName).toBe(updatedProductName);
    
    // Check that only the specified fields were updated
    expect(certificate.certificateNumber).toBe(mockCertificateData.certificateNumber);
    expect(certificate.premium).toBe(mockCertificateData.premium);
  });
  
  test('isActive should return true for an active certificate within validity period', async () => {
    // Create an active certificate with current validity period
    const certificate = await Certificate.create(mockCertificateData);
    
    // Check that isActive returns true
    expect(certificate.isActive()).toBe(true);
  });
  
  test('isActive should return false for a non-active certificate', async () => {
    // Create a certificate with non-active status
    const certificate = await Certificate.create({
      ...mockCertificateData,
      status: 'EXPIRED'
    });
    
    // Check that isActive returns false
    expect(certificate.isActive()).toBe(false);
  });
  
  test('isActive should return false for a certificate with validity period in the future', async () => {
    // Create an active certificate with future validity period
    const futureStart = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day from now
    const futureEnd = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days from now
    
    const certificate = await Certificate.create({
      ...mockCertificateData,
      validFrom: futureStart,
      validTo: futureEnd
    });
    
    // Check that isActive returns false
    expect(certificate.isActive()).toBe(false);
  });
  
  test('isActive should return false for a certificate with validity period in the past', async () => {
    // Create an active certificate with past validity period
    const pastStart = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
    const pastEnd = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // 1 day ago
    
    const certificate = await Certificate.create({
      ...mockCertificateData,
      validFrom: pastStart,
      validTo: pastEnd
    });
    
    // Check that isActive returns false
    expect(certificate.isActive()).toBe(false);
  });
  
  test('isActive should handle missing validFrom or validTo dates', async () => {
    // Create a certificate without validity dates
    const certificate = await Certificate.create({
      ...mockCertificateData,
      validFrom: null,
      validTo: null
    });
    
    // Check that isActive returns true (defaults to active if dates not provided)
    expect(certificate.isActive()).toBe(true);
  });
  
  test('should find certificate by bookingId', async () => {
    // Create a certificate
    await Certificate.create(mockCertificateData);
    
    // Find certificates by bookingId
    const certificates = await Certificate.findAll({
      where: { bookingId: mockCertificateData.bookingId }
    });
    
    // Check that the certificate was found
    expect(certificates.length).toBe(1);
    expect(certificates[0].bookingId).toBe(mockCertificateData.bookingId);
  });
});