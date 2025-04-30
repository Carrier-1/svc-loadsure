// backend/database/models/Booking.js
import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Booking = sequelize.define('Booking', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    bookingId: {
      type: DataTypes.STRING(1000), // Increased length
      allowNull: false,
      comment: 'Internal booking ID'
    },
    requestId: {
      type: DataTypes.STRING(1000), // Increased length
      allowNull: true,
      comment: 'Original request ID'
    },
    quoteId: {
      type: DataTypes.STRING(1000), // Increased length
      allowNull: false,
      comment: 'Quote token from Loadsure API'
    },
    policyNumber: {
      type: DataTypes.STRING(1000), // Increased length
      allowNull: false,
      comment: 'Certificate number from Loadsure API'
    },
    certificateUrl: {
      type: DataTypes.TEXT, // Increased length for URLs
      allowNull: true,
      comment: 'URL to download certificate PDF'
    },
    status: {
      type: DataTypes.ENUM('active', 'cancelled', 'expired'),
      defaultValue: 'active'
    },
    premium: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    coverageAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true
    },
    requestData: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Original booking request data'
    },
    responseData: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Complete response from Loadsure API'
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Additional metadata'
    }
  }, {
    // Table options
    timestamps: true, 
    paranoid: true, // Soft deletes
    indexes: [
      {
        fields: ['bookingId'],
        unique: true
      },
      {
        fields: ['quoteId']
      },
      {
        fields: ['policyNumber'],
        unique: true
      },
      {
        fields: ['status']
      }
    ]
  });

  // Associations
  Booking.associate = (models) => {
    // Modified association - using bookingId string instead of UUID for relationship
    Booking.belongsTo(models.Quote, {
      foreignKey: 'quoteId',
      targetKey: 'quoteId', // Use quoteId string field instead of Quote.id UUID
      as: 'quote',
      constraints: false // Don't enforce foreign key constraint at DB level
    });
    
    // Modified association - using bookingId string instead of UUID for relationship
    Booking.hasOne(models.Certificate, {
      foreignKey: 'bookingId',
      sourceKey: 'bookingId', // Use bookingId string field instead of Booking.id UUID
      as: 'certificate'
    });
  };

  // Class methods
  Booking.findByPolicyNumber = async function(policyNumber) {
    return await this.findOne({
      where: { policyNumber }
    });
  };

  Booking.findByBookingId = async function(bookingId) {
    return await this.findOne({
      where: { bookingId }
    });
  };

  // Hooks
  Booking.afterCreate(async (booking, options) => {
    // Update the quote status to booked
    try {
      const Quote = sequelize.models.Quote;
      await Quote.update(
        { status: 'booked' },
        { 
          where: { quoteId: booking.quoteId },
          transaction: options.transaction 
        }
      );
    } catch (error) {
      console.error('Error updating quote status after booking:', error);
    }
  });

  return Booking;
};