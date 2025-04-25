<!-- File: src/components/CargoInsurance.vue -->
<template>
  <div class="cargo-insurance">
    <h2>Cargo Insurance</h2>
    
    <!-- Error Message -->
    <div v-if="supportDataError" class="error-message">
      <p>{{ supportDataError }}</p>
      <button @click="refreshSupportData" class="refresh-btn">Refresh Data</button>
    </div>
    
    <!-- Quote Request Form -->
    <div v-if="!quote && !isLoading && !bookingConfirmation && !certificate" class="insurance-form">
      <div class="form-section">
        <h3>Freight Details</h3>
        <div class="form-group">
          <label for="freight-description">Description</label>
          <input id="freight-description" v-model="freightDetails.description" type="text" placeholder="E.g., Electronics, Furniture, etc.">
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="freight-class">Freight Class</label>
            <select id="freight-class" v-model="freightDetails.freightClass">
              <option v-for="freightClass in freightClasses" :key="freightClass.id" :value="freightClass.id">
                {{ freightClass.name }}
              </option>
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
            <input id="freight-length" v-model.number="freightDetails.dimensionLength" type="number" min="1" step="1">
          </div>
          
          <div class="form-group">
            <label for="freight-width">Width</label>
            <input id="freight-width" v-model.number="freightDetails.dimensionWidth" type="number" min="1" step="1">
          </div>
          
          <div class="form-group">
            <label for="freight-height">Height</label>
            <input id="freight-height" v-model.number="freightDetails.dimensionHeight" type="number" min="1" step="1">
          </div>
          
          <div class="form-group">
            <label for="dimensions-unit">Unit</label>
            <select id="dimensions-unit" v-model="freightDetails.dimensionUnit">
              <option value="in">Inches</option>
              <option value="cm">Centimeters</option>
            </select>
          </div>
        </div>
        
        <h4>Weight</h4>
        <div class="form-row">
          <div class="form-group">
            <label for="freight-weight">Weight</label>
            <input id="freight-weight" v-model.number="freightDetails.weightValue" type="number" min="1" step="1">
          </div>
          
          <div class="form-group">
            <label for="weight-unit">Unit</label>
            <select id="weight-unit" v-model="freightDetails.weightUnit">
              <option value="lbs">Pounds</option>
              <option value="kgs">Kilograms</option>
            </select>
          </div>
        </div>
        
        <h4>Equipment Type</h4>
        <div class="form-row">
          <div class="form-group">
            <label for="equipment-type">Equipment Type</label>
            <select id="equipment-type" v-model="freightDetails.equipmentTypeId">
              <option v-for="equipmentType in equipmentTypes" :key="equipmentType.id" :value="equipmentType.id">
                {{ equipmentType.name }}
              </option>
            </select>
          </div>
        </div>
        
        <h4>Route</h4>
        <div class="form-row">
          <div class="form-group">
            <label for="origin-city">Origin City</label>
            <input id="origin-city" v-model="freightDetails.originCity" type="text" placeholder="City">
          </div>
          
          <div class="form-group">
            <label for="origin-state">Origin State</label>
            <input id="origin-state" v-model="freightDetails.originState" type="text" placeholder="State">
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="destination-city">Destination City</label>
            <input id="destination-city" v-model="freightDetails.destinationCity" type="text" placeholder="City">
          </div>
          
          <div class="form-group">
            <label for="destination-state">Destination State</label>
            <input id="destination-state" v-model="freightDetails.destinationState" type="text" placeholder="State">
          </div>
        </div>
        
        <h4>Commodity</h4>
        <div class="form-row">
          <div class="form-group">
            <label for="commodity">Commodity</label>
            <select id="commodity" v-model="freightDetails.commodityId">
              <option v-for="commodity in commodities" :key="commodity.id" :value="commodity.id">
                {{ commodity.name }}
              </option>
            </select>
            
            <!-- Show exclusions for selected commodity if any -->
            <div v-if="selectedCommodityHasExclusions" class="exclusion-warning">
              <p>Please note: This commodity has exclusions or restrictions.</p>
              <ul>
                <li v-for="(exclusion, index) in commodityExclusionsForSelected" :key="index">
                  {{ exclusion.name }}
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        <h4>Load Type</h4>
        <div class="form-row">
          <div class="form-group">
            <label for="load-type">Load Type</label>
            <select id="load-type" v-model="freightDetails.loadTypeId">
              <option v-for="loadType in loadTypes" :key="loadType.id" :value="loadType.id">
                {{ loadType.name }}
              </option>
            </select>
          </div>
        </div>
        
        <!-- Carrier Information -->
        <h4>Carrier Information (Optional)</h4>
        <div class="form-row">
          <div class="form-group">
            <label for="carrier-name">Carrier Name</label>
            <input id="carrier-name" v-model="freightDetails.carrierName" type="text" placeholder="Carrier Name">
          </div>
          
          <div class="form-group">
            <label for="carrier-dot">DOT Number</label>
            <input id="carrier-dot" v-model="freightDetails.carrierDotNumber" type="text" placeholder="DOT Number">
          </div>
        </div>
        
        <!-- User / Assured Information -->
        <h4>User Information (Optional)</h4>
        <div class="form-row">
          <div class="form-group">
            <label for="user-name">Your Name</label>
            <input id="user-name" v-model="freightDetails.userName" type="text" placeholder="Your Name">
          </div>
          
          <div class="form-group">
            <label for="user-email">Your Email</label>
            <input id="user-email" v-model="freightDetails.userEmail" type="email" placeholder="Your Email">
          </div>
        </div>
        
        <h4>Assured Information (Optional)</h4>
        <div class="form-row">
          <div class="form-group">
            <label for="assured-name">Company Name</label>
            <input id="assured-name" v-model="freightDetails.assuredName" type="text" placeholder="Company Name">
          </div>
          
          <div class="form-group">
            <label for="assured-email">Company Email</label>
            <input id="assured-email" v-model="freightDetails.assuredEmail" type="email" placeholder="Company Email">
          </div>
        </div>
      </div>
      
      <div class="form-actions">
        <button @click="requestQuote" :disabled="!isFormValid || isDataLoading">Get Insurance Quote</button>
      </div>
      
      <!-- Last updated info -->
      <div class="last-updated-info" v-if="lastUpdated">
        <p>Reference data last updated: {{ formatLastUpdated }}</p>
      </div>
      
      <!-- Certificate lookup form -->
      <div class="certificate-lookup">
        <h3>Already have insurance?</h3>
        <div class="form-row">
          <div class="form-group">
            <label for="certificate-number">Certificate Number</label>
            <input id="certificate-number" v-model="certificateNumber" type="text" placeholder="Enter certificate number">
          </div>
          <div class="form-group">
            <button @click="getCertificate" :disabled="!certificateNumber" class="secondary-btn">View Certificate</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Loading Indicator -->
    <div v-if="isLoading" class="loading">
      <div class="spinner"></div>
      <p>{{ loadingMessage }}</p>
    </div>
    
    <!-- Quote Display -->
    <div v-if="quote && !bookingConfirmation && !certificate" class="quote-display">
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
            <span class="label">Deductible:</span>
            <span class="value">${{ quote.deductible ? quote.deductible.toFixed(2) : '0.00' }}</span>
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
    <div v-if="bookingConfirmation && !certificate" class="booking-confirmation">
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
    
    <!-- Certificate Display -->
    <div v-if="certificate" class="certificate-display">
      <div class="certificate-card">
        <h3>Insurance Certificate</h3>
        <div class="certificate-details">
          <div class="certificate-row">
            <span class="label">Certificate Number:</span>
            <span class="value">{{ certificate.certificateNumber }}</span>
          </div>
          <div class="certificate-row">
            <span class="label">Policy Name:</span>
            <span class="value">{{ certificate.productName }}</span>
          </div>
          <div class="certificate-row">
            <span class="label">Status:</span>
            <span class="value" :class="certificate.status === 'ACTIVE' ? 'status-active' : 'status-inactive'">
              {{ certificate.status }}
            </span>
          </div>
          <div class="certificate-row">
            <span class="label">Coverage Amount:</span>
            <span class="value">${{ certificate.coverageAmount ? certificate.coverageAmount.toFixed(2) : '0.00' }}</span>
          </div>
          <div class="certificate-row" v-if="certificate.premium">
            <span class="label">Premium:</span>
            <span class="value">${{ certificate.premium.toFixed(2) }}</span>
          </div>
        </div>
        
        <div v-if="certificate.certificateLink" class="certificate-document">
          <h4>Certificate Document</h4>
          <a :href="certificate.certificateLink" target="_blank" class="document-link">
            <div class="pdf-icon">PDF</div>
            <div class="document-info">
              <div class="document-title">Insurance Certificate</div>
              <div class="document-desc">View or download your certificate</div>
            </div>
          </a>
        </div>
        
        <div class="certificate-actions">
          <button @click="resetForm" class="secondary-btn">Back to Form</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex';

export default {
  name: 'CargoInsurance',
  data() {
    return {
      isLoading: false,
      loadingMessage: '',
      quote: null,
      bookingConfirmation: null,
      certificate: null,
      certificateNumber: '',
      
      // Form data using primitives for simpler API
      freightDetails: {
        description: '',
        freightClass: '',
        value: 10000,
        currency: 'USD',
        dimensionLength: 48,
        dimensionWidth: 40,
        dimensionHeight: 48,
        dimensionUnit: 'in',
        weightValue: 500,
        weightUnit: 'lbs',
        commodityId: null,
        loadTypeId: null,
        equipmentTypeId: null,
        originCity: '',
        originState: '',
        destinationCity: '',
        destinationState: '',
        carrierName: '',
        carrierEmail: '',
        carrierPhone: '',
        carrierDotNumber: '',
        userName: '',
        userEmail: '',
        assuredName: '',
        assuredEmail: ''
      }
    };
  },
  computed: {
    ...mapState('supportData', {
      isDataLoading: 'loading',
      supportDataError: 'error',
      lastUpdated: 'lastUpdated'
    }),
    
    ...mapGetters('supportData', [
      'getCommodities',
      'getCommodityExclusions',
      'getEquipmentTypes',
      'getLoadTypes',
      'getFreightClasses',
      'getTermsOfSales'
    ]),
    
    commodities() {
      return this.getCommodities;
    },
    
    commodityExclusions() {
      return this.getCommodityExclusions;
    },
    
    equipmentTypes() {
      return this.getEquipmentTypes;
    },
    
    loadTypes() {
      return this.getLoadTypes;
    },
    
    freightClasses() {
      return this.getFreightClasses;
    },
    
    termsOfSales() {
      return this.getTermsOfSales;
    },
    
    isFormValid() {
      const { freightDetails } = this;
      return (
        freightDetails.description &&
        freightDetails.freightClass &&
        freightDetails.value > 0 &&
        freightDetails.originCity &&
        freightDetails.originState &&
        freightDetails.destinationCity &&
        freightDetails.destinationState
      );
    },
    
    selectedCommodityHasExclusions() {
      return this.commodityExclusionsForSelected.length > 0;
    },
    
    commodityExclusionsForSelected() {
      // In a real implementation, you would check if the selected commodity
      // has any exclusions based on the data from the API
      // This is a simplified example
      return this.freightDetails.commodityId ? 
        this.commodityExclusions.filter(e => e.id === 'related-to-commodity-' + this.freightDetails.commodityId) : 
        [];
    },
    
    formatLastUpdated() {
      if (!this.lastUpdated) return '';
      
      return new Date(this.lastUpdated).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
  },
  mounted() {
    // Load support data when component mounts
    this.loadSupportData();
  },
  watch: {
    // When support data is loaded, set default values
    freightClasses(newClasses) {
      if (newClasses.length > 0 && !this.freightDetails.freightClass) {
        this.freightDetails.freightClass = newClasses[0].id;
      }
    },
    commodities(newCommodities) {
      if (newCommodities.length > 0 && !this.freightDetails.commodityId) {
        this.freightDetails.commodityId = newCommodities[0].id;
      }
    },
    loadTypes(newLoadTypes) {
      if (newLoadTypes.length > 0 && !this.freightDetails.loadTypeId) {
        this.freightDetails.loadTypeId = newLoadTypes[0].id;
      }
    },
    equipmentTypes(newEquipmentTypes) {
      if (newEquipmentTypes.length > 0 && !this.freightDetails.equipmentTypeId) {
        this.freightDetails.equipmentTypeId = newEquipmentTypes[0].id;
      }
    }
  },
  methods: {
    ...mapActions('supportData', {
      fetchSupportData: 'fetchSupportData',
      refreshSupportDataAction: 'refreshSupportData'
    }),
    
    loadSupportData() {
      this.fetchSupportData();
    },
    
    refreshSupportData() {
      this.refreshSupportDataAction();
    },
    
    async requestQuote() {
      if (!this.isFormValid) return;
      
      this.isLoading = true;
      this.loadingMessage = 'Getting insurance quote...';
      
      try {
        // Call backend API using the new simplified endpoint
        const response = await fetch('http://localhost:3000/api/insurance/quotes/simple', {
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
    
    async getCertificate() {
      if (!this.certificateNumber) return;
      
      this.isLoading = true;
      this.loadingMessage = 'Retrieving certificate...';
      
      try {
        // Call backend API to get certificate details
        const response = await fetch('http://localhost:3000/api/insurance/certificates', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            certificateNumber: this.certificateNumber,
            userId: this.freightDetails.userEmail || 'user@example.com'
          })
        });
        
        if (!response.ok) {
          throw new Error(`Failed to retrieve certificate: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'success' && data.certificate) {
          this.certificate = data.certificate;
          this.quote = null;
          this.bookingConfirmation = null;
        } else {
          throw new Error('Invalid certificate response');
        }
      } catch (error) {
        console.error('Error retrieving certificate:', error);
        alert(`Failed to retrieve certificate: ${error.message}`);
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
      this.certificate = null;
      this.certificateNumber = '';
      
      // Reset form data with default values from loaded data
      this.freightDetails = {
        description: '',
        freightClass: this.freightClasses.length > 0 ? this.freightClasses[0].id : '',
        value: 10000,
        currency: 'USD',
        dimensionLength: 48,
        dimensionWidth: 40,
        dimensionHeight: 48,
        dimensionUnit: 'in',
        weightValue: 500,
        weightUnit: 'lbs',
        commodityId: this.commodities.length > 0 ? this.commodities[0].id : null,
        loadTypeId: this.loadTypes.length > 0 ? this.loadTypes[0].id : null,
        equipmentTypeId: this.equipmentTypes.length > 0 ? this.equipmentTypes[0].id : null,
        originCity: '',
        originState: '',
        destinationCity: '',
        destinationState: '',
        carrierName: '',
        carrierEmail: '',
        carrierPhone: '',
        carrierDotNumber: '',
        userName: '',
        userEmail: '',
        assuredName: '',
        assuredEmail: ''
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

.error-message {
  background-color: #fff3f3;
  border-left: 4px solid #f44336;
  padding: 15px;
  margin-bottom: 20px;
  border-radius: 4px;
}

.error-message p {
  margin: 0 0 10px 0;
  color: #d32f2f;
}

.refresh-btn {
  background-color: #f44336;
  color: white;
  padding: 5px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.refresh-btn:hover {
  background-color: #d32f2f;
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

.exclusion-warning {
  background-color: #fff9e6;
  border-left: 4px solid #ffc107;
  padding: 10px;
  margin-top: 10px;
  border-radius: 4px;
  font-size: 14px;
}

.exclusion-warning p {
  margin: 0 0 5px 0;
  font-weight: bold;
  color: #856404;
}

.exclusion-warning ul {
  margin: 0;
  padding-left: 20px;
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

.quote-card, .confirmation-card, .certificate-card {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.quote-details, .confirmation-details, .certificate-details {
  margin-bottom: 20px;
}

.quote-row, .confirmation-row, .certificate-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

.label {
  font-weight: bold;
  color: #555;
}

.status-active {
  color: #4caf50;
  font-weight: bold;
}

.status-inactive {
  color: #f44336;
  font-weight: bold;
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

.quote-actions, .certificate-actions {
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

.confirmation-card, .certificate-card {
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

.last-updated-info {
  text-align: right;
  font-size: 12px;
  color: #777;
  margin-top: 10px;
}

.certificate-lookup {
  background-color: #f0f8ff;
  padding: 20px;
  border-radius: 8px;
  margin-top: 30px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.certificate-lookup h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #2c3e50;
}

.certificate-document {
  background-color: #f9f9f9;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
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
  padding: 10px;
  border-radius: 4px;
  margin-right: 15px;
  font-weight: bold;
}

.document-info {
  flex: 1;
}

.document-title {
  font-weight: bold;
  margin-bottom: 5px;
}

.document-desc {
  font-size: 14px;
  color: #666;
}
</style>