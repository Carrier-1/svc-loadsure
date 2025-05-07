'use strict';

/**
 * Migration to fix the SupportTermsOfSales table schema
 * This addresses the issue where the terms of sales data from the API doesn't include IDs
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // First, check if the SupportTermsOfSales table exists
      const tableExists = await queryInterface.sequelize.query(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'SupportTermsOfSales')",
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      
      if (tableExists[0].exists) {
        // Drop the existing table if it exists
        await queryInterface.dropTable('SupportTermsOfSales');
      }
      
      // Recreate the table with the correct schema
      await queryInterface.createTable('SupportTermsOfSales', {
        id: {
          type: Sequelize.STRING,
          primaryKey: true,
          allowNull: false
        },
        name: {
          type: Sequelize.STRING,
          allowNull: true
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        data: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false
        }
      });
      
      console.log('SupportTermsOfSales table has been recreated with the correct schema');
    } catch (error) {
      console.error('Error in migration:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    // No need to revert as this is fixing an existing issue
    console.log('No revert necessary for this migration');
  }
};