// backend/database/models/Quote.js
import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Quote = sequelize.define('Quote', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    quoteId: {
      type: DataTypes.STRING(1000), // Increased to handle longer values
      allowNull: false,
      comment: 'Quote token from Loadsure API'
    },
    requestId: {
      type: DataTypes.STRING(1000), // Increased to handle longer values
      allowNull: true,
      comment: 'Original request ID'
    },
    premium: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'USD'
    },
    coverageAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    terms: {
      type: DataTypes.TEXT, // Changed to TEXT instead of STRING
      allowNull: true
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    deductible: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0
    },
    // New fields for integration fee
    integrationFeeType: {
      type: DataTypes.ENUM('percentage', 'fixed'),
      allowNull: true,
      comment: 'Type of integration fee: percentage or fixed amount'
    },
    integrationFeeValue: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: true,
      comment: 'Value of integration fee (percentage multiplier or fixed amount)'
    },
    integrationFeeAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Calculated integration fee amount'
    },
    // Original request data stored in this column
    requestData: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Original freight details from the quote request'
    },
    // API response data stored in this column
    responseData: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Complete response from Loadsure API'
    },
    status: {
      type: DataTypes.ENUM('active', 'expired', 'booked', 'cancelled'),
      defaultValue: 'active'
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Additional metadata about the quote'
    }
  }, {
    // Table options
    timestamps: true,
    paranoid: true, // Soft deletes
    indexes: [
      {
        fields: ['quoteId'],
        unique: true
      },
      {
        fields: ['requestId']
      },
      {
        fields: ['expiresAt']
      },
      {
        fields: ['status']
      }
    ]
  });

  // Associations
  Quote.associate = (models) => {
    Quote.hasOne(models.Booking, {
      foreignKey: 'quoteId',
      as: 'booking'
    });
  };

  // Class methods
  Quote.findByQuoteId = async function(quoteId) {
    return await this.findOne({
      where: { quoteId }
    });
  };

  // Hooks
  Quote.beforeCreate((quote) => {
    // Set expiration status if needed
    if (quote.expiresAt < new Date()) {
      quote.status = 'expired';
    }

    // Calculate integration fee amount if not already calculated
    if (quote.integrationFeeType && quote.integrationFeeValue && quote.premium && !quote.integrationFeeAmount) {
      if (quote.integrationFeeType === 'percentage') {
        // For percentage, multiply premium by the percentage value
        quote.integrationFeeAmount = parseFloat(quote.premium) * parseFloat(quote.integrationFeeValue);
      } else if (quote.integrationFeeType === 'fixed') {
        // For fixed amount, just use the value directly
        quote.integrationFeeAmount = parseFloat(quote.integrationFeeValue);
      }
      // Round to 2 decimal places
      quote.integrationFeeAmount = parseFloat(quote.integrationFeeAmount).toFixed(2);
    }
  });

  return Quote;
};