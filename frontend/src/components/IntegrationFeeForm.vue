<template>
    <div class="integration-fee-form">
      <h3>Integration Fee</h3>
      <div class="form-row">
        <div class="form-group">
          <label for="integration-fee-type">Fee Type</label>
          <select 
            id="integration-fee-type" 
            v-model="localIntegrationFee.type"
            @change="updateIntegrationFee"
          >
            <option value="">No Integration Fee</option>
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed Amount</option>
          </select>
        </div>
        
        <div class="form-group" v-if="localIntegrationFee.type">
          <label for="integration-fee-value">
            {{ localIntegrationFee.type === 'percentage' ? 'Percentage (0-1)' : 'Amount ($)' }}
          </label>
          <input 
            id="integration-fee-value" 
            v-model.number="localIntegrationFee.value" 
            type="number" 
            :min="localIntegrationFee.type === 'percentage' ? 0 : 0.01" 
            :max="localIntegrationFee.type === 'percentage' ? 1 : null" 
            :step="localIntegrationFee.type === 'percentage' ? 0.01 : 0.01"
            :class="{'error-input': validationErrors.integrationFeeValue}"
            @input="updateIntegrationFee"
          >
          <span class="error-text" v-if="validationErrors.integrationFeeValue">
            {{ validationErrors.integrationFeeValue }}
          </span>
        </div>
      </div>
      
      <div class="fee-explanation" v-if="localIntegrationFee.type === 'percentage'">
        <p>A percentage-based fee will be calculated as a percentage of the premium amount.</p>
        <p>Example: A value of 0.1 means 10% of the premium will be added as a fee.</p>
      </div>
      
      <div class="fee-explanation" v-if="localIntegrationFee.type === 'fixed'">
        <p>A fixed fee will be added to the premium as a flat dollar amount.</p>
      </div>
      
      <!-- Calculated Fee Preview (if percentage type) -->
      <div class="fee-preview" v-if="localIntegrationFee.type === 'percentage' && showPreview">
        <div class="preview-row">
          <span class="label">Premium Example:</span>
          <span class="value">$1,000.00</span>
        </div>
        <div class="preview-row">
          <span class="label">Integration Fee ({{ (localIntegrationFee.value * 100).toFixed(2) }}%):</span>
          <span class="value">${{ (1000 * localIntegrationFee.value).toFixed(2) }}</span>
        </div>
        <div class="preview-row total">
          <span class="label">Total Cost:</span>
          <span class="value">${{ (1000 + (1000 * localIntegrationFee.value)).toFixed(2) }}</span>
        </div>
      </div>
      
      <!-- Fixed Fee Preview -->
      <div class="fee-preview" v-if="localIntegrationFee.type === 'fixed' && showPreview">
        <div class="preview-row">
          <span class="label">Premium Example:</span>
          <span class="value">$1,000.00</span>
        </div>
        <div class="preview-row">
          <span class="label">Integration Fee:</span>
          <span class="value">${{ localIntegrationFee.value.toFixed(2) }}</span>
        </div>
        <div class="preview-row total">
          <span class="label">Total Cost:</span>
          <span class="value">${{ (1000 + localIntegrationFee.value).toFixed(2) }}</span>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    name: 'IntegrationFeeForm',
    props: {
      integrationFeeType: {
        type: String,
        default: ''
      },
      integrationFeeValue: {
        type: Number,
        default: null
      },
      validationErrors: {
        type: Object,
        default: () => ({})
      },
      showPreview: {
        type: Boolean,
        default: true
      }
    },
    data() {
      return {
        localIntegrationFee: {
          type: this.integrationFeeType,
          value: this.integrationFeeValue
        }
      };
    },
    watch: {
      integrationFeeType(newVal) {
        this.localIntegrationFee.type = newVal;
      },
      integrationFeeValue(newVal) {
        this.localIntegrationFee.value = newVal;
      }
    },
    methods: {
      updateIntegrationFee() {
        // Clear the value if the type is changed to 'No Integration Fee'
        if (!this.localIntegrationFee.type) {
          this.localIntegrationFee.value = null;
        }
        
        // Initialize a default value if changing to a fee type
        if (this.localIntegrationFee.type && this.localIntegrationFee.value === null) {
          this.localIntegrationFee.value = this.localIntegrationFee.type === 'percentage' ? 0.1 : 15;
        }
        
        // Emit separate events for each property
        this.$emit('update:integration-fee-type', this.localIntegrationFee.type);
        this.$emit('update:integration-fee-value', this.localIntegrationFee.value);
      }
    }
  };
  </script>
  
  <style scoped>
  .integration-fee-form {
    background-color: #f9f9f9;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 20px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  h3 {
    margin-top: 0;
    margin-bottom: 15px;
    color: #333;
  }
  
  .form-row {
    display: flex;
    gap: 15px;
    margin-bottom: 15px;
  }
  
  .form-group {
    flex: 1;
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
  
  .error-input {
    border-color: #f44336 !important;
    background-color: #fff8f8 !important;
  }
  
  .error-text {
    color: #f44336;
    font-size: 12px;
    margin-top: 4px;
    display: block;
  }
  
  .fee-explanation {
    margin-top: 10px;
    padding: 10px;
    background-color: #f5f5f5;
    border-left: 4px solid #4a6cf7;
    font-size: 14px;
  }
  
  .fee-explanation p {
    margin: 5px 0;
    color: #555;
  }
  
  .fee-preview {
    margin-top: 20px;
    padding: 15px;
    background-color: #e8f5e9;
    border-radius: 4px;
    border: 1px solid #c8e6c9;
  }
  
  .preview-row {
    display: flex;
    justify-content: space-between;
    padding: 5px 0;
  }
  
  .preview-row.total {
    font-weight: bold;
    margin-top: 5px;
    padding-top: 5px;
    border-top: 1px solid #a5d6a7;
  }
  
  .preview-row .label {
    font-weight: 500;
    color: #388e3c;
  }
  
  .preview-row .value {
    font-weight: 500;
  }
  </style>