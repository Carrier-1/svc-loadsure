// backend/src/services/databaseService.js
import { Op } from 'sequelize';
import { sequelize, models } from '../../database/index.js';

const { Quote, Booking, Certificate } = models;

/**
 * Service for database operations related to insurance
 */
class DatabaseService {
  /**
   * Initialize the database
   * @returns {Promise<void>}
   */
  static async initialize() {
    try {
      // Sync models with database
      await sequelize.sync();
      console.log('Database synchronized successfully');
    } catch (error) {
      console.error('Failed to synchronize database:', error);
    
      // Check if error is due to missing database
      if (error.message && error.message.includes('database') && error.message.includes('does not exist')) {
        console.log('Database does not exist. Please create it manually using the following commands:');
        console.log('  1. Connect to postgres container: docker-compose exec postgres bash');
        console.log('  2. Login to psql: psql -U loadsure');
        console.log(`  3. Create database: CREATE DATABASE loadsure_dev;`);
        console.log('  4. Exit psql and restart the application container');
      }
      
      throw error;
    }
  }

  /**
   * Save a quote to the database
   * @param {Object} quoteData - Quote data from Loadsure API
   * @param {Object} requestData - Original freight details used for the quote
   * @returns {Promise<Object>} Saved quote
   */
  static async saveQuote(quoteData, requestData) {
    try {
      const { quoteId, requestId, premium, currency, coverageAmount, terms, expiresAt, deductible } = quoteData;
      
      // Check if quote already exists
      let quote = await Quote.findByQuoteId(quoteId);
      
      if (quote) {
        // Update existing quote
        await quote.update({
          requestId,
          premium,
          currency,
          coverageAmount,
          terms,
          expiresAt,
          deductible,
          requestData,
          responseData: quoteData,
          status: new Date() > new Date(expiresAt) ? 'expired' : 'active'
        });
      } else {
        // Create new quote
        quote = await Quote.create({
          quoteId,
          requestId,
          premium,
          currency,
          coverageAmount,
          terms,
          expiresAt,
          deductible,
          requestData,
          responseData: quoteData,
          status: new Date() > new Date(expiresAt) ? 'expired' : 'active'
        });
      }
      
      return quote;
    } catch (error) {
      console.error('Error saving quote to database:', error);
      throw error;
    }
  }

  /**
   * Get a quote by its ID
   * @param {String} quoteId - Quote ID from Loadsure API
   * @returns {Promise<Object>} Quote data
   */
  static async getQuote(quoteId) {
    try {
      const quote = await Quote.findByQuoteId(quoteId);
      if (!quote) {
        throw new Error(`Quote with ID ${quoteId} not found`);
      }
      return quote;
    } catch (error) {
      console.error(`Error getting quote ${quoteId}:`, error);
      throw error;
    }
  }

  /**
   * Save a booking to the database
   * @param {Object} bookingData - Booking data from Loadsure API
   * @param {Object} requestData - Original booking request data
   * @returns {Promise<Object>} Saved booking
   */
  static async saveBooking(bookingData, requestData = null) {
    try {
      const { bookingId, requestId, quoteId, policyNumber, certificateUrl } = bookingData;
      
      // Check if booking already exists
      let booking = await Booking.findByBookingId(bookingId);
      
      if (booking) {
        // Update existing booking
        await booking.update({
          requestId,
          quoteId,
          policyNumber,
          certificateUrl,
          requestData,
          responseData: bookingData
        });
      } else {
        // Get quote data for premium and coverage amount
        let premium = null;
        let coverageAmount = null;
        
        try {
          const quote = await Quote.findByQuoteId(quoteId);
          if (quote) {
            premium = quote.premium;
            coverageAmount = quote.coverageAmount;
          }
        } catch (e) {
          console.warn(`Could not find quote data for booking ${bookingId}:`, e);
        }
        
        // Create new booking
        booking = await Booking.create({
          bookingId,
          requestId,
          quoteId,
          policyNumber,
          certificateUrl,
          premium,
          coverageAmount,
          requestData,
          responseData: bookingData,
          status: 'active'
        });
        
        // Create certificate record
        await Certificate.create({
          certificateNumber: policyNumber,
          bookingId,
          certificateLink: certificateUrl,
          status: 'ACTIVE',
          premium,
          coverageAmount,
          responseData: bookingData
        });
      }
      
      return booking;
    } catch (error) {
      console.error('Error saving booking to database:', error);
      throw error;
    }
  }

  /**
   * Get a booking by its ID
   * @param {String} bookingId - Booking ID
   * @returns {Promise<Object>} Booking data
   */
  static async getBooking(bookingId) {
    try {
      const booking = await Booking.findByBookingId(bookingId);
      if (!booking) {
        throw new Error(`Booking with ID ${bookingId} not found`);
      }
      return booking;
    } catch (error) {
      console.error(`Error getting booking ${bookingId}:`, error);
      throw error;
    }
  }

  /**
   * Save certificate details to the database
   * @param {Object} certificateData - Certificate data from Loadsure API
   * @param {Object} requestData - Original certificate request data
   * @returns {Promise<Object>} Saved certificate
   */
  static async saveCertificate(certificateData, requestData = null) {
    try {
      const { 
        certificateNumber, productName, productId, status, 
        limit, premium, certificateLink 
      } = certificateData;
      
      // Check if certificate already exists
      let certificate = await Certificate.findByCertificateNumber(certificateNumber);
      
      if (certificate) {
        // Update existing certificate
        await certificate.update({
          productName,
          productId,
          status,
          coverageAmount: limit,
          premium,
          certificateLink,
          requestData,
          responseData: certificateData
        });
      } else {
        // Try to find associated booking
        let bookingId = null;
        try {
          const booking = await Booking.findByPolicyNumber(certificateNumber);
          if (booking) {
            bookingId = booking.bookingId;
          }
        } catch (e) {
          console.warn(`Could not find booking for certificate ${certificateNumber}:`, e);
        }
        
        // Create new certificate
        certificate = await Certificate.create({
          certificateNumber,
          bookingId,
          productName,
          productId,
          status,
          coverageAmount: limit,
          premium,
          certificateLink,
          requestData,
          responseData: certificateData
        });
      }
      
      return certificate;
    } catch (error) {
      console.error('Error saving certificate to database:', error);
      throw error;
    }
  }

  /**
   * Get a certificate by its number
   * @param {String} certificateNumber - Certificate number
   * @returns {Promise<Object>} Certificate data
   */
  static async getCertificate(certificateNumber) {
    try {
      const certificate = await Certificate.findByCertificateNumber(certificateNumber);
      if (!certificate) {
        throw new Error(`Certificate with number ${certificateNumber} not found`);
      }
      return certificate;
    } catch (error) {
      console.error(`Error getting certificate ${certificateNumber}:`, error);
      throw error;
    }
  }

  /**
   * Clean up expired quotes
   * @returns {Promise<number>} Number of quotes updated
   */
  static async updateExpiredQuotes() {
    try {
      const now = new Date();
      
      const [count] = await Quote.update(
        { status: 'expired' },
        { 
          where: { 
            expiresAt: { [Op.lt]: now },
            status: 'active'
          }
        }
      );
      
      return count;
    } catch (error) {
      console.error('Error updating expired quotes:', error);
      throw error;
    }
  }

  /**
   * Get statistics about the database
   * @returns {Promise<Object>} Database statistics
   */
  static async getStatistics() {
    try {
      const quoteCount = await Quote.count();
      const bookingCount = await Booking.count();
      const certificateCount = await Certificate.count();
      
      const activeQuoteCount = await Quote.count({ where: { status: 'active' } });
      const expiredQuoteCount = await Quote.count({ where: { status: 'expired' } });
      const bookedQuoteCount = await Quote.count({ where: { status: 'booked' } });
      
      const activeBookingCount = await Booking.count({ where: { status: 'active' } });
      
      return {
        quotes: {
          total: quoteCount,
          active: activeQuoteCount,
          expired: expiredQuoteCount,
          booked: bookedQuoteCount
        },
        bookings: {
          total: bookingCount,
          active: activeBookingCount
        },
        certificates: {
          total: certificateCount
        }
      };
    } catch (error) {
      console.error('Error getting database statistics:', error);
      throw error;
    }
  }
}

export default DatabaseService;