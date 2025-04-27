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
        
        <!-- Multiple Freight Classes -->
        <div class="multi-section">
          <h4>Freight Classes</h4>
          <div v-for="(freightClass, index) in freightDetails.freightClasses" :key="`freight-class-${index}`" class="multi-item">
            <div class="form-row">
              <div class="form-group flex-grow">
                <label :for="`freight-class-${index}`">Freight Class</label>
                <select :id="`freight-class-${index}`" v-model="freightDetails.freightClasses[index].classId">
                  <option v-for="fc in freightClasses" :key="fc.id" :value="fc.id">
                    {{ fc.name }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label :for="`freight-percentage-${index}`">Percentage (%)</label>
                <input :id="`freight-percentage-${index}`" v-model.number="freightDetails.freightClasses[index].percentage" type="number" min="1" max="100" step="1">
              </div>
              <button type="button" @click="removeFreightClass(index)" class="remove-btn" :disabled="freightDetails.freightClasses.length <= 1">
                &times;
              </button>
            </div>
          </div>
          <button type="button" @click="addFreightClass" class="add-btn">Add Another Freight Class</button>
        </div>
        
        <div class="form-group">
          <label for="freight-value">Cargo Value ($)</label>
          <input id="freight-value" v-model.number="freightDetails.value" type="number" min="1" step="1">
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
        
        <!-- Multiple Commodities -->
        <div class="multi-section">
          <h4>Commodities</h4>
          <div v-for="(commodity, index) in freightDetails.commodities" :key="`commodity-${index}`" class="multi-item">
            <div class="form-row">
              <div class="form-group flex-grow">
                <label :for="`commodity-${index}`">Commodity</label>
                <select :id="`commodity-${index}`" v-model="freightDetails.commodities[index].id">
                  <option v-for="c in commodities" :key="c.id" :value="c.id">
                    {{ c.name }}
                  </option>
                </select>
              </div>
              <button type="button" @click="removeCommodity(index)" class="remove-btn" :disabled="freightDetails.commodities.length <= 1">
                &times;
              </button>
            </div>
            
            <!-- Show exclusions for selected commodity if any -->
            <div v-if="hasCommodityExclusions(commodity.id)" class="exclusion-warning">
              <p>Please note: This commodity has exclusions or restrictions.</p>
              <ul>
                <li v-for="(exclusion, exIndex) in getCommodityExclusionsById(commodity.id)" :key="exIndex">
                  {{ exclusion.name }}
                </li>
              </ul>
            </div>
          </div>
          <button type="button" @click="addCommodity" class="add-btn">Add Another Commodity</button>
        </div>
        
        <h4>Equipment & Load Type</h4>
        <div class="form-row">
          <div class="form-group">
            <label for="equipment-type">Equipment Type</label>
            <select id="equipment-type" v-model="freightDetails.equipmentTypeId">
              <option v-for="equipmentType in equipmentTypes" :key="equipmentType.id" :value="equipmentType.id">
                {{ equipmentType.name }}
              </option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="load-type">Load Type</label>
            <select id="load-type" v-model="freightDetails.loadTypeId">
              <option v-for="loadType in loadTypes" :key="loadType.id" :value="loadType.id">
                {{ loadType.name }}
              </option>
            </select>
          </div>
        </div>
        
        <!-- Multiple Stops -->
        <div class="multi-section">
          <h4>Stops</h4>
          <div v-for="(stop, index) in freightDetails.stops" :key="`stop-${index}`" class="multi-item">
            <div class="stop-header">
              <h5>{{ getStopTypeLabel(stop.stopType) }} (Stop #{{ index + 1 }})</h5>
              <button type="button" @click="removeStop(index)" class="remove-btn" 
                      :disabled="index < 2 || freightDetails.stops.length <= 2">
                &times;
              </button>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label :for="`stop-type-${index}`">Stop Type</label>
                <select :id="`stop-type-${index}`" v-model="stop.stopType" :disabled="index < 2">
                  <option value="PICKUP">Pickup</option>
                  <option value="DELIVERY">Delivery</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                </select>
              </div>
              
              <div class="form-group">
                <label :for="`stop-date-${index}`">Date</label>
                <input :id="`stop-date-${index}`" v-model="stop.date" type="date">
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label :for="`stop-city-${index}`">City</label>
                <input :id="`stop-city-${index}`" v-model="stop.address.city" type="text" placeholder="City">
              </div>
              
              <div class="form-group">
                <label :for="`stop-state-${index}`">State</label>
                <input :id="`stop-state-${index}`" v-model="stop.address.state" type="text" placeholder="State">
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label :for="`stop-address-${index}`">Address</label>
                <input :id="`stop-address-${index}`" v-model="stop.address.address1" type="text" placeholder="Address Line 1">
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label :for="`stop-address2-${index}`">Address Line 2 (Optional)</label>
                <input :id="`stop-address2-${index}`" v-model="stop.address.address2" type="text" placeholder="Address Line 2">
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label :for="`stop-postal-${index}`">Postal Code</label>
                <input :id="`stop-postal-${index}`" v-model="stop.address.postal" type="text" placeholder="Postal Code">
              </div>
              
              <div class="form-group">
                <label :for="`stop-country-${index}`">Country</label>
                <input :id="`stop-country-${index}`" v-model="stop.address.country" type="text" placeholder="Country" value="USA">
              </div>
            </div>
          </div>
          <button type="button" @click="addStop" class="add-btn">Add Another Stop</button>
        </div>
        
        <!-- Multiple Carriers -->
        <div class="multi-section">
          <h4>Carriers</h4>
          <div v-for="(carrier, index) in freightDetails.carriers" :key="`carrier-${index}`" class="multi-item">
            <div class="carrier-header">
              <h5>Carrier #{{ index + 1 }}</h5>
              <button type="button" @click="removeCarrier(index)" class="remove-btn" :disabled="freightDetails.carriers.length <= 1">
                &times;
              </button>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label :for="`carrier-mode-${index}`">Mode</label>
                <select :id="`carrier-mode-${index}`" v-model="carrier.mode">
                  <option value="ROAD">Road</option>
                  <option value="SEA">Sea</option>
                  <option value="AIR">Air</option>
                  <option value="RAIL">Rail</option>
                </select>
              </div>
              
              <div class="form-group">
                <label :for="`carrier-name-${index}`">Name (Optional)</label>
                <input :id="`carrier-name-${index}`" v-model="carrier.name" type="text" placeholder="Carrier Name">
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label :for="`carrier-dot-${index}`">DOT Number (Optional)</label>
                <input :id="`carrier-dot-${index}`" v-model="carrier.carrierId.value" type="text" placeholder="DOT Number">
              </div>
              
              <div class="form-group">
                <label :for="`carrier-id-type-${index}`">ID Type</label>
                <select :id="`carrier-id-type-${index}`" v-model="carrier.carrierId.type">
                  <option value="USDOT">USDOT</option>
                  <option value="MC">MC</option>
                  <option value="SCAC">SCAC</option>
                </select>
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label :for="`carrier-email-${index}`">Email (Optional)</label>
                <input :id="`carrier-email-${index}`" v-model="carrier.email" type="email" placeholder="Carrier Email">
              </div>
              
              <div class="form-group">
                <label :for="`carrier-phone-${index}`">Phone (Optional)</label>
                <input :id="`carrier-phone-${index}`" v-model="carrier.phone" type="text" placeholder="Carrier Phone">
              </div>
            </div>
          </div>
          <button type="button" @click="addCarrier" class="add-btn">Add Another Carrier</button>
        </div>
        
        <!-- User / Assured Information -->
        <h4>User Information</h4>
        <div class="form-row">
          <div class="form-group">
            <label for="user-name">Your Name</label>
            <input id="user-name" v-model="freightDetails.user.name" type="text" placeholder="Your Name">
          </div>
          
          <div class="form-group">
            <label for="user-email">Your Email</label>
            <input id="user-email" v-model="freightDetails.user.email" type="email" placeholder="Your Email">
          </div>
        </div>
        
        <h4>Assured Information</h4>
        <div class="form-row">
          <div class="form-group">
            <label for="assured-name">Company Name</label>
            <input id="assured-name" v-model="freightDetails.assured.name" type="text" placeholder="Company Name">
          </div>
          
          <div class="form-group">
            <label for="assured-email">Company Email</label>
            <input id="assured-email" v-model="freightDetails.assured.email" type="email" placeholder="Company Email">
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="assured-address1">Address</label>
            <input id="assured-address1" v-model="freightDetails.assured.address.address1" type="text" placeholder="Address Line 1">
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="assured-address2">Address Line 2 (Optional)</label>
            <input id="assured-address2" v-model="freightDetails.assured.address.address2" type="text" placeholder="Address Line 2">
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="assured-city">City</label>
            <input id="assured-city" v-model="freightDetails.assured.address.city" type="text" placeholder="City">
          </div>
          
          <div class="form-group">
            <label for="assured-state">State</label>
            <input id="assured-state" v-model="freightDetails.assured.address.state" type="text" placeholder="State">
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="assured-postal">Postal Code</label>
            <input id="assured-postal" v-model="freightDetails.assured.address.postal" type="text" placeholder="Postal Code">
          </div>
          
          <div class="form-group">
            <label for="assured-country">Country</label>
            <input id="assured-country" v-model="freightDetails.assured.address.country" type="text" value="USA">
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
      
      // Enhanced form data for Loadsure API
      freightDetails: {
        description: '',
        value: 10000,
        currency: 'USD',
        dimensionLength: 48,
        dimensionWidth: 40,
        dimensionHeight: 48,
        dimensionUnit: 'in',
        weightValue: 500,
        weightUnit: 'lbs',
        equipmentTypeId: null,
        loadTypeId: null,
        
        // Multiple freight classes
        freightClasses: [
          { classId: '', percentage: 100 }
        ],
        
        // Multiple commodities
        commodities: [
          { id: null }
        ],
        
        // Multiple stops (origin and destination required)
        stops: [
          {
            stopType: 'PICKUP',
            stopNumber: 1,
            date: this.getCurrentDate(),
            address: {
              address1: '',
              address2: '',
              city: '',
              state: '',
              postal: '',
              country: 'USA'
            }
          },
          {
            stopType: 'DELIVERY',
            stopNumber: 2,
            date: this.getFutureDate(7),
            address: {
              address1: '',
              address2: '',
              city: '',
              state: '',
              postal: '',
              country: 'USA'
            }
          }
        ],
        
        // Multiple carriers
        carriers: [
          {
            mode: 'ROAD',
            name: '',
            email: '',
            phone: '',
            carrierId: {
              type: 'USDOT',
              value: ''
            }
          }
        ],
        
        // User information
        user: {
          name: '',
          email: '',
          id: ''  // Will be set from email
        },
        
        // Assured information
        assured: {
          name: '',
          email: '',
          address: {
            address1: '',
            address2: '',
            city: '',
            state: '',
            postal: '',
            country: 'USA'
          }
        },
        
        // Additional fields for API v2
        freightId: `FR-${Date.now().toString().substring(7)}`,
        poNumber: '',
        pickupDate: this.getCurrentDate(),
        deliveryDate: this.getFutureDate(7)
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
      
      // Check user and assured information
      if (!freightDetails.user.name || !freightDetails.user.email ||
          !freightDetails.assured.name || !freightDetails.assured.email ||
          !freightDetails.assured.address.address1 || 
          !freightDetails.assured.address.city || 
          !freightDetails.assured.address.state || 
          !freightDetails.assured.address.postal) {
        return false;
      }
      
      // Check basic freight details
      if (!freightDetails.description || 
          !freightDetails.value || 
          freightDetails.value <= 0) {
        return false;
      }
      
      // Validate stops (need at least pickup and delivery)
      if (freightDetails.stops.length < 2) {
        return false;
      }
      
      // Validate stop addresses
      for (const stop of freightDetails.stops) {
        if (!stop.address.city || !stop.address.state) {
          return false;
        }
      }
      
      // Check at least one freight class is selected
      if (freightDetails.freightClasses.length === 0 || 
          !freightDetails.freightClasses[0].classId) {
        return false;
      }
      
      // Check at least one commodity is selected
      if (freightDetails.commodities.length === 0 || 
          !freightDetails.commodities[0].id) {
        return false;
      }
      
      // Make sure freight class percentages add up to 100%
      const totalPercentage = freightDetails.freightClasses.reduce(
        (sum, fc) => sum + (fc.percentage || 0), 0
      );
      if (totalPercentage !== 100) {
        return false;
      }
      
      return true;
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
      if (newClasses.length > 0 && this.freightDetails.freightClasses.length > 0 && 
          !this.freightDetails.freightClasses[0].classId) {
        this.freightDetails.freightClasses[0].classId = newClasses[0].id;
      }
    },
    commodities(newCommodities) {
      if (newCommodities.length > 0 && this.freightDetails.commodities.length > 0 && 
          !this.freightDetails.commodities[0].id) {
        this.freightDetails.commodities[0].id = newCommodities[0].id;
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
    },
    
    // Set user ID when email changes
    'freightDetails.user.email'(newEmail) {
      if (newEmail) {
        this.freightDetails.user.id = newEmail;
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
    
    // Helper methods for date handling
    getCurrentDate() {
      const today = new Date();
      return this.formatDateForInput(today);
    },
    
    getFutureDate(days) {
      const date = new Date();
      date.setDate(date.getDate() + days);
      return this.formatDateForInput(date);
    },
    
    formatDateForInput(date) {
      return date.toISOString().split('T')[0];
    },
    
    // Methods for handling multiple elements
    addFreightClass() {
      this.freightDetails.freightClasses.push({ 
        classId: this.freightDetails.freightClasses[0].classId, 
        percentage: 0 
      });
      this.updateFreightClassPercentages();
    },
    
    removeFreightClass(index) {
      if (this.freightDetails.freightClasses.length > 1) {
        this.freightDetails.freightClasses.splice(index, 1);
        this.updateFreightClassPercentages();
      }
    },
    
    updateFreightClassPercentages() {
      // Recalculate percentages to ensure they add up to 100%
      const count = this.freightDetails.freightClasses.length;
      const percentPerClass = Math.floor(100 / count);
      let remainder = 100 - (percentPerClass * count);
      
      this.freightDetails.freightClasses.forEach((fc, index) => {
        fc.percentage = percentPerClass + (index === 0 ? remainder : 0);
      });
    },
    
    addCommodity() {
      this.freightDetails.commodities.push({ 
        id: this.freightDetails.commodities[0].id
      });
    },
    
    removeCommodity(index) {
      if (this.freightDetails.commodities.length > 1) {
        this.freightDetails.commodities.splice(index, 1);
      }
    },
    
    addStop() {
      const newStopNumber = this.freightDetails.stops.length + 1;
      // Default to intermediate for new stops (after origin and destination)
      this.freightDetails.stops.push({
        stopType: 'INTERMEDIATE',
        stopNumber: newStopNumber,
        date: this.getFutureDate(3), // Default to a date between pickup and delivery
        address: {
          address1: '',
          address2: '',
          city: '',
          state: '',
          postal: '',
          country: 'USA'
        }
      });
    },
    
    removeStop(index) {
      // Don't allow removing the first two stops (origin and destination)
      if (index >= 2 && this.freightDetails.stops.length > 2) {
        this.freightDetails.stops.splice(index, 1);
        // Update stop numbers
        this.freightDetails.stops.forEach((stop, i) => {
          stop.stopNumber = i + 1;
        });
      }
    },
    
    addCarrier() {
      this.freightDetails.carriers.push({
        mode: 'ROAD',
        name: '',
        email: '',
        phone: '',
        carrierId: {
          type: 'USDOT',
          value: ''
        }
      });
    },
    
    removeCarrier(index) {
      if (this.freightDetails.carriers.length > 1) {
        this.freightDetails.carriers.splice(index, 1);
      }
    },
    
    getStopTypeLabel(stopType) {
      switch (stopType) {
        case 'PICKUP': return 'Origin';
        case 'DELIVERY': return 'Destination';
        case 'INTERMEDIATE': return 'Stop';
        default: return 'Stop';
      }
    },
    
    hasCommodityExclusions(commodityId) {
      return this.getCommodityExclusionsById(commodityId).length > 0;
    },
    
    getCommodityExclusionsById(commodityId) {
      return this.commodityExclusions.filter(e => 
        e.id === 'related-to-commodity-' + commodityId || 
        e.commodityId === commodityId
      );
    },
    
    // Format the freight details into the structure expected by the Loadsure API
    formatLoadsurePayload() {
      const { freightDetails } = this;
      
      // Set ID from email if not already set
      if (!freightDetails.user.id && freightDetails.user.email) {
        freightDetails.user.id = freightDetails.user.email;
      }
      
      // Prepare cargo details
      const cargo = {
        cargoValue: {
          currency: freightDetails.currency,
          value: freightDetails.value
        },
        commodity: freightDetails.commodities.map(c => c.id),
        fullDescriptionOfCargo: freightDetails.description,
        weight: {
          unit: freightDetails.weightUnit,
          value: freightDetails.weightValue
        },
        freightClass: freightDetails.freightClasses.map(fc => ({
          id: fc.classId,
          percentage: fc.percentage
        }))
      };
      
      // Create the full payload structure expected by Loadsure API
      return {
        user: freightDetails.user,
        assured: freightDetails.assured,
        shipment: {
          version: "2",
          freightId: freightDetails.freightId,
          poNumber: freightDetails.poNumber || `PO-${Date.now().toString().substring(7)}`,
          pickupDate: freightDetails.stops[0].date,
          deliveryDate: freightDetails.stops[1].date,
          cargo: cargo,
          carriers: freightDetails.carriers,
          stops: freightDetails.stops,
          loadType: freightDetails.loadTypeId,
          equipmentType: freightDetails.equipmentTypeId
        }
      };
    },
    
    async requestQuote() {
      if (!this.isFormValid) return;
      
      this.isLoading = true;
      this.loadingMessage = 'Getting insurance quote...';
      
      try {
        // Format the payload for Loadsure API
        const loadsurePayload = this.formatLoadsurePayload();
        
        // Call backend API with the complete object
        const response = await fetch('http://localhost:3000/api/insurance/quotes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(loadsurePayload)
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
            userId: this.freightDetails.user.email || this.freightDetails.user.id || 'user@example.com'
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
      
      // Reset form data with default values
      this.freightDetails = {
        description: '',
        value: 10000,
        currency: 'USD',
        dimensionLength: 48,
        dimensionWidth: 40,
        dimensionHeight: 48,
        dimensionUnit: 'in',
        weightValue: 500,
        weightUnit: 'lbs',
        equipmentTypeId: this.equipmentTypes.length > 0 ? this.equipmentTypes[0].id : null,
        loadTypeId: this.loadTypes.length > 0 ? this.loadTypes[0].id : null,
        
        // Reset freight classes
        freightClasses: [
          { 
            classId: this.freightClasses.length > 0 ? this.freightClasses[0].id : '', 
            percentage: 100 
          }
        ],
        
        // Reset commodities
        commodities: [
          { id: this.commodities.length > 0 ? this.commodities[0].id : null }
        ],
        
        // Reset stops to origin and destination only
        stops: [
          {
            stopType: 'PICKUP',
            stopNumber: 1,
            date: this.getCurrentDate(),
            address: {
              address1: '',
              address2: '',
              city: '',
              state: '',
              postal: '',
              country: 'USA'
            }
          },
          {
            stopType: 'DELIVERY',
            stopNumber: 2,
            date: this.getFutureDate(7),
            address: {
              address1: '',
              address2: '',
              city: '',
              state: '',
              postal: '',
              country: 'USA'
            }
          }
        ],
        
        // Reset carriers
        carriers: [
          {
            mode: 'ROAD',
            name: '',
            email: '',
            phone: '',
            carrierId: {
              type: 'USDOT',
              value: ''
            }
          }
        ],
        
        // Reset user information
        user: {
          name: '',
          email: '',
          id: ''
        },
        
        // Reset assured information
        assured: {
          name: '',
          email: '',
          address: {
            address1: '',
            address2: '',
            city: '',
            state: '',
            postal: '',
            country: 'USA'
          }
        },
        
        // Reset additional fields
        freightId: `FR-${Date.now().toString().substring(7)}`,
        poNumber: '',
        pickupDate: this.getCurrentDate(),
        deliveryDate: this.getFutureDate(7)
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

.flex-grow {
  flex-grow: 1;
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

.multi-section {
  margin-bottom: 25px;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 15px;
  background-color: #f5f5f5;
}

.multi-item {
  background-color: white;
  border-radius: 6px;
  padding: 15px;
  margin-bottom: 15px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.stop-header, .carrier-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

h5 {
  margin: 0;
  color: #444;
}

.add-btn {
  background-color: #4285f4;
  color: white;
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  width: auto;
}

.add-btn:hover {
  background-color: #3367d6;
}

.remove-btn {
  background-color: #f44336;
  color: white;
  font-size: 16px;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.remove-btn:hover {
  background-color: #d32f2f;
}

.remove-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
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