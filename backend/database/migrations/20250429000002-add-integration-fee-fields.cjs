'use strict';

/**
 * Migration to add integration fee fields to Quotes table
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create ENUM type for integration fee type
    await queryInterface.sequelize.query(
        'CREATE TYPE "enum_Quotes_integrationFeeType" AS ENUM (\'percentage\', \'fixed\');'
        ).catch(error => {
        // If ENUM already exists, ignore the error
        if (error.message.indexOf('already exists') === -1) {
            throw error;
        }
    });
    // Add integrationFeeType column
    await queryInterface.addColumn('Quotes', 'integrationFeeType', {
      type: Sequelize.ENUM('percentage', 'fixed'),
      allowNull: true,
      comment: 'Type of integration fee: percentage or fixed amount'
    });
    
    // Add integrationFeeValue column
    await queryInterface.addColumn('Quotes', 'integrationFeeValue', {
      type: Sequelize.DECIMAL(10, 4),
      allowNull: true,
      comment: 'Value of integration fee (percentage multiplier or fixed amount)'
    });
    
    // Add integrationFeeAmount column
    await queryInterface.addColumn('Quotes', 'integrationFeeAmount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Calculated integration fee amount'
    });
    
    // Add an index on integrationFeeType for faster queries
    await queryInterface.addIndex('Quotes', ['integrationFeeType']);
  },

  async down(queryInterface, Sequelize) {
    // Remove columns in reverse order
    await queryInterface.removeIndex('Quotes', ['integrationFeeType']);
    await queryInterface.removeColumn('Quotes', 'integrationFeeAmount');
    await queryInterface.removeColumn('Quotes', 'integrationFeeValue');
    await queryInterface.removeColumn('Quotes', 'integrationFeeType');

    // Remove ENUM type
    await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_Quotes_integrationFeeType";'
      );
  }
};