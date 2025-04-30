<template>
  <div class="cargo-insurance">
    <h2>Cargo Insurance</h2>
    
    <InsuranceFormContainer ref="insuranceForm" @insurance-selected="handleQuoteCreated" />
  </div>
</template>

<script>
import InsuranceFormContainer from './InsuranceFormContainer.vue';
import emitter from '../eventBus.js';

export default {
  name: 'CargoInsurance',
  components: {
    InsuranceFormContainer
  },
  methods: {
    // Handle insurance selection - emit event to parent component
    handleQuoteCreated(data) {
      this.$emit('quote-created');
      emitter.emit('insurance-selected', data);
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