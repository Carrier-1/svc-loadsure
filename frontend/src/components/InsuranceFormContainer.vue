<style scoped>
.insurance-form-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 15px;
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

.form-actions {
  margin-top: 30px;
  text-align: center;
}

.submit-btn {
  background-color: #4a6cf7;
  color: white;
  padding: 12px 30px;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.submit-btn:hover:not(:disabled) {
  background-color: #3a5bd9;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.submit-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
  box-shadow: none;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
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

.last-updated-info {
  text-align: right;
  font-size: 12px;
  color: #777;
  margin-top: 20px;
  padding-top: 10px;
  border-top: 1px solid #eee;
}
</style><template>
  <div class="insurance-form-container">
    <!-- Error Message -->
    <div v-if="supportDataError || apiError" class="error-message">
      <p>{{ supportDataError || apiError }}</p>
      <button @click="refreshSupportData" v-if="supportDataError" class="refresh-btn">Refresh Data</button>
      <button @click="clearApiError" v-if="apiError" class="refresh-btn">Dismiss</button>
    </div>
    
    <!-- Quote Request Form -->
    <div v-if="!quote && !isLoading && !bookingConfirmation && !certificate" class="insurance-form">
      <!-- Freight Details Form -->
      <FreightDetailsForm 
        :freight-details="freightDetails"
        :validation-errors="validationErrors"
        :equipment-types="equipmentTypes"
        :load-types="loadTypes"
        @update:freight-details="updateFreightDetails"
      />
      
      <!-- Freight Classes Form -->
      <FreightClassesForm 
        :freight-classes="freightDetails.freightClasses"
        :commodities="freightDetails.commodities"
        :freight-class-options="freightClasses"
        :commodity-options="commodities"
        :commodity-exclusions="commodityExclusions"
        :validation-errors="validationErrors"
        @update:freight-classes="updateFreightClasses"
        @update:commodities="updateCommodities"
      />
      
      <!-- Stops Form -->
      <StopsForm 
        :stops="freightDetails.stops"
        :validation-errors="validationErrors"
        @update:stops="updateStops"
      />
      
      <!-- Carriers Form -->
      <CarriersForm 
        :carriers="freightDetails.carriers"
        :equipment-types="equipmentTypes"
        :validation-errors="validationErrors"
        @update:carriers="updateCarriers"
      />
      
      <!-- User Info Form -->
      <UserInfoForm 
        :user="freightDetails.user"
        :assured="freightDetails.assured"
        :stops="freightDetails.stops"
        :validation-errors="validationErrors"
        @update:user="updateUser"
        @update:assured="updateAssured"
      />
      
      <!-- Integration Fee Form -->
      <IntegrationFeeForm 
        :integration-fee-type="freightDetails.integrationFeeType"
        :integration-fee-value="freightDetails.integrationFeeValue"
        :validation-errors="validationErrors"
        @update:integration-fee-type="updateIntegrationFeeType"
        @update:integration-fee-value="updateIntegrationFeeValue"
      />
      
      <div class="form-actions">
        <button 
          @click="validateAndRequestQuote" 
          :disabled="isDataLoading || isLoading"
          class="submit-btn"
        >
          Get Insurance Quote
        </button>
      </div>
    </div>
    
    <!-- Loading Indicator -->
    <div v-if="isLoading" class="loading">
      <div class="spinner"></div>
      <p>{{ loadingMessage }}</p>
    </div>
    
    <!-- Quote Display -->
    <QuoteDisplay 
      v-if="quote && !bookingConfirmation && !certificate" 
      :quote="quote"
      @book-insurance="bookInsurance"
      @cancel-quote="cancelQuote"
    />
    
    <!-- Booking Confirmation Display -->
    <BookingConfirmation 
      v-if="bookingConfirmation" 
      :booking-confirmation="bookingConfirmation"
      @start-new-quote="resetForm"
    />
    
    <!-- Certificate Display -->
    <CertificateDisplay 
      v-if="certificate" 
      :certificate="certificate"
      @start-new-quote="resetForm"
    />
    
    <!-- Certificate Lookup -->
    <CertificateLookup 
      v-if="!quote && !isLoading && !bookingConfirmation && !certificate" 
      @get-certificate="getCertificate"
      ref="certificateLookup"
    />
    
    <!-- Last Updated Info -->
    <div v-if="lastUpdated" class="last-updated-info">
      Support data last updated: {{ formatLastUpdated }}
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex';
import FreightDetailsForm from './FreightDetailsForm.vue';
import FreightClassesForm from './FreightClassesForm.vue';
import StopsForm from './StopsForm.vue';
import CarriersForm from './CarriersForm.vue';
import UserInfoForm from './UserInfoForm.vue';
import IntegrationFeeForm from './IntegrationFeeForm.vue';
import QuoteDisplay from './QuoteDisplay.vue';
import BookingConfirmation from './BookingConfirmation.vue';
import CertificateDisplay from './CertificateDisplay.vue';
import CertificateLookup from './CertificateLookup.vue';

export default {
  name: 'InsuranceFormContainer',
  components: {
    FreightDetailsForm,
    FreightClassesForm,
    StopsForm,
    CarriersForm,
    UserInfoForm,
    IntegrationFeeForm,
    QuoteDisplay,
    BookingConfirmation,
    CertificateDisplay,
    CertificateLookup
  },
  data() {
    return {
      isLoading: false,
      loadingMessage: '',
      quote: null,
      bookingConfirmation: null,
      certificate: null,
      certificateNumber: '',
      apiError: null,
      validationErrors: {},
      
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
        
        // Integration fee fields
        integrationFeeType: '',
        integrationFeeValue: null,
        
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
          !freightDetails.assured.name || !freightDetails.assured.email) {
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
      
      // Validate integration fee if selected
      if (freightDetails.integrationFeeType && 
          (freightDetails.integrationFeeValue === null || freightDetails.integrationFeeValue === undefined)) {
        return false;
      }
      
      if (freightDetails.integrationFeeType === 'percentage' && 
          (freightDetails.integrationFeeValue < 0 || freightDetails.integrationFeeValue > 1)) {
        return false;
      }
      
      if (freightDetails.integrationFeeType === 'fixed' && freightDetails.integrationFeeValue < 0) {
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
    }
  },
  methods: {
    ...mapActions('supportData', {
      fetchSupportData: 'fetchSupportData',
      refreshSupportDataAction: 'refreshSupportData'
    }),
    
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
    
    // Methods for updating form data from child components
    updateFreightDetails(value) {
      this.freightDetails = { ...value };
    },
    
    updateFreightClasses(value) {
      this.freightDetails.freightClasses = [...value];
    },
    
    updateCommodities(value) {
      this.freightDetails.commodities = [...value];
    },
    
    updateStops(value) {
      this.freightDetails.stops = [...value];
    },
    
    updateCarriers(value) {
      this.freightDetails.carriers = [...value];
    },
    
    updateUser(value) {
      this.freightDetails.user = { ...value };
    },
    
    updateAssured(value) {
      this.freightDetails.assured = { ...value };
    },
    
    updateIntegrationFeeType(value) {
      this.freightDetails.integrationFeeType = value;
    },
    
    updateIntegrationFeeValue(value) {
      this.freightDetails.integrationFeeValue = value;
    },
    
    // Support data methods
    loadSupportData() {
      this.fetchSupportData();
    },
    
    refreshSupportData() {
      this.refreshSupportDataAction();
    },
    
    clearApiError() {
      this.apiError = null;
    },
    
    // Form validation
    validateForm() {
      this.validationErrors = {};
      let isValid = true;
      
      // Validate required fields
      if (!this.freightDetails.description) {
        this.validationErrors.description = 'Description is required';
        isValid = false;
      }
      
      if (!this.freightDetails.value || this.freightDetails.value <= 0) {
        this.validationErrors.value = 'A valid cargo value is required';
        isValid = false;
      }
      
      // Validate freight classes
      if (this.freightDetails.freightClasses.length === 0 || 
          !this.freightDetails.freightClasses[0].classId) {
        this.validationErrors.freightClasses = 'At least one freight class is required';
        isValid = false;
      }
      
      // Validate freight class percentages
      const totalPercentage = this.freightDetails.freightClasses.reduce(
        (sum, fc) => sum + (fc.percentage || 0), 0
      );
      if (totalPercentage !== 100) {
        this.validationErrors.freightClassPercentage = 'Freight class percentages must add up to 100%';
        isValid = false;
      }
      
      // Validate stops
      this.freightDetails.stops.forEach((stop, index) => {
        if (!stop.address.city) {
          this.validationErrors[`stops[${index}].address.city`] = 'City is required';
          isValid = false;
        }
        
        if (!stop.address.state) {
          this.validationErrors[`stops[${index}].address.state`] = 'State is required';
          isValid = false;
        }
      });
      
      // Validate user information
      if (!this.freightDetails.user.name) {
        this.validationErrors.userName = 'Your name is required';
        isValid = false;
      }
      
      if (!this.freightDetails.user.email) {
        this.validationErrors.userEmail = 'Your email is required';
        isValid = false;
      } else if (!this.isValidEmail(this.freightDetails.user.email)) {
        this.validationErrors.userEmail = 'Please enter a valid email address';
        isValid = false;
      }
      
      // Validate assured information
      if (!this.freightDetails.assured.name) {
        this.validationErrors.assuredName = 'Company name is required';
        isValid = false;
      }
      
      if (!this.freightDetails.assured.email) {
        this.validationErrors.assuredEmail = 'Company email is required';
        isValid = false;
      } else if (!this.isValidEmail(this.freightDetails.assured.email)) {
        this.validationErrors.assuredEmail = 'Please enter a valid email address';
        isValid = false;
      }
      
      // Validate integration fee if selected
      if (this.freightDetails.integrationFeeType) {
        if (this.freightDetails.integrationFeeValue === null || this.freightDetails.integrationFeeValue === undefined) {
          this.validationErrors.integrationFeeValue = 'Fee value is required';
          isValid = false;
        } else if (this.freightDetails.integrationFeeType === 'percentage') {
          if (this.freightDetails.integrationFeeValue < 0 || this.freightDetails.integrationFeeValue > 1) {
            this.validationErrors.integrationFeeValue = 'Percentage must be between 0 and 1';
            isValid = false;
          }
        } else if (this.freightDetails.integrationFeeType === 'fixed') {
          if (this.freightDetails.integrationFeeValue < 0) {
            this.validationErrors.integrationFeeValue = 'Fixed amount cannot be negative';
            isValid = false;
          }
        }
      }
      
      return isValid;
    },
    
    isValidEmail(email) {
      const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
      return re.test(String(email).toLowerCase());
    },
    
    validateAndRequestQuote() {
      if (this.validateForm()) {
        this.requestQuote();
      } else {
        // Scroll to the top where errors are likely to be
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    
    // API interaction methods
    async requestQuote() {
      if (!this.isFormValid) return;
      
      this.isLoading = true;
      this.loadingMessage = 'Getting insurance quote...';
      this.apiError = null;
      
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
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || `Failed to get quote: ${response.statusText}`);
        }
        
        if (data.status === 'success' && data.quote) {
          // Convert expiresAt string to Date object
          data.quote.expiresAt = new Date(data.quote.expiresAt);
          this.quote = data.quote;
          
          // Emit event to update the parent component with insurance info
          this.$root.$emit('insurance-selected', {
            premium: data.quote.premium,
            integrationFeeAmount: data.quote.integrationFeeAmount
          });
        } else {
          throw new Error('Invalid quote response');
        }
      } catch (error) {
        console.error('Error getting quote:', error);
        this.apiError = error.message;
      } finally {
        this.isLoading = false;
      }
    },
    
    async bookInsurance() {
      if (!this.quote) return;
      
      this.isLoading = true;
      this.loadingMessage = 'Processing your insurance purchase...';
      this.apiError = null;
      
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
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || `Failed to book insurance: ${response.statusText}`);
        }
        
        if (data.status === 'success' && data.booking) {
          this.bookingConfirmation = data.booking;
        } else {
          throw new Error('Invalid booking response');
        }
      } catch (error) {
        console.error('Error booking insurance:', error);
        this.apiError = error.message;
      } finally {
        this.isLoading = false;
      }
    },
    
    async getCertificate(params) {
      const { certificateNumber, userId } = params;
      
      this.isLoading = true;
      this.loadingMessage = 'Retrieving certificate...';
      this.apiError = null;
      
      try {
        // Call backend API to get certificate details
        const response = await fetch('http://localhost:3000/api/insurance/certificates', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            certificateNumber,
            userId
          })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || `Failed to retrieve certificate: ${response.statusText}`);
        }
        
        if (data.status === 'success' && data.certificate) {
          this.certificate = data.certificate;
          this.quote = null;
          this.bookingConfirmation = null;
          
          // Notify the lookup component that the lookup was successful
          if (this.$refs.certificateLookup) {
            this.$refs.certificateLookup.lookupComplete(true);
          }
        } else {
          throw new Error('Invalid certificate response');
        }
      } catch (error) {
        console.error('Error retrieving certificate:', error);
        this.apiError = error.message;
        
        // Notify the lookup component about the error
        if (this.$refs.certificateLookup) {
          this.$refs.certificateLookup.lookupComplete(false, error.message);
        }
      } finally {
        this.isLoading = false;
      }
    },
    
    cancelQuote() {
      this.quote = null;
      
      // Emit event to update the parent component
      this.$root.$emit('insurance-canceled');
    },
    
    resetForm() {
      this.quote = null;
      this.bookingConfirmation = null;
      this.certificate = null;
      this.apiError = null;
      this.validationErrors = {};
      
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
        
        // Reset integration fee fields
        integrationFeeType: '',
        integrationFeeValue: null,
        
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
      
      // Reset certificate lookup form
      if (this.$refs.certificateLookup) {
        this.$refs.certificateLookup.resetForm();
      }
      
      // Emit event to update the parent component
      this.$root.$emit('insurance-canceled');
    },
    
    // Generate payload for API
    formatLoadsurePayload() {
      return {
        user: this.freightDetails.user,
        assured: this.freightDetails.assured,
        shipment: {
          version: "2",
          freightId: this.freightDetails.freightId,
          poNumber: this.freightDetails.poNumber || `PO-${Date.now().toString().substring(7)}`,
          pickupDate: this.freightDetails.stops[0].date,
          deliveryDate: this.freightDetails.stops[1].date,
          cargo: {
            cargoValue: {
              currency: this.freightDetails.currency,
              value: parseFloat(this.freightDetails.value)
            },
            commodity: this.freightDetails.commodities.map(c => c.id),
            fullDescriptionOfCargo: this.freightDetails.description,
            weight: {
              unit: this.freightDetails.weightUnit,
              value: parseFloat(this.freightDetails.weightValue)
            },
            freightClass: this.freightDetails.freightClasses.map(fc => ({
              id: fc.classId,
              percentage: fc.percentage
            }))
          },
          carriers: this.freightDetails.carriers,
          stops: this.freightDetails.stops,
          loadType: this.freightDetails.loadTypeId,
          equipmentType: this.freightDetails.equipmentTypeId,
          // Add integration fee details if they exist
          integrationFeeType: this.freightDetails.integrationFeeType || undefined,
          integrationFeeValue: this.freightDetails.integrationFeeValue || undefined
        }
      };
    },
    
    /**
     * Populates the form with data from a previous quote
     * This method is exposed to the parent component
     * @param {Object} quote - The quote object to populate from
     */
    populateFormFromQuote(quote) {
      // Reset the form first to clear any existing data
      this.resetForm();
      
      // Only proceed if we have a valid quote with requestData
      if (!quote || !quote.requestData) {
        this.apiError = 'Cannot load quote data: Invalid quote format';
        return;
      }
      
      try {
        const requestData = quote.requestData;
        
        // Set basic fields
        if (requestData.description) {
          this.freightDetails.description = requestData.description;
        } else if (requestData.shipment && requestData.shipment.cargo && requestData.shipment.cargo.fullDescriptionOfCargo) {
          this.freightDetails.description = requestData.shipment.cargo.fullDescriptionOfCargo;
        }
        
        // Set the value/cargo value
        if (requestData.value) {
          this.freightDetails.value = requestData.value;
        } else if (requestData.shipment && requestData.shipment.cargo && requestData.shipment.cargo.cargoValue) {
          this.freightDetails.value = requestData.shipment.cargo.cargoValue.value;
          this.freightDetails.currency = requestData.shipment.cargo.cargoValue.currency || 'USD';
        }
        
        // Set freight classes
        if (requestData.freightClasses && Array.isArray(requestData.freightClasses)) {
          this.freightDetails.freightClasses = requestData.freightClasses.map(fc => ({
            classId: fc.classId || fc.id,
            percentage: fc.percentage || 100
          }));
        } else if (requestData.shipment && requestData.shipment.cargo && requestData.shipment.cargo.freightClass) {
          this.freightDetails.freightClasses = requestData.shipment.cargo.freightClass.map(fc => ({
            classId: fc.id,
            percentage: fc.percentage || 100
          }));
        } else if (requestData.freightClass) {
          this.freightDetails.freightClasses = [{
            classId: requestData.freightClass,
            percentage: 100
          }];
        }
        
        // Set commodities
        if (requestData.commodities && Array.isArray(requestData.commodities)) {
          this.freightDetails.commodities = requestData.commodities.map(c => ({
            id: c.id
          }));
        } else if (requestData.shipment && requestData.shipment.cargo && requestData.shipment.cargo.commodity) {
          this.freightDetails.commodities = requestData.shipment.cargo.commodity.map(id => ({
            id: id
          }));
        } else if (requestData.commodityId) {
          this.freightDetails.commodities = [{
            id: requestData.commodityId
          }];
        }
        
        // Set equipment type and load type
        if (requestData.equipmentTypeId) {
          this.freightDetails.equipmentTypeId = requestData.equipmentTypeId;
        } else if (requestData.shipment && requestData.shipment.equipmentType) {
          this.freightDetails.equipmentTypeId = requestData.shipment.equipmentType;
        }
        
        if (requestData.loadTypeId) {
          this.freightDetails.loadTypeId = requestData.loadTypeId;
        } else if (requestData.shipment && requestData.shipment.loadType) {
          this.freightDetails.loadTypeId = requestData.shipment.loadType;
        }
        
        // Set weight information
        if (requestData.weightValue && requestData.weightUnit) {
          this.freightDetails.weightValue = requestData.weightValue;
          this.freightDetails.weightUnit = requestData.weightUnit;
        } else if (requestData.shipment && requestData.shipment.cargo && requestData.shipment.cargo.weight) {
          this.freightDetails.weightValue = requestData.shipment.cargo.weight.value;
          this.freightDetails.weightUnit = requestData.shipment.cargo.weight.unit;
        }
        
        // Set dimension information
        if (requestData.dimensionLength) {
          this.freightDetails.dimensionLength = requestData.dimensionLength;
          this.freightDetails.dimensionWidth = requestData.dimensionWidth;
          this.freightDetails.dimensionHeight = requestData.dimensionHeight;
          this.freightDetails.dimensionUnit = requestData.dimensionUnit;
        }
        
        // Set stops (origin and destination)
        if (requestData.stops && Array.isArray(requestData.stops)) {
          this.freightDetails.stops = requestData.stops.map((stop, index) => ({
            ...stop,
            stopNumber: index + 1 // Ensure stop numbers are sequential
          }));
        } else {
          // Create stops from origin/destination fields if they exist
          if (requestData.originCity && requestData.originState) {
            this.freightDetails.stops[0].address.city = requestData.originCity;
            this.freightDetails.stops[0].address.state = requestData.originState;
          }
          
          if (requestData.destinationCity && requestData.destinationState) {
            this.freightDetails.stops[1].address.city = requestData.destinationCity;
            this.freightDetails.stops[1].address.state = requestData.destinationState;
          }
        }
        
        // Set user information
        if (requestData.user) {
          this.freightDetails.user = {
            name: requestData.user.name || '',
            email: requestData.user.email || '',
            id: requestData.user.id || ''
          };
        } else if (requestData.userName && requestData.userEmail) {
          this.freightDetails.user = {
            name: requestData.userName,
            email: requestData.userEmail,
            id: requestData.userEmail
          };
        }
        
        // Set assured information
        if (requestData.assured) {
          this.freightDetails.assured = {
            name: requestData.assured.name || '',
            email: requestData.assured.email || '',
            address: requestData.assured.address || {
              address1: '',
              address2: '',
              city: '',
              state: '',
              postal: '',
              country: 'USA'
            }
          };
        } else if (requestData.assuredName && requestData.assuredEmail) {
          this.freightDetails.assured = {
            name: requestData.assuredName,
            email: requestData.assuredEmail,
            address: {
              address1: '',
              address2: '',
              city: '',
              state: '',
              postal: '',
              country: 'USA'
            }
          };
        }
        
        // Set integration fee information if present
        if (quote.integrationFeeType && quote.integrationFeeValue) {
          this.freightDetails.integrationFeeType = quote.integrationFeeType;
          this.freightDetails.integrationFeeValue = quote.integrationFeeValue;
        }
        
        // Validate the form after population
        this.$nextTick(() => {
          this.validateForm();
        });
        
      } catch (error) {
        console.error('Error populating form from quote:', error);
        this.apiError = `Error populating form: ${error.message}`;
      }
    },

    /**
     * Populates the form with data from a certificate
     * This method is exposed to the parent component
     * @param {Object} certificate - The certificate object to populate from
     */
    populateFormFromCertificate(certificate) {
      // First check if the certificate has response data that contains booking information
      if (certificate.responseData && certificate.responseData.booking) {
        // If it has booking data, we can try to find the related quote
        this.loadQuoteForCertificate(certificate);
        return;
      }
      
      // If we don't have booking data, we'll try to build a form from the certificate data
      this.resetForm();
      
      try {
        // Fill in basic details from certificate
        this.freightDetails.description = certificate.productName || 'Cargo Insurance';
        this.freightDetails.value = certificate.coverageAmount || 10000;
        
        // Fill in user and assured info if available
        if (certificate.responseData) {
          const data = certificate.responseData;
          
          if (data.customer) {
            this.freightDetails.user = {
              name: data.customer.name || '',
              email: data.customer.email || '',
              id: data.customer.id || data.customer.email || ''
            };
          }
          
          if (data.assured) {
            this.freightDetails.assured = {
              name: data.assured.name || '',
              email: data.assured.email || '',
              address: data.assured.address || {
                address1: '',
                address2: '',
                city: '',
                state: '',
                postal: '',
                country: 'USA'
              }
            };
          }
          
          // Try to extract shipment details
          if (data.loadDetails) {
            const loadDetails = data.loadDetails;
            
            // Extract origin/destination
            if (loadDetails.origin) {
              const parts = loadDetails.origin.split(',').map(p => p.trim());
              if (parts.length >= 2) {
                this.freightDetails.stops[0].address.city = parts[0];
                this.freightDetails.stops[0].address.state = parts[1];
              }
            }
            
            if (loadDetails.destination) {
              const parts = loadDetails.destination.split(',').map(p => p.trim());
              if (parts.length >= 2) {
                this.freightDetails.stops[1].address.city = parts[0];
                this.freightDetails.stops[1].address.state = parts[1];
              }
            }
            
            // Extract cargo description
            if (loadDetails.cargo && loadDetails.cargo.description) {
              this.freightDetails.description = loadDetails.cargo.description;
            }
          }
        }
        
        // Validate the form after population
        this.$nextTick(() => {
          this.validateForm();
        });
        
      } catch (error) {
        console.error('Error populating form from certificate:', error);
        this.apiError = `Error populating form: ${error.message}`;
      }
    },

    /**
     * Loads the quote associated with a certificate
     * @param {Object} certificate - The certificate
     */
    async loadQuoteForCertificate(certificate) {
      this.isLoading = true;
      this.loadingMessage = 'Retrieving quote data...';
      this.apiError = null;
      
      try {
        // Get the quoteId from certificate response data
        let quoteId = null;
        
        if (certificate.responseData && certificate.responseData.booking) {
          quoteId = certificate.responseData.booking.quoteId;
        } else if (certificate.responseData && certificate.responseData.quoteId) {
          quoteId = certificate.responseData.quoteId;
        }
        
        if (!quoteId) {
          throw new Error('No quote information found for this certificate');
        }
        
        // Fetch the quote data
        const response = await fetch(`http://localhost:3000/api/insurance/quotes/${quoteId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch quote: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'success' && data.quote) {
          // Populate the form with the quote data
          this.populateFormFromQuote(data.quote);
        } else {
          throw new Error('Invalid quote data received');
        }
      } catch (error) {
        console.error('Error loading quote for certificate:', error);
        this.apiError = error.message;
        
        // Fall back to basic certificate data
        this.populateFormFromCertificate(certificate);
      } finally {
        this.isLoading = false;
      }
    }
  }
};
</script>