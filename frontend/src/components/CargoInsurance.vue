<template>
    <div class="cargo-insurance">
      <h2>Cargo Insurance</h2>
      
      <InsuranceFormContainer ref="insuranceForm" />
    </div>
  </template>
  
  <script>
  import InsuranceFormContainer from './InsuranceFormContainer.vue';
  
  export default {
    name: 'CargoInsurance',
    components: {
      InsuranceFormContainer
    },
    mounted() {
      // Listen for insurance selection events from the InsuranceFormContainer
      this.$root.$on('insurance-selected', (data) => {
        this.updateInsuranceSelection(data);
      });
      
      // Listen for insurance cancellation
      this.$root.$on('insurance-canceled', () => {
        this.emitInsuranceCanceled();
      });
    },
    beforeUnmount() {
      // Clean up event listeners
      this.$root.$off('insurance-selected');
      this.$root.$off('insurance-canceled');
    },
    methods: {
      // Update insurance selection - emit event to parent component
      updateInsuranceSelection(data) {
        if (data) {
          this.$emit('insurance-selected', data);
        }
      },
      
      // Emit insurance canceled event to parent component
      emitInsuranceCanceled() {
        this.$emit('insurance-canceled');
      },
      
      // Public method to populate form from a quote
      populateFormFromQuote(quote) {
        if (this.$refs.insuranceForm) {
          this.$refs.insuranceForm.populateFormFromQuote(quote);
        }
      },
      
      // Public method to populate form from a certificate
      populateFormFromCertificate(certificate) {
        if (this.$refs.insuranceForm) {
          this.$refs.insuranceForm.populateFormFromCertificate(certificate);
        }
      }
    }
  };
  </script>
  
  <style scoped>
  .cargo-insurance {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    padding: 20px 0;
  }
  
  h2 {
    color: #333;
    margin-bottom: 20px;
    text-align: center;
  }
  </style>