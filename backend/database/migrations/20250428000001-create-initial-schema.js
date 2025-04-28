'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create Quotes table
    await queryInterface.createTable('Quotes', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      quoteId: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        comment: 'Quote token from Loadsure API'
      },
      requestId: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Original request ID'
      },
      premium: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      currency: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'USD'
      },
      coverageAmount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      terms: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      deductible: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0
      },
      requestData: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Original freight details from the quote request'
      },
      responseData: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Complete response from Loadsure API'
      },
      status: {
        type: Sequelize.ENUM('active', 'expired', 'booked', 'cancelled'),
        defaultValue: 'active'
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Additional metadata about the quote'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Create Bookings table
    await queryInterface.createTable('Bookings', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      bookingId: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        comment: 'Internal booking ID'
      },
      requestId: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Original request ID'
      },
      quoteId: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Quote token from Loadsure API'
      },
      policyNumber: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        comment: 'Certificate number from Loadsure API'
      },
      certificateUrl: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'URL to download certificate PDF'
      },
      status: {
        type: Sequelize.ENUM('active', 'cancelled', 'expired'),
        defaultValue: 'active'
      },
      premium: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      coverageAmount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true
      },
      requestData: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Original booking request data'
      },
      responseData: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Complete response from Loadsure API'
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Additional metadata'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Create Certificates table
    await queryInterface.createTable('Certificates', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      certificateNumber: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        comment: 'Certificate number from Loadsure API'
      },
      bookingId: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Related booking ID'
      },
      productName: {
        type: Sequelize.STRING,
        allowNull: true
      },
      productId: {
        type: Sequelize.STRING,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('ACTIVE', 'CANCELLED', 'EXPIRED'),
        defaultValue: 'ACTIVE'
      },
      coverageAmount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true
      },
      premium: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      certificateLink: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'URL to download certificate PDF'
      },
      validFrom: {
        type: Sequelize.DATE,
        allowNull: true
      },
      validTo: {
        type: Sequelize.DATE,
        allowNull: true
      },
      requestData: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Original certificate request data'
      },
      responseData: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Complete response from Loadsure API'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Create indexes
    await queryInterface.addIndex('Quotes', ['quoteId'], { unique: true });
    await queryInterface.addIndex('Quotes', ['requestId']);
    await queryInterface.addIndex('Quotes', ['expiresAt']);
    await queryInterface.addIndex('Quotes', ['status']);

    await queryInterface.addIndex('Bookings', ['bookingId'], { unique: true });
    await queryInterface.addIndex('Bookings', ['quoteId']);
    await queryInterface.addIndex('Bookings', ['policyNumber'], { unique: true });
    await queryInterface.addIndex('Bookings', ['status']);

    await queryInterface.addIndex('Certificates', ['certificateNumber'], { unique: true });
    await queryInterface.addIndex('Certificates', ['bookingId']);
    await queryInterface.addIndex('Certificates', ['status']);
  },

  async down(queryInterface, Sequelize) {
    // Drop tables in reverse order to avoid foreign key constraints
    await queryInterface.dropTable('Certificates');
    await queryInterface.dropTable('Bookings');
    await queryInterface.dropTable('Quotes');
  }
};