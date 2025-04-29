<template>
    <div class="user-info-form">
      <h3>Account Information</h3>
      
      <!-- User Information -->
      <div class="section">
        <h4>Your Information <span class="required">*</span></h4>
        <div class="form-row">
          <div class="form-group">
            <label for="user-name">Your Name</label>
            <input 
              id="user-name" 
              v-model="localUser.name" 
              type="text" 
              placeholder="Your Full Name"
              :class="{'error-input': validationErrors.userName}"
              @input="updateUser"
            >
            <span class="error-text" v-if="validationErrors.userName">{{ validationErrors.userName }}</span>
          </div>
          
          <div class="form-group">
            <label for="user-email">Your Email</label>
            <input 
              id="user-email" 
              v-model="localUser.email" 
              type="email" 
              placeholder="you@example.com"
              :class="{'error-input': validationErrors.userEmail}"
              @input="updateUserEmail"
            >
            <span class="error-text" v-if="validationErrors.userEmail">{{ validationErrors.userEmail }}</span>
          </div>
        </div>
      </div>
      
      <!-- Assured Information -->
      <div class="section">
        <h4>Company Information <span class="required">*</span></h4>
        <div class="form-row">
          <div class="form-group">
            <label for="assured-name">Company Name</label>
            <input 
              id="assured-name" 
              v-model="localAssured.name" 
              type="text" 
              placeholder="Company Name"
              :class="{'error-input': validationErrors.assuredName}"
              @input="updateAssured"
            >
            <span class="error-text" v-if="validationErrors.assuredName">{{ validationErrors.assuredName }}</span>
          </div>
          
          <div class="form-group">
            <label for="assured-email">Company Email</label>
            <input 
              id="assured-email" 
              v-model="localAssured.email" 
              type="email" 
              placeholder="company@example.com"
              :class="{'error-input': validationErrors.assuredEmail}"
              @input="updateAssured"
            >
            <span class="error-text" v-if="validationErrors.assuredEmail">{{ validationErrors.assuredEmail }}</span>
          </div>
        </div>
        
        <div class="address-section">
          <h5>Company Address</h5>
          
          <div class="form-row">
            <div class="form-group flex-grow">
              <label for="assured-address1">Address Line 1</label>
              <input 
                id="assured-address1" 
                v-model="localAssured.address.address1" 
                type="text" 
                placeholder="Street address"
                @input="updateAssured"
              >
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group flex-grow">
              <label for="assured-address2">Address Line 2</label>
              <input 
                id="assured-address2" 
                v-model="localAssured.address.address2" 
                type="text" 
                placeholder="Apt, Suite, Unit, etc. (optional)"
                @input="updateAssured"
              >
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group flex-grow">
              <label for="assured-city">City</label>
              <input 
                id="assured-city" 
                v-model="localAssured.address.city" 
                type="text" 
                @input="updateAssured"
              >
            </div>
            
            <div class="form-group">
              <label for="assured-state">State</label>
              <input 
                id="assured-state" 
                v-model="localAssured.address.state" 
                type="text" 
                @input="updateAssured"
              >
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="assured-postal">Postal Code</label>
              <input 
                id="assured-postal" 
                v-model="localAssured.address.postal" 
                type="text" 
                @input="updateAssured"
              >
            </div>
            
            <div class="form-group flex-grow">
              <label for="assured-country">Country</label>
              <select 
                id="assured-country" 
                v-model="localAssured.address.country"
                @change="updateAssured"
              >
                <option value="USA">United States</option>
                <option value="CAN">Canada</option>
                <option value="MEX">Mexico</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Synchronize from Origin -->
      <div class="actions">
        <button type="button" @click="syncAddressFromOrigin" class="sync-btn">
          Autofill company address from origin
        </button>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    name: 'UserInfoForm',
    props: {
      user: {
        type: Object,
        required: true
      },
      assured: {
        type: Object,
        required: true
      },
      stops: {
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
        localUser: { ...this.user },
        localAssured: JSON.parse(JSON.stringify(this.assured))
      };
    },
    watch: {
      user: {
        handler(newVal) {
          this.localUser = { ...newVal };
        },
        deep: true
      },
      assured: {
        handler(newVal) {
          this.localAssured = JSON.parse(JSON.stringify(newVal));
        },
        deep: true
      }
    },
    methods: {
      updateUser() {
        this.$emit('update:user', this.localUser);
      },
      
      updateUserEmail() {
        // Update the user email and set the ID to the email
        this.localUser.id = this.localUser.email;
        this.updateUser();
      },
      
      updateAssured() {
        this.$emit('update:assured', this.localAssured);
      },
      
      syncAddressFromOrigin() {
        // Get origin stop (first stop)
        if (this.stops && this.stops.length > 0) {
          const originStop = this.stops[0];
          if (originStop && originStop.address) {
            // Copy origin address to assured address
            this.localAssured.address = {
              ...this.localAssured.address,
              address1: originStop.address.address1 || this.localAssured.address.address1,
              address2: originStop.address.address2 || this.localAssured.address.address2,
              city: originStop.address.city || this.localAssured.address.city,
              state: originStop.address.state || this.localAssured.address.state,
              postal: originStop.address.postal || this.localAssured.address.postal,
              country: originStop.address.country || this.localAssured.address.country
            };
            
            this.updateAssured();
          }
        }
      }
    }
  };
  </script>
  
  <style scoped>
  .user-info-form {
    background-color: #f9f9f9;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 20px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .section {
    margin-bottom: 25px;
  }
  
  .form-row {
    display: flex;
    gap: 15px;
    margin-bottom: 15px;
  }
  
  .form-group {
    flex: 1;
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
  }
  
  h3, h4, h5 {
    margin-top: 0;
    margin-bottom: 15px;
    color: #333;
  }
  
  h4 {
    font-size: 16px;
  }
  
  h5 {
    font-size: 14px;
    color: #555;
  }
  
  .address-section {
    margin-top: 15px;
    padding-top: 15px;
    border-top: 1px solid #eee;
  }
  
  .actions {
    margin-top: 20px;
  }
  
  .sync-btn {
    background-color: #4caf50;
    color: white;
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    display: inline-flex;
    align-items: center;
  }
  
  .sync-btn:hover {
    background-color: #388e3c;
  }
  
  .sync-btn:before {
    content: '↺';
    margin-right: 6px;
    font-size: 16px;
  }
  </style>