<template>
    <div class="carriers-form">
      <h4>Carrier Information <span class="required">*</span></h4>
      
      <div v-for="(carrier, index) in localCarriers" :key="`carrier-${index}`" class="carrier-item">
        <div class="carrier-header">
          <h5>Carrier #{{ index + 1 }}</h5>
          <button 
            type="button" 
            @click="removeCarrier(index)" 
            class="remove-btn" 
            :disabled="localCarriers.length <= 1"
          >
            &times;
          </button>
        </div>
        
        <div class="form-row">
          <div class="form-group flex-grow">
            <label :for="`carrier-name-${index}`">Carrier Name <span class="required">*</span></label>
            <input 
              :id="`carrier-name-${index}`" 
              v-model="carrier.name" 
              type="text" 
              placeholder="Carrier company name"
              :class="{'error-input': validationErrors[`carriers[${index}].name`]}"
              @input="updateCarriers"
            >
            <span class="error-text" v-if="validationErrors[`carriers[${index}].name`]">
              {{ validationErrors[`carriers[${index}].name`] }}
            </span>
          </div>
          
          <div class="form-group">
            <label :for="`carrier-mode-${index}`">Mode</label>
            <select 
              :id="`carrier-mode-${index}`" 
              v-model="carrier.mode"
              @change="updateCarriers"
            >
              <option value="ROAD">Road</option>
              <option value="RAIL">Rail</option>
              <option value="SEA">Sea</option>
              <option value="AIR">Air</option>
            </select>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group flex-grow">
            <label :for="`carrier-email-${index}`">Email</label>
            <input 
              :id="`carrier-email-${index}`" 
              v-model="carrier.email" 
              type="email" 
              placeholder="carrier@example.com"
              :class="{'error-input': validationErrors[`carriers[${index}].email`]}"
              @input="updateCarriers"
            >
            <span class="error-text" v-if="validationErrors[`carriers[${index}].email`]">
              {{ validationErrors[`carriers[${index}].email`] }}
            </span>
          </div>
          
          <div class="form-group">
            <label :for="`carrier-phone-${index}`">Phone</label>
            <input 
              :id="`carrier-phone-${index}`" 
              v-model="carrier.phone" 
              type="tel" 
              placeholder="555-123-4567"
              @input="updateCarriers"
            >
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label :for="`carrier-id-type-${index}`">ID Type</label>
            <select 
              :id="`carrier-id-type-${index}`" 
              v-model="carrier.carrierId.type"
              @change="updateCarriers"
            >
              <option value="USDOT">USDOT</option>
              <option value="MC">MC Number</option>
              <option value="SCAC">SCAC Code</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          
          <div class="form-group flex-grow">
            <label :for="`carrier-id-value-${index}`">ID Number</label>
            <input 
              :id="`carrier-id-value-${index}`" 
              v-model="carrier.carrierId.value" 
              type="text" 
              placeholder="ID number"
              @input="updateCarriers"
            >
          </div>
        </div>
        
        <div class="form-group">
          <label :for="`carrier-equipment-${index}`">Equipment Type</label>
          <select 
            :id="`carrier-equipment-${index}`" 
            v-model="carrier.equipmentType"
            @change="updateCarriers"
          >
            <option v-for="type in equipmentTypes" :key="type.id" :value="type.id">
              {{ type.name }}
            </option>
          </select>
        </div>
      </div>
      
      <span class="error-text" v-if="validationErrors.carriers">{{ validationErrors.carriers }}</span>
      
      <div class="carriers-actions">
        <button type="button" @click="addCarrier" class="add-btn">Add Another Carrier</button>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    name: 'CarriersForm',
    props: {
      carriers: {
        type: Array,
        required: true
      },
      equipmentTypes: {
        type: Array,
        default: () => []
      },
      validationErrors: {
        type: Object,
        default: () => ({})
      }
    },
    data() {
      return {
        localCarriers: JSON.parse(JSON.stringify(this.carriers))
      };
    },
    watch: {
      carriers: {
        handler(newVal) {
          this.localCarriers = JSON.parse(JSON.stringify(newVal));
        },
        deep: true
      }
    },
    methods: {
      updateCarriers() {
        this.$emit('update:carriers', this.localCarriers);
      },
      
      addCarrier() {
        // Create a new carrier with default values
        const defaultEquipmentType = this.equipmentTypes.length > 0 ? this.equipmentTypes[0].id : null;
        
        this.localCarriers.push({
          mode: 'ROAD',
          name: '',
          email: '',
          phone: '',
          carrierId: {
            type: 'USDOT',
            value: ''
          },
          equipmentType: defaultEquipmentType
        });
        
        this.updateCarriers();
      },
      
      removeCarrier(index) {
        if (this.localCarriers.length > 1) {
          this.localCarriers.splice(index, 1);
          this.updateCarriers();
        }
      }
    }
  };
  </script>
  
  <style scoped>
  .carriers-form {
    margin-bottom: 25px;
  }
  
  .carrier-item {
    background-color: white;
    border-radius: 6px;
    padding: 15px;
    margin-bottom: 15px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .carrier-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
  }
  
  .carrier-header h5 {
    margin: 0;
    font-size: 16px;
    color: #333;
  }
  
  .form-row {
    display: flex;
    gap: 15px;
    margin-bottom: 15px;
  }
  
  .form-group {
    margin-bottom: 15px;
  }
  
  .flex-grow {
    flex-grow: 1;
  }
  
  label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
    font-size: 13px;
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
    margin-bottom: 15px;
  }
  
  .carriers-actions {
    margin-top: 10px;
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
    width: 28px;
    height: 28px;
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
  </style>