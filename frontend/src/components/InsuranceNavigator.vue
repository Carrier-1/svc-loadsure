<template>
    <div class="insurance-navigator">
      <div class="nav-tabs">
        <button 
          @click="activeTab = 'new'" 
          :class="{ active: activeTab === 'new' }"
          class="nav-tab"
        >
          New Quote
        </button>
        <button 
          @click="activeTab = 'quotes'" 
          :class="{ active: activeTab === 'quotes' }"
          class="nav-tab"
        >
          Previous Quotes
        </button>
        <button 
          @click="activeTab = 'certificates'" 
          :class="{ active: activeTab === 'certificates' }"
          class="nav-tab"
        >
          Certificates
        </button>
      </div>
      
      <div class="tab-content">
        <!-- New Quote Form -->
        <div v-if="activeTab === 'new'" class="tab-pane">
          <CargoInsurance ref="cargoInsurance" @quote-created="handleQuoteCreated" />
        </div>
        
        <!-- Previous Quotes -->
        <div v-if="activeTab === 'quotes'" class="tab-pane">
          <PreviousQuotes @use-quote="handleUseQuote" />
        </div>
        
        <!-- Certificates -->
        <div v-if="activeTab === 'certificates'" class="tab-pane">
          <PreviousCertificates @renew-certificate="handleRenewCertificate" />
        </div>
      </div>
    </div>
  </template>
  
  <script>
  import CargoInsurance from './CargoInsurance.vue';
  import PreviousQuotes from './PreviousQuotes.vue';
  import PreviousCertificates from './PreviousCertificates.vue';
  
  export default {
    name: 'InsuranceNavigator',
    components: {
      CargoInsurance,
      PreviousQuotes,
      PreviousCertificates
    },
    data() {
      return {
        activeTab: 'new'
      };
    },
    methods: {
      handleQuoteCreated() {
        // After a quote is created, we could potentially switch to the quotes tab
        // setTimeout(() => {
        //   this.activeTab = 'quotes';
        // }, 2000);
      },
      
      handleUseQuote(quote) {
        // Switch to the new quote tab
        this.activeTab = 'new';
        
        // Wait for the component to be ready
        this.$nextTick(() => {
          // Call the populateFormFromQuote method on the CargoInsurance component
          if (this.$refs.cargoInsurance) {
            this.$refs.cargoInsurance.populateFormFromQuote(quote);
          }
        });
      },
      
      handleRenewCertificate(certificate) {
        // Switch to the new quote tab
        this.activeTab = 'new';
        
        // Wait for the component to be ready
        this.$nextTick(() => {
          // Call the populateFormFromCertificate method on the CargoInsurance component
          if (this.$refs.cargoInsurance) {
            this.$refs.cargoInsurance.populateFormFromCertificate(certificate);
          }
        });
      }
    }
  };
  </script>
  
  <style scoped>
  .insurance-navigator {
    width: 100%;
    max-width: 100%;
    margin: 0 auto;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  }
  
  .nav-tabs {
    display: flex;
    border-bottom: 1px solid #ddd;
    margin-bottom: 20px;
  }
  
  .nav-tab {
    padding: 12px 20px;
    background: none;
    border: none;
    border-bottom: 3px solid transparent;
    color: #555;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s;
  }
  
  .nav-tab:hover {
    color: #4a6cf7;
  }
  
  .nav-tab.active {
    color: #4a6cf7;
    border-bottom-color: #4a6cf7;
  }
  
  .tab-content {
    position: relative;
    min-height: 400px;
  }
  
  .tab-pane {
    width: 100%;
  }
  
  /* Animation for tab transitions */
  .tab-pane-enter-active, .tab-pane-leave-active {
    transition: opacity 0.3s, transform 0.3s;
  }
  
  .tab-pane-enter, .tab-pane-leave-to {
    opacity: 0;
    transform: translateY(10px);
  }
  
  .tab-pane-enter-to, .tab-pane-leave {
    opacity: 1;
    transform: translateY(0);
  }
  
  /* Responsive styles */
  @media (max-width: 600px) {
    .nav-tabs {
      flex-direction: column;
      border-bottom: none;
    }
    
    .nav-tab {
      padding: 10px;
      text-align: left;
      border-left: 3px solid transparent;
      border-bottom: 1px solid #eee;
    }
    
    .nav-tab.active {
      border-left-color: #4a6cf7;
      border-bottom-color: #eee;
      background-color: #f5f7ff;
    }
  }
  </style>