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
  
            <!-- This is where our CargoInsurance component is used -->
            <CargoInsurance />
  
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
                <span class="value insurance-cost">TBD</span>
              </div>
              <div class="cost-row total">
                <span class="label">Total:</span>
                <span class="value">$460.75</span>
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
          © 2025 FreightShip Pro. All rights reserved.
        </div>
      </footer>
    </div>
  </template>
  
  <script>
  import CargoInsurance from './components/CargoInsurance.vue';
  
  export default {
    name: 'App',
    components: {
      CargoInsurance
    },
    data() {
      return {
        insuranceSelected: false
      };
    }
  };
  </script>