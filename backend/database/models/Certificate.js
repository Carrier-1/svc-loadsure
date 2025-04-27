// backend/database/models/Certificate.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Certificate = sequelize.define('Certificate', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    certificateNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: 'Certificate number from Loadsure API'
    },
    bookingId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Related booking ID'
    },
    productName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    productId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'CANCELLED', 'EXPIRED'),
      defaultValue: 'ACTIVE'
    },
    coverageAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true
    },
    premium: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    certificateLink: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'URL to download certificate PDF'
    },
    validFrom: {
      type: DataTypes.DATE,
      allowNull: true
    },
    validTo: {
      type: DataTypes.DATE,
      allowNull: true
    },
    requestData: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Original certificate request data'
    },
    responseData: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Complete response from Loadsure API'
    }
  }, {
    // Table options
    timestamps: true,
    paranoid: true, // Soft deletes
    indexes: [
      {
        fields: ['certificateNumber'],
        unique: true
      },
      {
        fields: ['bookingId']
      },
      {
        fields: ['status']
      }
    ]
  });

  // Associations
  Certificate.associate = (models) => {
    Certificate.belongsTo(models.Booking, {
      foreignKey: 'bookingId',
      as: 'booking',
      constraints: false // Don't enforce foreign key constraint at DB level
    });
  };

  // Class methods
  Certificate.findByCertificateNumber = async function(certificateNumber) {
    return await this.findOne({
      where: { certificateNumber }
    });
  };

  // Instance methods
  Certificate.prototype.isActive = function() {
    if (this.status !== 'ACTIVE') return false;
    
    const now = new Date();
    if (this.validFrom && this.validTo) {
      return this.validFrom <= now && now <= this.validTo;
    }
    
    return true;
  };

  return Certificate;
};