<!-- File: src/components/CargoInsurance.vue -->
<template>
    <div class="cargo-insurance">
      <h2>Cargo Insurance</h2>
      
      <!-- Quote Request Form -->
      <div v-if="!quote && !isLoading && !bookingConfirmation" class="insurance-form">
        <div class="form-section">
          <h3>Freight Details</h3>
          <div class="form-group">
            <label for="freight-description">Description</label>
            <input id="freight-description" v-model="freightDetails.description" type="text" placeholder="E.g., Electronics, Furniture, etc.">
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="freight-class">Freight Class</label>
              <select id="freight-class" v-model="freightDetails.class">
                <option value="50">50 - Clean Freight</option>
                <option value="55">55 - Bricks, Cement</option>
                <option value="60">60 - Car Accessories</option>
                <option value="65">65 - Car Parts</option>
                <option value="70">70 - Food Items, Automobile Engines</option>
                <option value="77.5">77.5 - Tires, Bathroom Fixtures</option>
                <option value="85">85 - Crated Machinery</option>
                <option value="92.5">92.5 - Computers, Monitors</option>
                <option value="100">100 - Vacuum Cleaners, Boat Covers</option>
                <option value="110">110 - Cabinets, Framed Artwork</option>
                <option value="125">125 - Small Household Appliances</option>
                <option value="150">150 - Auto Sheet Metal Parts</option>
                <option value="175">175 - Clothing, Couches</option>
                <option value="200">200 - Sheet Metal, Aluminum</option>
                <option value="250">250 - Mattresses, Furniture</option>
                <option value="300">300 - Wooden Cabinets, Tables</option>
                <option value="400">400 - Deer Antlers</option>
                <option value="500">500 - Bags, Clothing</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="freight-value">Value ($)</label>
              <input id="freight-value" v-model.number="freightDetails.value" type="number" min="1" step="1">
            </div>
          </div>
          
          <h4>Dimensions</h4>
          <div class="form-row">
            <div class="form-group">
              <label for="freight-length">Length</label>
              <input id="freight-length" v-model.number="freightDetails.dimensions.length" type="number" min="1" step="1">
            </div>
            
            <div class="form-group">
              <label for="freight-width">Width</label>
              <input id="freight-width" v-model.number="freightDetails.dimensions.width" type="number" min="1" step="1">
            </div>
            
            <div class="form-group">
              <label for="freight-height">Height</label>
              <input id="freight-height" v-model.number="freightDetails.dimensions.height" type="number" min="1" step="1">
            </div>
            
            <div class="form-group">
              <label for="dimensions-unit">Unit</label>
              <select id="dimensions-unit" v-model="freightDetails.dimensions.unit">
                <option value="in">Inches</option>
                <option value="cm">Centimeters</option>
              </select>
            </div>
          </div>
          
          <h4>Weight</h4>
          <div class="form-row">
            <div class="form-group">
              <label for="freight-weight">Weight</label>
              <input id="freight-weight" v-model.number="freightDetails.weight.value" type="number" min="1" step="1">
            </div>
            
            <div class="form-group">
              <label for="weight-unit">Unit</label>
              <select id="weight-unit" v-model="freightDetails.weight.unit">
                <option value="lb">Pounds</option>
                <option value="kg">Kilograms</option>
              </select>
            </div>
          </div>
          
          <h4>Route</h4>
          <div class="form-row">
            <div class="form-group">
              <label for="origin">Origin</label>
              <input id="origin" v-model="freightDetails.origin" type="text" placeholder="City, State">
            </div>
            
            <div class="form-group">
              <label for="destination">Destination</label>
              <input id="destination" v-model="freightDetails.destination" type="text" placeholder="City, State">
            </div>
          </div>
        </div>
        
        <div class="form-actions">
          <button @click="requestQuote" :disabled="!isFormValid">Get Insurance Quote</button>
        </div>
      </div>
      
      <!-- Loading Indicator -->
      <div v-if="isLoading" class="loading">
        <div class="spinner"></div>
        <p>{{ loadingMessage }}</p>
      </div>
      
      <!-- Quote Display -->
      <div v-if="quote && !bookingConfirmation" class="quote-display">
        <div class="quote-card">
          <h3>Insurance Quote</h3>
          <div class="quote-details">
            <div class="quote-row">
              <span class="label">Premium:</span>
              <span class="value">${{ quote.premium.toFixed(2) }}</span>
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
              <span class="label">Expires:</span>
              <span class="value">{{ formatDate(quote.expiresAt) }}</span>
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
              <tr>
                <td>Your Cost</td>
                <td>${{ quote.premium.toFixed(2) }}</td>
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
      
      <!-- Booking Confirmation -->
      <div v-if="bookingConfirmation" class="booking-confirmation">
        <div class="confirmation-card">
          <div class="confirmation-icon">✓</div>
          <h3>Insurance Purchased Successfully!</h3>
          <div class="confirmation-details">
            <div class="confirmation-row">
              <span class="label">Policy Number:</span>
              <span class="value">{{ bookingConfirmation.policyNumber }}</span>
            </div>
            <div class="confirmation-row">
              <span class="label">Certificate:</span>
              <span class="value">
                <a :href="bookingConfirmation.certificateUrl" target="_blank">View Certificate</a>
              </span>
            </div>
          </div>
          <div class="confirmation-message">
            <p>Your cargo is now protected against damage, theft, and other covered events during transit.</p>
            <p>A copy of your insurance certificate has been emailed to you for your records.</p>
          </div>
          <div class="confirmation-actions">
            <button @click="resetForm" class="primary-btn">Done</button>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    name: 'CargoInsurance',
    data() {
      return {
        isLoading: false,
        loadingMessage: '',
        quote: null,
        bookingConfirmation: null,
        freightDetails: {
          description: '',
          class: '100',
          value: 10000,
          currency: 'USD',
          dimensions: {
            length: 48,
            width: 40,
            height: 48,
            unit: 'in'
          },
          weight: {
            value: 500,
            unit: 'lb'
          },
          origin: '',
          destination: ''
        }
      };
    },
    computed: {
      isFormValid() {
        const { freightDetails } = this;
        return (
          freightDetails.description &&
          freightDetails.class &&
          freightDetails.value > 0 &&
          freightDetails.dimensions.length > 0 &&
          freightDetails.dimensions.width > 0 &&
          freightDetails.dimensions.height > 0 &&
          freightDetails.weight.value > 0 &&
          freightDetails.origin &&
          freightDetails.destination
        );
      }
    },
    methods: {
      async requestQuote() {
        if (!this.isFormValid) return;
        
        this.isLoading = true;
        this.loadingMessage = 'Getting insurance quote...';
        
        try {
          // Call backend API
          const response = await fetch('http://localhost:3000/api/insurance/quotes', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(this.freightDetails)
          });
          
          if (!response.ok) {
            throw new Error(`Failed to get quote: ${response.statusText}`);
          }
          
          const data = await response.json();
          
          if (data.status === 'success' && data.quote) {
            // Convert expiresAt string to Date object
            data.quote.expiresAt = new Date(data.quote.expiresAt);
            this.quote = data.quote;
          } else {
            throw new Error('Invalid quote response');
          }
        } catch (error) {
          console.error('Error getting quote:', error);
          alert(`Failed to get insurance quote: ${error.message}`);
        } finally {
          this.isLoading = false;
        }
      },
      
      async bookInsurance() {
        if (!this.quote) return;
        
        this.isLoading = true;
        this.loadingMessage = 'Processing your insurance purchase...';
        
        try {
          // Call backend API
          const response = await fetch('http://localhost:3000/api/insurance/bookings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              quoteId: this.quote.quoteId
            })
          });
          
          if (!response.ok) {
            throw new Error(`Failed to book insurance: ${response.statusText}`);
          }
          
          const data = await response.json();
          
          if (data.status === 'success' && data.booking) {
            this.bookingConfirmation = data.booking;
          } else {
            throw new Error('Invalid booking response');
          }
        } catch (error) {
          console.error('Error booking insurance:', error);
          alert(`Failed to book insurance: ${error.message}`);
        } finally {
          this.isLoading = false;
        }
      },
      
      cancelQuote() {
        this.quote = null;
      },
      
      resetForm() {
        this.quote = null;
        this.bookingConfirmation = null;
        this.freightDetails = {
          description: '',
          class: '100',
          value: 10000,
          currency: 'USD',
          dimensions: {
            length: 48,
            width: 40,
            height: 48,
            unit: 'in'
          },
          weight: {
            value: 500,
            unit: 'lb'
          },
          origin: '',
          destination: ''
        };
      },
      
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
      }
    }
  };
  </script>
  
  <style scoped>
  .cargo-insurance {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    font-family: Arial, sans-serif;
  }
  
  .form-section {
    background-color: #f9f9f9;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 20px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .form-group {
    margin-bottom: 15px;
  }
  
  .form-row {
    display: flex;
    gap: 15px;
    margin-bottom: 15px;
  }
  
  label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
  }
  
  input, select {
    width: 100%;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
  }
  
  h3, h4 {
    margin-top: 0;
    margin-bottom: 15px;
    color: #333;
  }
  
  h4 {
    margin-top: 20px;
  }
  
  .form-actions {
    text-align: right;
  }
  
  button {
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  button:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
  
  .form-actions button {
    background-color: #4a6cf7;
    color: white;
  }
  
  .form-actions button:hover:not(:disabled) {
    background-color: #3451d1;
  }
  
  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
  }
  
  .spinner {
    border: 4px solid rgba(0, 0, 0, 0.1);
    border-radius: 50%;
    border-top: 4px solid #4a6cf7;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
    margin-bottom: 15px;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .quote-card, .confirmation-card {
    background-color: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
  
  .quote-details, .confirmation-details {
    margin-bottom: 20px;
  }
  
  .quote-row, .confirmation-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #eee;
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
  }
  
  .primary-btn:hover {
    background-color: #3d9140;
  }
  
  .secondary-btn {
    background-color: #f44336;
    color: white;
  }
  
  .secondary-btn:hover {
    background-color: #d32f2f;
  }
  
  .confirmation-card {
    text-align: center;
  }
  
  .confirmation-icon {
    font-size: 48px;
    color: #4caf50;
    margin-bottom: 20px;
  }
  
  .confirmation-message {
    margin: 20px 0;
    color: #555;
  }
  
  .confirmation-actions {
    margin-top: 20px;
  }
  </style>