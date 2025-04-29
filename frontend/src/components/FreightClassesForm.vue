<template>
    <div class="freight-classes-form">
      <h4>Freight Classes <span class="required">*</span></h4>
      <div v-for="(freightClass, index) in localFreightClasses" :key="`freight-class-${index}`" class="freight-class-item">
        <div class="form-row">
          <div class="form-group flex-grow">
            <label :for="`freight-class-${index}`">Freight Class</label>
            <select 
              :id="`freight-class-${index}`" 
              v-model="freightClass.classId"
              :class="{'error-input': validationErrors.freightClasses}"
              @change="updateFreightClasses"
            >
              <option v-for="fc in freightClassOptions" :key="fc.id" :value="fc.id">
                {{ fc.name }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label :for="`freight-percentage-${index}`">Percentage (%)</label>
            <input 
              :id="`freight-percentage-${index}`" 
              v-model.number="freightClass.percentage" 
              type="number" 
              min="1" 
              max="100" 
              step="1"
              :class="{'error-input': validationErrors.freightClassPercentage}"
              @input="updateFreightClasses"
            >
          </div>
          <button 
            type="button" 
            @click="removeFreightClass(index)" 
            class="remove-btn" 
            :disabled="localFreightClasses.length <= 1"
          >
            &times;
          </button>
        </div>
      </div>
      
      <span class="error-text" v-if="validationErrors.freightClasses">{{ validationErrors.freightClasses }}</span>
      <span class="error-text" v-if="validationErrors.freightClassPercentage">{{ validationErrors.freightClassPercentage }}</span>
      
      <div class="freight-class-actions">
        <button type="button" @click="addFreightClass" class="add-btn">Add Another Freight Class</button>
      </div>
      
      <!-- Commodities Section -->
      <div class="commodities-section">
        <h4>Commodities <span class="required">*</span></h4>
        <div v-for="(commodity, index) in localCommodities" :key="`commodity-${index}`" class="commodity-item">
          <div class="form-row">
            <div class="form-group flex-grow">
              <label :for="`commodity-${index}`">Commodity</label>
              <select 
                :id="`commodity-${index}`" 
                v-model="commodity.id"
                :class="{'error-input': validationErrors.commodities}"
                @change="updateCommodities"
              >
                <option v-for="c in commodityOptions" :key="c.id" :value="c.id">
                  {{ c.name }}
                </option>
              </select>
            </div>
            <button 
              type="button" 
              @click="removeCommodity(index)" 
              class="remove-btn" 
              :disabled="localCommodities.length <= 1"
            >
              &times;
            </button>
          </div>
          
          <!-- Commodity exclusion warning -->
          <div class="exclusion-warning" v-if="hasCommodityExclusions(commodity.id)">
            <p>Warning: This commodity has the following exclusions:</p>
            <ul>
              <li v-for="(exclusion, i) in getCommodityExclusionsById(commodity.id)" :key="i">
                {{ exclusion.description }}
              </li>
            </ul>
          </div>
        </div>
        
        <span class="error-text" v-if="validationErrors.commodities">{{ validationErrors.commodities }}</span>
        
        <div class="commodity-actions">
          <button type="button" @click="addCommodity" class="add-btn">Add Another Commodity</button>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    name: 'FreightClassesForm',
    props: {
      freightClasses: {
        type: Array,
        required: true
      },
      commodities: {
        type: Array,
        required: true
      },
      freightClassOptions: {
        type: Array,
        default: () => []
      },
      commodityOptions: {
        type: Array,
        default: () => []
      },
      commodityExclusions: {
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
        localFreightClasses: JSON.parse(JSON.stringify(this.freightClasses)),
        localCommodities: JSON.parse(JSON.stringify(this.commodities))
      };
    },
    watch: {
      freightClasses: {
        handler(newVal) {
          this.localFreightClasses = JSON.parse(JSON.stringify(newVal));
        },
        deep: true
      },
      commodities: {
        handler(newVal) {
          this.localCommodities = JSON.parse(JSON.stringify(newVal));
        },
        deep: true
      }
    },
    methods: {
      updateFreightClasses() {
        this.$emit('update:freightClasses', this.localFreightClasses);
      },
      
      updateCommodities() {
        this.$emit('update:commodities', this.localCommodities);
      },
      
      addFreightClass() {
        // Create a new freight class with default values
        this.localFreightClasses.push({ 
          classId: this.localFreightClasses[0].classId, 
          percentage: 0 
        });
        this.updateFreightClassPercentages();
        this.updateFreightClasses();
      },
      
      removeFreightClass(index) {
        if (this.localFreightClasses.length > 1) {
          this.localFreightClasses.splice(index, 1);
          this.updateFreightClassPercentages();
          this.updateFreightClasses();
        }
      },
      
      updateFreightClassPercentages() {
        // Recalculate percentages to ensure they add up to 100%
        const count = this.localFreightClasses.length;
        const percentPerClass = Math.floor(100 / count);
        let remainder = 100 - (percentPerClass * count);
        
        this.localFreightClasses.forEach((fc, index) => {
          fc.percentage = percentPerClass + (index === 0 ? remainder : 0);
        });
      },
      
      addCommodity() {
        // Create a new commodity with default values
        this.localCommodities.push({ 
          id: this.localCommodities[0].id 
        });
        this.updateCommodities();
      },
      
      removeCommodity(index) {
        if (this.localCommodities.length > 1) {
          this.localCommodities.splice(index, 1);
          this.updateCommodities();
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
      }
    }
  };
  </script>
  
  <style scoped>
  .freight-classes-form {
    margin-bottom: 25px;
  }
  
  .freight-class-item, .commodity-item {
    background-color: white;
    border-radius: 6px;
    padding: 15px;
    margin-bottom: 15px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .commodities-section {
    margin-top: 20px;
    padding-top: 15px;
    border-top: 1px solid #eee;
  }
  
  .form-row {
    display: flex;
    gap: 15px;
    align-items: flex-end;
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
  
  .freight-class-actions, .commodity-actions {
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
    margin-bottom: 10px;
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
  </style>