// Corrected migration to be added to the migrations folder
// Name: 20250430000001-fix-certificate-booking-association.cjs

'use strict';

/**
 * Migration to fix the relationship between Certificates and Bookings tables
 * by using string-based keys instead of UUID relationships
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Update existing certificates to ensure bookingId matches
    await queryInterface.sequelize.query(`
      UPDATE "Certificates" 
      SET "bookingId" = (
        SELECT "bookingId" FROM "Bookings" 
        WHERE "Bookings"."policyNumber" = "Certificates"."certificateNumber" 
        LIMIT 1
      )
      WHERE EXISTS (
        SELECT 1 FROM "Bookings" 
        WHERE "Bookings"."policyNumber" = "Certificates"."certificateNumber"
      );
    `);

    console.log('Updated certificates with correct booking IDs');
  },

  async down(queryInterface, Sequelize) {
    console.log('No rollback needed for this migration');
  }
};