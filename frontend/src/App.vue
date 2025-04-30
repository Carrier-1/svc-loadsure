<template>
  <div id="app">
    <header>
      <div class="header-container">
        <div class="logo">
          <img src="https://carrier1.com/#svg899472416_2078" alt="Company Logo">
          <h1>Carrier1</h1>
        </div>
        <nav>
          <ul>
            <li><a href="#" class="active">Shipping</a></li>
            <li><a href="#">Tracking</a></li>
            <li><a href="#">Account</a></li>
            <li><a href="#">Help</a></li>
          </ul>
        </nav>
      </div>
    </header>

    <main>
      <div class="container">
        <div class="shipping-workflow">
          <div class="workflow-header">
            <h2>Book Your Shipment</h2>
            <div class="steps">
              <div class="step completed">
                <div class="step-number">1</div>
                <div class="step-label">Details</div>
              </div>
              <div class="step active">
                <div class="step-number">2</div>
                <div class="step-label">Insurance</div>
              </div>
              <div class="step">
                <div class="step-number">3</div>
                <div class="step-label">Payment</div>
              </div>
              <div class="step">
                <div class="step-number">4</div>
                <div class="step-label">Confirmation</div>
              </div>
            </div>
          </div>

          <InsuranceNavigator ref="insuranceNavigator" @insurance-selected="updateInsuranceSelection" />

          <div class="workflow-navigation">
            <button class="back-btn">Back</button>
            <button class="next-btn" :disabled="!insuranceSelected">Continue to Payment</button>
          </div>
        </div>

        <div class="shipping-summary">
          <h3>Shipment Summary</h3>
          <div class="summary-details">
            <div class="summary-row">
              <span class="label">Origin:</span>
              <span class="value">Chicago, IL</span>
            </div>
            <div class="summary-row">
              <span class="label">Destination:</span>
              <span class="value">Denver, CO</span>
            </div>
            <div class="summary-row">
              <span class="label">Service:</span>
              <span class="value">LTL Standard</span>
            </div>
            <div class="summary-row">
              <span class="label">Est. Delivery:</span>
              <span class="value">3-5 Business Days</span>
            </div>
          </div>

          <div class="cost-summary">
            <h4>Cost Breakdown</h4>
            <div class="cost-row">
              <span class="label">Base Rate:</span>
              <span class="value">$425.00</span>
            </div>
            <div class="cost-row">
              <span class="label">Fuel Surcharge:</span>
              <span class="value">$35.75</span>
            </div>
            <div class="cost-row">
              <span class="label">Insurance:</span>
              <span class="value insurance-cost">{{ insuranceAmount }}</span>
            </div>
            <!-- Add integration fee row if applicable -->
            <div class="cost-row" v-if="integrationFeeAmount > 0">
              <span class="label">Integration Fee:</span>
              <span class="value integration-fee">${{ integrationFeeAmount.toFixed(2) }}</span>
            </div>
            <div class="cost-row total">
              <span class="label">Total:</span>
              <span class="value">${{ totalAmount.toFixed(2) }}</span>
            </div>
          </div>
        </div>
      </div>
    </main>

    <footer>
      <div class="footer-container">
        <div class="footer-section">
          <h4>Company</h4>
          <ul>
            <li><a href="#">About Us</a></li>
            <li><a href="#">Careers</a></li>
            <li><a href="#">Press</a></li>
          </ul>
        </div>
        <div class="footer-section">
          <h4>Resources</h4>
          <ul>
            <li><a href="#">Help Center</a></li>
            <li><a href="#">API Documentation</a></li>
            <li><a href="#">Partners</a></li>
          </ul>
        </div>
        <div class="footer-section">
          <h4>Legal</h4>
          <ul>
            <li><a href="#">Terms of Service</a></li>
            <li><a href="#">Privacy Policy</a></li>
            <li><a href="#">Cookie Policy</a></li>
          </ul>
        </div>
        <div class="footer-section">
          <h4>Connect</h4>
          <div class="social-links">
            <a href="#" class="social-icon">FB</a>
            <a href="#" class="social-icon">TW</a>
            <a href="#" class="social-icon">LI</a>
            <a href="#" class="social-icon">IG</a>
          </div>
        </div>
      </div>
      <div class="copyright">
        © 2025 Carrier1. All rights reserved.
      </div>
    </footer>
  </div>
</template>

<script>
import InsuranceNavigator from './components/InsuranceNavigator.vue';
import emitter from './eventBus.js';

export default {
  name: 'App',
  components: {
    InsuranceNavigator
  },
  data() {
    return {
      insuranceSelected: false,
      insuranceAmount: 'TBD',
      integrationFeeAmount: 0,
      baseAmount: 460.75 // Base rate + fuel surcharge
    };
  },
  computed: {
    totalAmount() {
      let total = this.baseAmount;
      
      // Add insurance amount if selected and it's a number
      if (this.insuranceSelected && typeof this.parsedInsuranceAmount === 'number') {
        total += this.parsedInsuranceAmount;
      }
      
      // Add integration fee if it exists
      if (this.integrationFeeAmount > 0) {
        total += this.integrationFeeAmount;
      }
      
      return total;
    },
    parsedInsuranceAmount() {
      if (this.insuranceAmount === 'TBD') return 0;
      
      // Extract the number from the string (remove $ and parse as float)
      const match = this.insuranceAmount.match(/\$?(\d+(\.\d+)?)/);
      return match ? parseFloat(match[1]) : 0;
    }
  },
  mounted() {
    // Listen for insurance cancellation
    emitter.on('insurance-canceled', () => {
      this.insuranceSelected = false;
      this.insuranceAmount = 'TBD';
      this.integrationFeeAmount = 0;
    });
  },
  beforeUnmount() {
    // Clean up event listeners
    emitter.off('insurance-canceled');
  },
  methods: {
    // Method to handle insurance selection updates
    updateInsuranceSelection(data) {
      if (data) {
        this.insuranceSelected = true;
        this.insuranceAmount = `$${data.premium.toFixed(2)}`;
        this.integrationFeeAmount = data.integrationFeeAmount ? parseFloat(data.integrationFeeAmount) : 0;
      } else {
        this.insuranceSelected = false;
        this.insuranceAmount = 'TBD';
        this.integrationFeeAmount = 0;
      }
    }
  }
};
</script>

<style>
/* Add styles for integration fee */
.integration-fee {
  color: var(--primary-color);
  font-weight: 500;
}
</style>