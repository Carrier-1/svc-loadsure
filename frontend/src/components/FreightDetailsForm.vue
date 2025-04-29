<template>
    <div class="freight-details-form">
      <h3>Freight Details</h3>
      
      <div class="form-group">
        <label for="freight-description">Description <span class="required">*</span></label>
        <input 
          id="freight-description" 
          v-model="localDetails.description" 
          type="text" 
          placeholder="E.g., Electronics, Furniture, etc."
          :class="{'error-input': validationErrors.description}"
          @input="updateFreightDetails"
        >
        <span class="error-text" v-if="validationErrors.description">{{ validationErrors.description }}</span>
      </div>
      
      <div class="form-group">
        <label for="freight-value">Cargo Value ($) <span class="required">*</span></label>
        <input 
          id="freight-value" 
          v-model.number="localDetails.value" 
          type="number" 
          min="1" 
          step="1"
          :class="{'error-input': validationErrors.value}"
          @input="updateFreightDetails"
        >
        <span class="error-text" v-if="validationErrors.value">{{ validationErrors.value }}</span>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="freight-currency">Currency</label>
          <select 
            id="freight-currency" 
            v-model="localDetails.currency"
            @change="updateFreightDetails"
          >
            <option value="USD">USD</option>
            <option value="CAD">CAD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="equipment-type">Equipment Type</label>
          <select 
            id="equipment-type" 
            v-model="localDetails.equipmentTypeId"
            @change="updateFreightDetails"
          >
            <option v-for="type in equipmentTypes" :key="type.id" :value="type.id">
              {{ type.name }}
            </option>
          </select>
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="load-type">Load Type</label>
          <select 
            id="load-type" 
            v-model="localDetails.loadTypeId"
            @change="updateFreightDetails"
          >
            <option v-for="type in loadTypes" :key="type.id" :value="type.id">
              {{ type.name }}
            </option>
          </select>
        </div>
      </div>
      
      <div class="form-section">
        <h4>Dimensions & Weight</h4>
        <div class="form-row">
          <div class="form-group">
            <label for="dimension-length">Length</label>
            <input 
              id="dimension-length" 
              v-model.number="localDetails.dimensionLength" 
              type="number" 
              min="1" 
              step="1"
              @input="updateFreightDetails"
            >
          </div>
          
          <div class="form-group">
            <label for="dimension-width">Width</label>
            <input 
              id="dimension-width" 
              v-model.number="localDetails.dimensionWidth" 
              type="number" 
              min="1" 
              step="1"
              @input="updateFreightDetails"
            >
          </div>
          
          <div class="form-group">
            <label for="dimension-height">Height</label>
            <input 
              id="dimension-height" 
              v-model.number="localDetails.dimensionHeight" 
              type="number" 
              min="1" 
              step="1"
              @input="updateFreightDetails"
            >
          </div>
          
          <div class="form-group">
            <label for="dimension-unit">Unit</label>
            <select 
              id="dimension-unit" 
              v-model="localDetails.dimensionUnit"
              @change="updateFreightDetails"
            >
              <option value="in">Inches</option>
              <option value="cm">Centimeters</option>
              <option value="ft">Feet</option>
              <option value="m">Meters</option>
            </select>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="weight-value">Weight</label>
            <input 
              id="weight-value" 
              v-model.number="localDetails.weightValue" 
              type="number" 
              min="1" 
              step="1"
              @input="updateFreightDetails"
            >
          </div>
          
          <div class="form-group">
            <label for="weight-unit">Unit</label>
            <select 
              id="weight-unit" 
              v-model="localDetails.weightUnit"
              @change="updateFreightDetails"
            >
              <option value="lbs">Pounds (lbs)</option>
              <option value="kg">Kilograms (kg)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    name: 'FreightDetailsForm',
    props: {
      freightDetails: {
        type: Object,
        required: true
      },
      validationErrors: {
        type: Object,
        default: () => ({})
      },
      equipmentTypes: {
        type: Array,
        default: () => []
      },
      loadTypes: {
        type: Array,
        default: () => []
      }
    },
    data() {
      return {
        localDetails: { ...this.freightDetails }
      };
    },
    watch: {
      freightDetails: {
        handler(newVal) {
          this.localDetails = { ...newVal };
        },
        deep: true
      }
    },
    methods: {
      updateFreightDetails() {
        this.$emit('update:freightDetails', this.localDetails);
      }
    }
  };
  </script>
  
  <style scoped>
  .freight-details-form {
    background-color: #f9f9f9;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 20px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .form-group {
    margin-bottom: 15px;
    flex: 1;
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
  
  .required {
    color: #f44336;
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
  
  .form-section {
    margin-top: 20px;
    padding-top: 10px;
    border-top: 1px solid #eee;
  }
  
  h4 {
    margin-top: 0;
    margin-bottom: 15px;
    color: #333;
  }
  </style>