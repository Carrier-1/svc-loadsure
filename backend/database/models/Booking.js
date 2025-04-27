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
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Internal booking ID'
    },
    requestId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Original request ID'
    },
    quoteId: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Quote token from Loadsure API'
    },
    policyNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Certificate number from Loadsure API'
    },
    certificateUrl: {
      type: DataTypes.STRING,
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
    Booking.belongsTo(models.Quote, {
      foreignKey: 'quoteId',
      as: 'quote',
      constraints: false, // Don't enforce foreign key constraint at DB level
      // We use the quoteId string, not the Quote.id UUID
    });
    
    Booking.hasOne(models.Certificate, {
      foreignKey: 'bookingId',
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