<template>
    <div class="confirmation-display">
      <div class="confirmation-card">
        <div class="confirmation-icon">✓</div>
        <h3>Insurance Booked Successfully!</h3>
        
        <div class="confirmation-details">
          <div class="confirmation-row">
            <span class="label">Policy Number:</span>
            <span class="value">{{ bookingConfirmation.policyNumber }}</span>
          </div>
          <div class="confirmation-row">
            <span class="label">Booking ID:</span>
            <span class="value">{{ bookingConfirmation.bookingId }}</span>
          </div>
          <div class="confirmation-row">
            <span class="label">Booked On:</span>
            <span class="value">{{ formatDate(bookingConfirmation.timestamp) }}</span>
          </div>
        </div>
        
        <div class="confirmation-message">
          <p>Your cargo is now insured. A confirmation email has been sent with all the details.</p>
        </div>
        
        <div class="certificate-document" v-if="bookingConfirmation.certificateUrl">
          <a :href="bookingConfirmation.certificateUrl" target="_blank" class="document-link">
            <div class="pdf-icon">PDF</div>
            <div class="document-info">
              <div class="document-title">Insurance Certificate</div>
              <div class="document-desc">Download your insurance certificate</div>
            </div>
          </a>
        </div>
        
        <div class="confirmation-actions">
          <button @click="startNewQuote" class="primary-btn">Start New Quote</button>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  import emitter from '../eventBus.js';

  export default {
    name: 'BookingConfirmation',
    props: {
      bookingConfirmation: {
        type: Object,
        required: true
      }
    },
    methods: {
      formatDate(date) {
        if (!date) return '';
        
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
      
      startNewQuote() {
        this.$emit('start-new-quote');
        emitter.emit('insurance-canceled');
      }
    }
  };
  </script>
  
  <style scoped>
  .confirmation-display {
    max-width: 800px;
    margin: 0 auto;
  }
  
  .confirmation-card {
    background-color: white;
    padding: 30px;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    text-align: center;
  }
  
  .confirmation-icon {
    font-size: 48px;
    line-height: 1;
    height: 80px;
    width: 80px;
    border-radius: 50%;
    background-color: #4caf50;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
  }
  
  h3 {
    margin-top: 0;
    margin-bottom: 25px;
    color: #333;
    font-size: 22px;
  }
  
  .confirmation-details {
    max-width: 500px;
    margin: 0 auto 25px;
    text-align: left;
  }
  
  .confirmation-row {
    display: flex;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px solid #eee;
  }
  
  .label {
    font-weight: bold;
    color: #555;
  }
  
  .value {
    font-family: 'Courier New', monospace;
    font-weight: 500;
  }
  
  .confirmation-message {
    margin: 25px 0;
    padding: 15px;
    background-color: #e8f5e9;
    border-radius: 6px;
    max-width: 500px;
    margin-left: auto;
    margin-right: auto;
  }
  
  .confirmation-message p {
    margin: 0;
    color: #2e7d32;
  }
  
  .certificate-document {
    background-color: #f9f9f9;
    padding: 15px;
    border-radius: 8px;
    max-width: 500px;
    margin: 0 auto 30px;
    text-align: left;
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
  
  .confirmation-actions {
    margin-top: 20px;
  }
  
  .primary-btn {
    background-color: #4a6cf7;
    color: white;
    padding: 10px 25px;
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