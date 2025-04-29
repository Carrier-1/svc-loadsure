<template>
    <div class="stops-form">
      <h4>Shipping Route <span class="required">*</span></h4>
      
      <div v-for="(stop, index) in localStops" :key="`stop-${index}`" class="stop-item">
        <div class="stop-header">
          <h5>{{ getStopTypeLabel(stop.stopType) }} #{{ stop.stopNumber }}</h5>
          <button 
            type="button" 
            @click="removeStop(index)" 
            class="remove-btn" 
            :disabled="index < 2" 
            v-if="index >= 2"
          >
            &times;
          </button>
        </div>
        
        <div class="form-row">
          <div class="form-group flex-grow">
            <label :for="`stop-date-${index}`">Date</label>
            <input 
              :id="`stop-date-${index}`" 
              v-model="stop.date" 
              type="date" 
              :class="{'error-input': validationErrors[`stops[${index}].date`]}"
              @input="updateStops"
            >
            <span class="error-text" v-if="validationErrors[`stops[${index}].date`]">
              {{ validationErrors[`stops[${index}].date`] }}
            </span>
          </div>
          
          <div class="form-group flex-grow" v-if="index > 1">
            <label :for="`stop-type-${index}`">Stop Type</label>
            <select 
              :id="`stop-type-${index}`" 
              v-model="stop.stopType"
              @change="updateStops"
            >
              <option value="INTERMEDIATE">Intermediate Stop</option>
              <option value="CONSOLIDATION">Consolidation</option>
              <option value="DECONSOLIDATION">Deconsolidation</option>
            </select>
          </div>
        </div>
        
        <div class="address-section">
          <h6>Address</h6>
          
          <div class="form-row">
            <div class="form-group flex-grow">
              <label :for="`stop-address1-${index}`">Address Line 1</label>
              <input 
                :id="`stop-address1-${index}`" 
                v-model="stop.address.address1" 
                type="text" 
                placeholder="Street address"
                @input="updateStops"
              >
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group flex-grow">
              <label :for="`stop-address2-${index}`">Address Line 2</label>
              <input 
                :id="`stop-address2-${index}`" 
                v-model="stop.address.address2" 
                type="text" 
                placeholder="Apt, Suite, Unit, etc. (optional)"
                @input="updateStops"
              >
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group flex-grow">
              <label :for="`stop-city-${index}`">City <span class="required">*</span></label>
              <input 
                :id="`stop-city-${index}`" 
                v-model="stop.address.city" 
                type="text" 
                :class="{'error-input': validationErrors[`stops[${index}].address.city`]}"
                @input="updateStops"
              >
              <span class="error-text" v-if="validationErrors[`stops[${index}].address.city`]">
                {{ validationErrors[`stops[${index}].address.city`] }}
              </span>
            </div>
            
            <div class="form-group">
              <label :for="`stop-state-${index}`">State <span class="required">*</span></label>
              <input 
                :id="`stop-state-${index}`" 
                v-model="stop.address.state" 
                type="text" 
                :class="{'error-input': validationErrors[`stops[${index}].address.state`]}"
                @input="updateStops"
              >
              <span class="error-text" v-if="validationErrors[`stops[${index}].address.state`]">
                {{ validationErrors[`stops[${index}].address.state`] }}
              </span>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label :for="`stop-postal-${index}`">Postal Code</label>
              <input 
                :id="`stop-postal-${index}`" 
                v-model="stop.address.postal" 
                type="text" 
                @input="updateStops"
              >
            </div>
            
            <div class="form-group flex-grow">
              <label :for="`stop-country-${index}`">Country</label>
              <select 
                :id="`stop-country-${index}`" 
                v-model="stop.address.country"
                @change="updateStops"
              >
                <option value="USA">United States</option>
                <option value="CAN">Canada</option>
                <option value="MEX">Mexico</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      
      <span class="error-text" v-if="validationErrors.stops">{{ validationErrors.stops }}</span>
      
      <div class="stops-actions">
        <button type="button" @click="addStop" class="add-btn">Add Intermediate Stop</button>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    name: 'StopsForm',
    props: {
      stops: {
        type: Array,
        required: true
      },
      validationErrors: {
        type: Object,
        default: () => ({})
      }
    },
    data() {
      return {
        localStops: JSON.parse(JSON.stringify(this.stops))
      };
    },
    watch: {
      stops: {
        handler(newVal) {
          this.localStops = JSON.parse(JSON.stringify(newVal));
        },
        deep: true
      }
    },
    methods: {
      updateStops() {
        this.$emit('update:stops', this.localStops);
      },
      
      addStop() {
        const newStopNumber = this.localStops.length + 1;
        
        // Default to halfway date between origin and destination
        const originDate = new Date(this.localStops[0].date);
        const destDate = new Date(this.localStops[1].date);
        const middleTimestamp = (originDate.getTime() + destDate.getTime()) / 2;
        const middleDate = new Date(middleTimestamp);
        
        // Format date as YYYY-MM-DD
        const formattedDate = this.formatDateForInput(middleDate);
        
        // Create new stop with default values
        this.localStops.push({
          stopType: 'INTERMEDIATE',
          stopNumber: newStopNumber,
          date: formattedDate,
          address: {
            address1: '',
            address2: '',
            city: '',
            state: '',
            postal: '',
            country: 'USA'
          }
        });
        
        this.updateStops();
      },
      
      removeStop(index) {
        // Don't allow removing the first two stops (origin and destination)
        if (index >= 2 && this.localStops.length > 2) {
          this.localStops.splice(index, 1);
          
          // Update stop numbers
          this.localStops.forEach((stop, i) => {
            stop.stopNumber = i + 1;
          });
          
          this.updateStops();
        }
      },
      
      getStopTypeLabel(stopType) {
        switch (stopType) {
          case 'PICKUP': return 'Origin';
          case 'DELIVERY': return 'Destination';
          case 'INTERMEDIATE': return 'Intermediate Stop';
          case 'CONSOLIDATION': return 'Consolidation Point';
          case 'DECONSOLIDATION': return 'Deconsolidation Point';
          default: return 'Stop';
        }
      },
      
      formatDateForInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
      }
    }
  };
  </script>
  
  <style scoped>
  .stops-form {
    margin-bottom: 25px;
  }
  
  .stop-item {
    background-color: white;
    border-radius: 6px;
    padding: 15px;
    margin-bottom: 15px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    position: relative;
  }
  
  .stop-item:first-child {
    border-left: 4px solid #4caf50; /* Green for origin */
  }
  
  .stop-item:nth-child(2) {
    border-left: 4px solid #f44336; /* Red for destination */
  }
  
  .stop-item:not(:first-child):not(:nth-child(2)) {
    border-left: 4px solid #2196f3; /* Blue for intermediate stops */
  }
  
  .stop-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
  }
  
  .stop-header h5 {
    margin: 0;
    font-size: 16px;
    color: #333;
  }
  
  .address-section {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid #eee;
  }
  
  .address-section h6 {
    margin: 0 0 10px 0;
    font-size: 14px;
    color: #555;
  }
  
  .form-row {
    display: flex;
    gap: 15px;
    margin-bottom: 15px;
  }
  
  .form-group {
    margin-bottom: 0;
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
  
  .stops-actions {
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