<template>
    <div class="certificate-display">
      <div class="certificate-card">
        <h3>Certificate Details</h3>
        
        <div class="certificate-details">
          <div class="certificate-row">
            <span class="label">Certificate Number:</span>
            <span class="value">{{ certificate.certificateNumber }}</span>
          </div>
          <div class="certificate-row">
            <span class="label">Product:</span>
            <span class="value">{{ certificate.productName || 'Standard Coverage' }}</span>
          </div>
          <div class="certificate-row">
            <span class="label">Status:</span>
            <span class="value" :class="getStatusClass(certificate.status)">
              {{ certificate.status }}
            </span>
          </div>
          <div class="certificate-row" v-if="certificate.validFrom">
            <span class="label">Valid From:</span>
            <span class="value">{{ formatDate(certificate.validFrom) }}</span>
          </div>
          <div class="certificate-row" v-if="certificate.validTo">
            <span class="label">Valid To:</span>
            <span class="value">{{ formatDate(certificate.validTo) }}</span>
          </div>
          <div class="certificate-row">
            <span class="label">Coverage Amount:</span>
            <span class="value">${{ formatCurrency(certificate.coverageAmount) }}</span>
          </div>
          <div class="certificate-row">
            <span class="label">Premium:</span>
            <span class="value">${{ formatCurrency(certificate.premium) }}</span>
          </div>
        </div>
        
        <div class="certificate-document" v-if="certificate.certificateLink">
          <a :href="certificate.certificateLink" target="_blank" class="document-link">
            <div class="pdf-icon">PDF</div>
            <div class="document-info">
              <div class="document-title">Insurance Certificate</div>
              <div class="document-desc">Download your insurance certificate</div>
            </div>
          </a>
        </div>
        
        <div class="certificate-actions">
          <button @click="startNewQuote" class="primary-btn">Start New Quote</button>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  import emitter from '../eventBus.js';
  
  export default {
    name: 'CertificateDisplay',
    props: {
      certificate: {
        type: Object,
        required: true
      }
    },
    methods: {
      formatDate(date) {
        if (!date) return 'Not specified';
        
        const d = new Date(date);
        return d.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      },
      
      formatCurrency(value) {
        if (value === null || value === undefined) return '0.00';
        return parseFloat(value).toFixed(2);
      },
      
      getStatusClass(status) {
        switch (status) {
          case 'ACTIVE': return 'status-active';
          case 'EXPIRED': return 'status-expired';
          case 'CANCELLED': return 'status-cancelled';
          default: return '';
        }
      },
      
      startNewQuote() {
        this.$emit('start-new-quote');
        emitter.emit('insurance-canceled');
      }
    }
  };
  </script>
  
  <style scoped>
  .certificate-display {
    max-width: 800px;
    margin: 0 auto;
  }
  
  .certificate-card {
    background-color: white;
    padding: 25px;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
  
  h3 {
    margin-top: 0;
    margin-bottom: 20px;
    color: #333;
  }
  
  .certificate-details {
    margin-bottom: 25px;
  }
  
  .certificate-row {
    display: flex;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px solid #eee;
  }
  
  .label {
    font-weight: bold;
    color: #555;
  }
  
  .value {
    font-weight: 500;
  }
  
  .status-active {
    color: #4caf50;
    font-weight: bold;
  }
  
  .status-expired {
    color: #757575;
    font-weight: bold;
  }
  
  .status-cancelled {
    color: #f44336;
    font-weight: bold;
  }
  
  .certificate-document {
    background-color: #f9f9f9;
    padding: 15px;
    border-radius: 8px;
    margin: 20px 0;
  }
  
  .document-link {
    display: flex;
    align-items: center;
    text-decoration: none;
    color: inherit;
  }
  
  .pdf-icon {
    background-color: #f44336;
    color: white;
    padding: 10px 16px;
    border-radius: 4px;
    font-weight: bold;
    font-size: 16px;
    margin-right: 15px;
  }
  
  .document-info {
    flex: 1;
  }
  
  .document-title {
    font-weight: bold;
    margin-bottom: 5px;
    color: #333;
  }
  
  .document-desc {
    font-size: 14px;
    color: #666;
  }
  
  .certificate-actions {
    margin-top: 20px;
    text-align: right;
  }
  
  .primary-btn {
    background-color: #4a6cf7;
    color: white;
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .primary-btn:hover {
    background-color: #3a5bd9;
  }
  </style>