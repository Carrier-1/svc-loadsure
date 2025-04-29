'use strict';

/**
 * Migration to increase field lengths in existing tables to handle longer values
 * This modifies all VARCHAR fields that might need more capacity
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Modify Quotes table columns
    await queryInterface.changeColumn('Quotes', 'quoteId', {
      type: Sequelize.STRING(1000),
      allowNull: false
    });
    
    await queryInterface.changeColumn('Quotes', 'requestId', {
      type: Sequelize.STRING(1000),
      allowNull: true
    });
    
    // Change terms to TEXT type for unlimited length
    await queryInterface.changeColumn('Quotes', 'terms', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    
    // Modify Bookings table columns
    await queryInterface.changeColumn('Bookings', 'bookingId', {
      type: Sequelize.STRING(1000),
      allowNull: false
    });
    
    await queryInterface.changeColumn('Bookings', 'requestId', {
      type: Sequelize.STRING(1000),
      allowNull: true
    });
    
    await queryInterface.changeColumn('Bookings', 'quoteId', {
      type: Sequelize.STRING(1000), 
      allowNull: false
    });
    
    await queryInterface.changeColumn('Bookings', 'policyNumber', {
      type: Sequelize.TEXT,
      allowNull: false
    });
    
    await queryInterface.changeColumn('Bookings', 'certificateUrl', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    
    // Modify Certificates table columns
    await queryInterface.changeColumn('Certificates', 'certificateNumber', {
      type: Sequelize.STRING(1000),
      allowNull: false
    });
    
    await queryInterface.changeColumn('Certificates', 'bookingId', {
      type: Sequelize.STRING(1000),
      allowNull: true
    });
    
    await queryInterface.changeColumn('Certificates', 'productName', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    
    await queryInterface.changeColumn('Certificates', 'productId', {
      type: Sequelize.STRING(1000),
      allowNull: true
    });
    
    await queryInterface.changeColumn('Certificates', 'certificateLink', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    // Revert changes if needed
    // Note: Reverting could potentially cause data loss if longer values have been stored
    
    // Revert Quotes table columns
    await queryInterface.changeColumn('Quotes', 'quoteId', {
      type: Sequelize.STRING(255),
      allowNull: false
    });
    
    await queryInterface.changeColumn('Quotes', 'requestId', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
    
    await queryInterface.changeColumn('Quotes', 'terms', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
    
    // Revert Bookings table columns
    await queryInterface.changeColumn('Bookings', 'bookingId', {
      type: Sequelize.STRING(255),
      allowNull: false
    });
    
    await queryInterface.changeColumn('Bookings', 'requestId', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
    
    await queryInterface.changeColumn('Bookings', 'quoteId', {
      type: Sequelize.STRING(255), 
      allowNull: false
    });
    
    await queryInterface.changeColumn('Bookings', 'policyNumber', {
      type: Sequelize.STRING(255),
      allowNull: false
    });
    
    await queryInterface.changeColumn('Bookings', 'certificateUrl', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
    
    // Revert Certificates table columns
    await queryInterface.changeColumn('Certificates', 'certificateNumber', {
      type: Sequelize.STRING(255),
      allowNull: false
    });
    
    await queryInterface.changeColumn('Certificates', 'bookingId', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
    
    await queryInterface.changeColumn('Certificates', 'productName', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
    
    await queryInterface.changeColumn('Certificates', 'productId', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
    
    await queryInterface.changeColumn('Certificates', 'certificateLink', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
  }
};