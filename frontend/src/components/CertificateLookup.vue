<template>
    <div class="certificate-lookup">
      <h3>Already Have a Certificate?</h3>
      <p class="lookup-description">
        Enter your certificate number below to retrieve your insurance certificate details.
      </p>
      
      <div class="lookup-form">
        <div class="form-row">
          <div class="form-group flex-grow">
            <label for="certificate-number">Certificate Number</label>
            <input 
              id="certificate-number" 
              v-model="certificateNumber" 
              type="text" 
              placeholder="Enter your certificate number"
              :class="{'error-input': error}"
            >
            <span class="error-text" v-if="error">{{ error }}</span>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group flex-grow">
            <label for="user-id">User Email/ID</label>
            <input 
              id="user-id" 
              v-model="userId" 
              type="email" 
              placeholder="Enter the email used for the certificate"
            >
            <span class="help-text">This helps us locate your certificate in our system.</span>
          </div>
        </div>
        
        <div class="lookup-actions">
          <div class="loading-indicator" v-if="loading">
            <div class="spinner"></div>
            <span>Looking up certificate...</span>
          </div>
          
          <button 
            @click="getCertificate" 
            :disabled="!isFormValid || loading" 
            class="lookup-btn"
          >
            Look Up Certificate
          </button>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    name: 'CertificateLookup',
    data() {
      return {
        certificateNumber: '',
        userId: '',
        loading: false,
        error: null
      };
    },
    computed: {
      isFormValid() {
        return this.certificateNumber.trim() !== '' && this.userId.trim() !== '';
      }
    },
    methods: {
      getCertificate() {
        if (!this.isFormValid) return;
        
        this.loading = true;
        this.error = null;
        
        // Emit event to parent component to handle certificate retrieval
        this.$emit('get-certificate', {
          certificateNumber: this.certificateNumber,
          userId: this.userId
        });
        
        // This component doesn't handle API calls directly
        // The parent will update the loading state as needed
      },
      
      // External method to be called from parent when lookup is complete
      lookupComplete(success, errorMessage) {
        this.loading = false;
        if (!success) {
          this.error = errorMessage || 'Certificate not found. Please check the certificate number and try again.';
        }
      },
      
      // Reset form
      resetForm() {
        this.certificateNumber = '';
        this.userId = '';
        this.error = null;
      }
    }
  };
  </script>
  
  <style scoped>
  .certificate-lookup {
    background-color: #f0f8ff;
    padding: 20px;
    border-radius: 8px;
    margin-top: 30px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  h3 {
    margin-top: 0;
    margin-bottom: 10px;
    color: #2c3e50;
  }
  
  .lookup-description {
    margin-bottom: 20px;
    color: #555;
    font-size: 14px;
  }
  
  .lookup-form {
    background-color: white;
    padding: 20px;
    border-radius: 6px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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
  }
  
  input {
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
  
  .help-text {
    color: #777;
    font-size: 12px;
    margin-top: 4px;
    display: block;
  }
  
  .lookup-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 20px;
  }
  
  .loading-indicator {
    display: flex;
    align-items: center;
    margin-right: auto;
  }
  
  .spinner {
    border: 2px solid rgba(0, 0, 0, 0.1);
    border-radius: 50%;
    border-top: 2px solid #4a6cf7;
    width: 20px;
    height: 20px;
    animation: spin 1s linear infinite;
    margin-right: 10px;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .lookup-btn {
    background-color: #4a6cf7;
    color: white;
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .lookup-btn:hover:not(:disabled) {
    background-color: #3a5bd9;
  }
  
  .lookup-btn:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
  </style>