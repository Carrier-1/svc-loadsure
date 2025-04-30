<template>
    <div class="quote-display">
      <div class="quote-card">
        <h3>Insurance Quote</h3>
        <div class="quote-details">
          <div class="quote-row">
            <span class="label">Premium:</span>
            <span class="value">${{ quote.premium.toFixed(2) }}</span>
          </div>
          <!-- Integration fee row (only show if there is an integration fee) -->
          <div class="quote-row" v-if="quote.integrationFeeAmount">
            <span class="label">Integration Fee:</span>
            <span class="value">${{ parseFloat(quote.integrationFeeAmount).toFixed(2) }}</span>
          </div>
          <div class="quote-row">
            <span class="label">Coverage Amount:</span>
            <span class="value">${{ quote.coverageAmount.toFixed(2) }}</span>
          </div>
          <div class="quote-row">
            <span class="label">Coverage Rate:</span>
            <span class="value">{{ (quote.premium / quote.coverageAmount * 100).toFixed(2) }}%</span>
          </div>
          <div class="quote-row">
            <span class="label">Deductible:</span>
            <span class="value">${{ quote.deductible ? quote.deductible.toFixed(2) : '0.00' }}</span>
          </div>
          <div class="quote-row">
            <span class="label">Expires:</span>
            <span class="value">{{ formatDate(quote.expiresAt) }}</span>
          </div>
          <!-- Total row with integration fee included if applicable -->
          <div class="quote-row total">
            <span class="label">Total Cost:</span>
            <span class="value">${{ totalCost }}</span>
          </div>
        </div>
        
        <div class="comparison-table">
          <h4>Protection Comparison</h4>
          <table>
            <tr>
              <th></th>
              <th>With Insurance</th>
              <th>Without Insurance</th>
            </tr>
            <tr>
              <td>Theft Protection</td>
              <td>✓</td>
              <td>✗</td>
            </tr>
            <tr>
              <td>Damage Protection</td>
              <td>✓</td>
              <td>✗</td>
            </tr>
            <tr>
              <td>Natural Disaster</td>
              <td>✓</td>
              <td>✗</td>
            </tr>
            <tr>
              <td>Maximum Payout</td>
              <td>${{ quote.coverageAmount.toFixed(2) }}</td>
              <td>$0.00</td>
            </tr>
            <!-- Add integration fee row if applicable -->
            <tr v-if="quote.integrationFeeAmount">
              <td>Integration Fee</td>
              <td>${{ parseFloat(quote.integrationFeeAmount).toFixed(2) }}</td>
              <td>$0.00</td>
            </tr>
            <!-- Update Your Cost row to include integration fee -->
            <tr>
              <td>Your Cost</td>
              <td>${{ totalCost }}</td>
              <td>$0.00</td>
            </tr>
            <tr>
              <td>Potential Loss</td>
              <td>$0.00</td>
              <td>${{ quote.coverageAmount.toFixed(2) }}</td>
            </tr>
          </table>
        </div>
        
        <div class="terms-box">
          <h4>Terms & Conditions</h4>
          <p>{{ quote.terms }}</p>
        </div>
        
        <div class="quote-actions">
          <button @click="bookInsurance" class="primary-btn">Purchase Insurance</button>
          <button @click="cancelQuote" class="secondary-btn">Decline Insurance</button>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  import emitter from '../eventBus.js';

  export default {
    name: 'QuoteDisplay',
    props: {
      quote: {
        type: Object,
        required: true
      }
    },
    computed: {
      totalCost() {
        // Calculate total cost including integration fee if applicable
        let total = parseFloat(this.quote.premium);
        if (this.quote.integrationFeeAmount) {
          total += parseFloat(this.quote.integrationFeeAmount);
        }
        return total.toFixed(2);
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
      
      bookInsurance() {
        this.$emit('book-insurance');
      },
      
      cancelQuote() {
        this.$emit('cancel-quote');
        emitter.emit('insurance-canceled');
      }
    }
  };
  </script>
  
  <style scoped>
  .quote-display {
    max-width: 800px;
    margin: 0 auto;
  }
  
  .quote-card {
    background-color: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
  
  h3, h4 {
    margin-top: 0;
    margin-bottom: 15px;
    color: #333;
  }
  
  .quote-details {
    margin-bottom: 20px;
  }
  
  .quote-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #eee;
  }
  
  .quote-row.total {
    font-weight: bold;
    font-size: 1.1em;
    border-top: 2px solid #eee;
    border-bottom: none;
    margin-top: 10px;
    padding-top: 10px;
  }
  
  .label {
    font-weight: bold;
    color: #555;
  }
  
  .comparison-table {
    margin-bottom: 20px;
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
  }
  
  th, td {
    padding: 10px;
    text-align: center;
    border-bottom: 1px solid #eee;
  }
  
  th {
    background-color: #f5f5f5;
    font-weight: bold;
  }
  
  /* First column (labels) should be left-aligned */
  table tr td:first-child {
    text-align: left;
    font-weight: 500;
  }
  
  .terms-box {
    background-color: #f9f9f9;
    padding: 15px;
    border-radius: 4px;
    margin-bottom: 20px;
    font-size: 14px;
  }
  
  .quote-actions {
    display: flex;
    justify-content: space-between;
  }
  
  .primary-btn {
    background-color: #4caf50;
    color: white;
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .primary-btn:hover {
    background-color: #3d8b40;
  }
  
  .secondary-btn {
    background-color: #f44336;
    color: white;
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .secondary-btn:hover {
    background-color: #d32f2f;
  }
  </style>