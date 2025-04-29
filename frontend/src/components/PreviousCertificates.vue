<template>
    <div class="previous-certificates">
      <h2>Insurance Certificates</h2>
      
      <!-- Search and filters -->
      <div class="filters">
        <div class="search-box">
          <input 
            type="text" 
            v-model="searchTerm" 
            placeholder="Search certificates..." 
            @input="applyFilters"
          >
        </div>
        <div class="filter-options">
          <label>
            Status:
            <select v-model="statusFilter" @change="applyFilters">
              <option value="all">All</option>
              <option value="ACTIVE">Active</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </label>
          <label>
            Date Range:
            <select v-model="dateRangeFilter" @change="applyFilters">
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </label>
          <div v-if="dateRangeFilter === 'custom'" class="date-range-inputs">
            <input 
              type="date" 
              v-model="startDate" 
              @change="applyFilters"
            >
            <span>to</span>
            <input 
              type="date" 
              v-model="endDate" 
              @change="applyFilters"
            >
          </div>
        </div>
      </div>
      
      <!-- Loading indicator -->
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <p>Loading certificates...</p>
      </div>
      
      <!-- Error message -->
      <div v-if="error" class="error-message">
        <p>{{ error }}</p>
        <button @click="fetchCertificates" class="retry-btn">Retry</button>
      </div>
      
      <!-- Certificates table -->
      <div v-if="!loading && !error && filteredCertificates.length > 0" class="certificates-table">
        <table>
          <thead>
            <tr>
              <th @click="sortBy('createdAt')">
                Date
                <span class="sort-icon" v-if="sortColumn === 'createdAt'">
                  {{ sortDirection === 'asc' ? '▲' : '▼' }}
                </span>
              </th>
              <th @click="sortBy('certificateNumber')">
                Certificate #
                <span class="sort-icon" v-if="sortColumn === 'certificateNumber'">
                  {{ sortDirection === 'asc' ? '▲' : '▼' }}
                </span>
              </th>
              <th @click="sortBy('productName')">
                Product
                <span class="sort-icon" v-if="sortColumn === 'productName'">
                  {{ sortDirection === 'asc' ? '▲' : '▼' }}
                </span>
              </th>
              <th @click="sortBy('premium')">
                Premium
                <span class="sort-icon" v-if="sortColumn === 'premium'">
                  {{ sortDirection === 'asc' ? '▲' : '▼' }}
                </span>
              </th>
              <th @click="sortBy('coverageAmount')">
                Coverage
                <span class="sort-icon" v-if="sortColumn === 'coverageAmount'">
                  {{ sortDirection === 'asc' ? '▲' : '▼' }}
                </span>
              </th>
              <th @click="sortBy('validFrom')">
                Valid From
                <span class="sort-icon" v-if="sortColumn === 'validFrom'">
                  {{ sortDirection === 'asc' ? '▲' : '▼' }}
                </span>
              </th>
              <th @click="sortBy('validTo')">
                Valid To
                <span class="sort-icon" v-if="sortColumn === 'validTo'">
                  {{ sortDirection === 'asc' ? '▲' : '▼' }}
                </span>
              </th>
              <th @click="sortBy('status')">
                Status
                <span class="sort-icon" v-if="sortColumn === 'status'">
                  {{ sortDirection === 'asc' ? '▲' : '▼' }}
                </span>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="certificate in filteredCertificates" :key="certificate.certificateNumber" @click="viewCertificateDetails(certificate)" class="certificate-row" :class="{ 'selected': selectedCertificateNumber === certificate.certificateNumber }">
              <td>{{ formatDate(certificate.createdAt) }}</td>
              <td class="id-cell">{{ shortenId(certificate.certificateNumber) }}</td>
              <td>{{ certificate.productName || 'Standard Coverage' }}</td>
              <td>${{ formatCurrency(certificate.premium) }}</td>
              <td>${{ formatCurrency(certificate.coverageAmount) }}</td>
              <td>{{ formatDate(certificate.validFrom) }}</td>
              <td>{{ formatDate(certificate.validTo) }}</td>
              <td>
                <span class="status-badge" :class="getStatusClass(certificate.status)">
                  {{ certificate.status }}
                </span>
              </td>
              <td class="actions-cell">
                <button @click.stop="viewCertificateDetails(certificate)" class="action-btn view-btn">View</button>
                <button @click.stop="downloadCertificate(certificate)" class="action-btn download-btn" v-if="certificate.certificateLink">
                  Download
                </button>
                <button 
                  @click.stop="renewCertificate(certificate)" 
                  class="action-btn renew-btn" 
                  v-if="certificate.status === 'EXPIRED'"
                >
                  Renew
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Empty state -->
      <div v-if="!loading && !error && filteredCertificates.length === 0" class="empty-state">
        <div class="empty-icon">🛡️</div>
        <h3>No certificates found</h3>
        <p v-if="searchTerm || statusFilter !== 'all' || dateRangeFilter !== 'all'">
          Try adjusting your filters to see more results.
        </p>
        <p v-else>
          You haven't purchased any insurance certificates yet.
        </p>
      </div>
      
      <!-- Certificate detail modal -->
      <div v-if="showDetailModal" class="modal-backdrop" @click="closeModal">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3>Certificate Details</h3>
            <button class="close-btn" @click="closeModal">&times;</button>
          </div>
          <div class="modal-body" v-if="selectedCertificate">
            <div class="certificate-details">
              <div class="document-preview" v-if="selectedCertificate.certificateLink">
                <div class="preview-header">
                  <h4>Insurance Certificate</h4>
                  <a :href="selectedCertificate.certificateLink" target="_blank" class="download-link">
                    View Full Certificate
                  </a>
                </div>
                <div class="certificate-image">
                  <div class="certificate-placeholder">
                    <div class="placeholder-icon">
                      <span class="pdf-icon">PDF</span>
                    </div>
                    <div class="placeholder-text">
                      Click "View Full Certificate" to open the document
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="certificate-data">
                <div class="detail-section">
                  <h4>Certificate Information</h4>
                  <div class="detail-row">
                    <span class="label">Certificate Number:</span>
                    <span class="value">{{ selectedCertificate.certificateNumber }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">Product:</span>
                    <span class="value">{{ selectedCertificate.productName || 'Standard Coverage' }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">Status:</span>
                    <span class="value status-badge" :class="getStatusClass(selectedCertificate.status)">
                      {{ selectedCertificate.status }}
                    </span>
                  </div>
                  <div class="detail-row">
                    <span class="label">Valid From:</span>
                    <span class="value">{{ formatDate(selectedCertificate.validFrom, true) || 'Not specified' }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">Valid To:</span>
                    <span class="value">{{ formatDate(selectedCertificate.validTo, true) || 'Not specified' }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">Issued On:</span>
                    <span class="value">{{ formatDate(selectedCertificate.createdAt, true) }}</span>
                  </div>
                </div>
                
                <div class="detail-section">
                  <h4>Coverage Details</h4>
                  <div class="detail-row">
                    <span class="label">Premium:</span>
                    <span class="value">${{ formatCurrency(selectedCertificate.premium) }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">Coverage Amount:</span>
                    <span class="value">${{ formatCurrency(selectedCertificate.coverageAmount) }}</span>
                  </div>
                  <div class="detail-row" v-if="getBookingPolicyNumber(selectedCertificate)">
                    <span class="label">Policy Number:</span>
                    <span class="value">{{ getBookingPolicyNumber(selectedCertificate) }}</span>
                  </div>
                </div>
                
                <!-- Shipment Information -->
                <div class="detail-section" v-if="selectedCertificate.responseData && selectedCertificate.responseData.loadDetails">
                  <h4>Shipment Information</h4>
                  <div class="detail-row">
                    <span class="label">Origin:</span>
                    <span class="value">{{ getShipmentOrigin(selectedCertificate) }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">Destination:</span>
                    <span class="value">{{ getShipmentDestination(selectedCertificate) }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">Carrier:</span>
                    <span class="value">{{ getShipmentCarrier(selectedCertificate) }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">Cargo:</span>
                    <span class="value">{{ getShipmentCargo(selectedCertificate) }}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="modal-actions">
              <button 
                @click="downloadCertificate(selectedCertificate)" 
                class="primary-btn"
                v-if="selectedCertificate.certificateLink"
              >
                Download Certificate
              </button>
              <button 
                @click="renewCertificate(selectedCertificate)" 
                class="secondary-btn"
                v-if="selectedCertificate.status === 'EXPIRED'"
              >
                Renew Certificate
              </button>
              <button @click="closeModal" class="tertiary-btn">Close</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    name: 'PreviousCertificates',
    data() {
      return {
        certificates: [],
        filteredCertificates: [],
        loading: false,
        error: null,
        
        // Search and filter
        searchTerm: '',
        statusFilter: 'all',
        dateRangeFilter: 'all',
        startDate: null,
        endDate: null,
        
        // Sorting
        sortColumn: 'createdAt',
        sortDirection: 'desc',
        
        // Modal state
        showDetailModal: false,
        selectedCertificate: null,
        selectedCertificateNumber: null
      };
    },
    mounted() {
      this.fetchCertificates();
      
      // Set default dates for custom date range
      const today = new Date();
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      
      this.startDate = this.formatDateForInput(lastMonth);
      this.endDate = this.formatDateForInput(today);
    },
    methods: {
      async fetchCertificates() {
        this.loading = true;
        this.error = null;
        
        try {
          // API call to get certificates
          const response = await fetch('http://localhost:3000/api/insurance/certificates/list', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          if (!response.ok) {
            throw new Error(`Failed to fetch certificates: ${response.statusText}`);
          }
          
          const data = await response.json();
          
          if (data.status === 'success' && data.certificates) {
            // Convert string dates to Date objects
            this.certificates = data.certificates.map(cert => ({
              ...cert,
              createdAt: new Date(cert.createdAt),
              updatedAt: new Date(cert.updatedAt),
              validFrom: cert.validFrom ? new Date(cert.validFrom) : null,
              validTo: cert.validTo ? new Date(cert.validTo) : null
            }));
            
            // Apply initial sorting
            this.sortCertificates();
            
            // Apply initial filters
            this.applyFilters();
          } else {
            throw new Error('Invalid response from server');
          }
        } catch (error) {
          console.error('Error fetching certificates:', error);
          this.error = error.message;
        } finally {
          this.loading = false;
        }
      },
      
      applyFilters() {
        let filtered = [...this.certificates];
        
        // Apply search term filter
        if (this.searchTerm) {
          const term = this.searchTerm.toLowerCase();
          filtered = filtered.filter(certificate => 
            certificate.certificateNumber.toLowerCase().includes(term) ||
            (certificate.productName && certificate.productName.toLowerCase().includes(term)) ||
            (this.getShipmentCargo(certificate) && this.getShipmentCargo(certificate).toLowerCase().includes(term))
          );
        }
        
        // Apply status filter
        if (this.statusFilter !== 'all') {
          filtered = filtered.filter(certificate => certificate.status === this.statusFilter);
        }
        
        // Apply date range filter
        if (this.dateRangeFilter !== 'all') {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          if (this.dateRangeFilter === 'today') {
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            filtered = filtered.filter(certificate => 
              certificate.createdAt >= today && certificate.createdAt < tomorrow
            );
          } else if (this.dateRangeFilter === 'week') {
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay()); // Start of current week (Sunday)
            
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 7); // End of current week
            
            filtered = filtered.filter(certificate => 
              certificate.createdAt >= weekStart && certificate.createdAt < weekEnd
            );
          } else if (this.dateRangeFilter === 'month') {
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
            
            filtered = filtered.filter(certificate => 
              certificate.createdAt >= monthStart && certificate.createdAt < nextMonth
            );
          } else if (this.dateRangeFilter === 'custom' && this.startDate && this.endDate) {
            const start = new Date(this.startDate);
            const end = new Date(this.endDate);
            end.setHours(23, 59, 59, 999); // End of the selected day
            
            filtered = filtered.filter(certificate => 
              certificate.createdAt >= start && certificate.createdAt <= end
            );
          }
        }
        
        this.filteredCertificates = filtered;
        
        // Maintain sort order
        this.sortCertificates();
      },
      
      sortBy(column) {
        // If clicking the same column, toggle the sort direction
        if (this.sortColumn === column) {
          this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          this.sortColumn = column;
          // Default to descending for dates, ascending for everything else
          this.sortDirection = (column === 'createdAt' || column === 'validFrom' || column === 'validTo') ? 'desc' : 'asc';
        }
        
        this.sortCertificates();
      },
      
      sortCertificates() {
        const direction = this.sortDirection === 'asc' ? 1 : -1;
        
        this.filteredCertificates.sort((a, b) => {
          let valueA, valueB;
          
          // Handle special cases for different column types
          if (this.sortColumn === 'premium' || this.sortColumn === 'coverageAmount') {
            valueA = parseFloat(a[this.sortColumn] || 0);
            valueB = parseFloat(b[this.sortColumn] || 0);
          } else if (this.sortColumn === 'validFrom' || this.sortColumn === 'validTo') {
            // Handle null dates - null should be sorted last
            if (a[this.sortColumn] === null && b[this.sortColumn] === null) return 0;
            if (a[this.sortColumn] === null) return 1 * direction;
            if (b[this.sortColumn] === null) return -1 * direction;
            
            valueA = a[this.sortColumn];
            valueB = b[this.sortColumn];
          } else {
            valueA = a[this.sortColumn];
            valueB = b[this.sortColumn];
          }
          
          // Comparison logic
          if (valueA < valueB) return -1 * direction;
          if (valueA > valueB) return 1 * direction;
          return 0;
        });
      },
      
      viewCertificateDetails(certificate) {
        this.selectedCertificate = certificate;
        this.selectedCertificateNumber = certificate.certificateNumber;
        this.showDetailModal = true;
      },
      
      downloadCertificate(certificate) {
        if (!certificate.certificateLink) {
          this.error = 'Certificate link not available';
          return;
        }
        
        // Open the certificate link in a new tab
        window.open(certificate.certificateLink, '_blank');
      },
      
      renewCertificate(certificate) {
        // Emit an event to the parent component to renew the certificate
        this.$emit('renew-certificate', certificate);
        
        // Close the modal if it's open
        this.closeModal();
      },
      
      closeModal() {
        this.showDetailModal = false;
        this.selectedCertificate = null;
      },
      
      // Helper methods
      formatDate(date, includeTime = false) {
        if (!date) return '';
        
        const options = {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        };
        
        if (includeTime) {
          options.hour = '2-digit';
          options.minute = '2-digit';
        }
        
        return new Date(date).toLocaleDateString('en-US', options);
      },
      
      formatDateForInput(date) {
        if (!date) return '';
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
      },
      
      formatCurrency(value) {
        if (value === null || value === undefined) return '0.00';
        return parseFloat(value).toFixed(2);
      },
      
      shortenId(id) {
        if (!id) return '';
        if (id.length <= 8) return id;
        return `${id.substring(0, 4)}...${id.substring(id.length - 4)}`;
      },
      
      getStatusClass(status) {
        switch (status) {
          case 'ACTIVE': return 'status-active';
          case 'EXPIRED': return 'status-expired';
          case 'CANCELLED': return 'status-cancelled';
          default: return '';
        }
      },
      
      getBookingPolicyNumber(certificate) {
        if (certificate.responseData && certificate.responseData.policyNumber) {
          return certificate.responseData.policyNumber;
        }
        
        return certificate.certificateNumber;
      },
      
      getShipmentOrigin(certificate) {
        if (!certificate.responseData || !certificate.responseData.loadDetails) return 'Not available';
        
        const loadDetails = certificate.responseData.loadDetails;
        
        if (loadDetails.origin) {
          return loadDetails.origin;
        }
        
        if (loadDetails.stops && loadDetails.stops.length > 0) {
          const origin = loadDetails.stops.find(stop => stop.stopType === 'PICKUP');
          if (origin && origin.address) {
            const address = origin.address;
            return `${address.city || ''}, ${address.state || ''}`;
          }
        }
        
        return 'Not available';
      },
      
      getShipmentDestination(certificate) {
        if (!certificate.responseData || !certificate.responseData.loadDetails) return 'Not available';
        
        const loadDetails = certificate.responseData.loadDetails;
        
        if (loadDetails.destination) {
          return loadDetails.destination;
        }
        
        if (loadDetails.stops && loadDetails.stops.length > 0) {
          const destination = loadDetails.stops.find(stop => stop.stopType === 'DELIVERY');
          if (destination && destination.address) {
            const address = destination.address;
            return `${address.city || ''}, ${address.state || ''}`;
          }
        }
        
        return 'Not available';
      },
      
      getShipmentCarrier(certificate) {
        if (!certificate.responseData || !certificate.responseData.loadDetails) return 'Not available';
        
        const loadDetails = certificate.responseData.loadDetails;
        
        if (loadDetails.carrier && loadDetails.carrier.name) {
          return loadDetails.carrier.name;
        }
        
        if (loadDetails.carriers && loadDetails.carriers.length > 0) {
          return loadDetails.carriers[0].name || 'Unknown Carrier';
        }
        
        return 'Not available';
      },
      
      getShipmentCargo(certificate) {
        if (!certificate.responseData || !certificate.responseData.loadDetails) return 'Not available';
        
        const loadDetails = certificate.responseData.loadDetails;
        
        if (loadDetails.cargo && loadDetails.cargo.description) {
          return loadDetails.cargo.description;
        }
        
        if (loadDetails.cargo && loadDetails.cargo.fullDescriptionOfCargo) {
          return loadDetails.cargo.fullDescriptionOfCargo;
        }
        
        return 'Not available';
      }
    }
  };
  </script>
  
  <style scoped>
  .previous-certificates {
    max-width: 100%;
    margin: 0 auto;
    padding: 20px;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  }
  
  h2 {
    margin-top: 0;
    margin-bottom: 20px;
    color: #333;
  }
  
  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
    margin-bottom: 20px;
    padding: 15px;
    background-color: #f5f7ff;
    border-radius: 8px;
  }
  
  .search-box {
    flex: 1;
    min-width: 250px;
  }
  
  .search-box input {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
  }
  
  .filter-options {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
  }
  
  .filter-options label {
    display: flex;
    flex-direction: column;
    font-weight: 500;
    font-size: 14px;
    color: #555;
  }
  
  .filter-options select {
    padding: 8px 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background-color: white;
    min-width: 150px;
  }
  
  .date-range-inputs {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 10px;
  }
  
  .date-range-inputs input {
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
  
  .date-range-inputs span {
    color: #555;
  }
  
  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px;
  }
  
  .spinner {
    border: 4px solid rgba(0, 0, 0, 0.1);
    border-radius: 50%;
    border-top: 4px solid #4a6cf7;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
    margin-bottom: 15px;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .error-message {
    background-color: #fff3f3;
    border-left: 4px solid #f44336;
    padding: 15px;
    margin-bottom: 20px;
    border-radius: 4px;
  }
  
  .error-message p {
    margin: 0 0 10px 0;
    color: #d32f2f;
  }
  
  .retry-btn {
    background-color: #f44336;
    color: white;
    padding: 5px 10px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  }
  
  .retry-btn:hover {
    background-color: #d32f2f;
  }
  
  .certificates-table {
    overflow-x: auto;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    border-radius: 8px;
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
    background-color: white;
  }
  
  th, td {
    padding: 12px 15px;
    text-align: left;
    border-bottom: 1px solid #eee;
  }
  
  th {
    background-color: #f9f9f9;
    font-weight: 600;
    color: #333;
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
  }
  
  th:hover {
    background-color: #f0f0f0;
  }
  
  .sort-icon {
    display: inline-block;
    margin-left: 5px;
    color: #4a6cf7;
  }
  
  .certificate-row {
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .certificate-row:hover {
    background-color: #f5f7ff;
  }
  
  .certificate-row.selected {
    background-color: #e8f0fe;
  }
  
  .id-cell {
    font-family: monospace;
    font-size: 14px;
  }
  
  .status-badge {
    display: inline-block;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
    text-transform: uppercase;
  }
  
  .status-active {
    background-color: #e8f5e9;
    color: #2e7d32;
  }
  
  .status-expired {
    background-color: #fafafa;
    color: #757575;
  }
  
  .status-cancelled {
    background-color: #ffebee;
    color: #c62828;
  }
  
  .actions-cell {
    white-space: nowrap;
  }
  
  .action-btn {
    margin-right: 5px;
    padding: 6px 10px;
    border: none;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .view-btn {
    background-color: #e3f2fd;
    color: #1565c0;
  }
  
  .view-btn:hover {
    background-color: #bbdefb;
  }
  
  .download-btn {
    background-color: #e8f5e9;
    color: #2e7d32;
  }
  
  .download-btn:hover {
    background-color: #c8e6c9;
  }
  
  .renew-btn {
    background-color: #fff8e1;
    color: #f57f17;
  }
  
  .renew-btn:hover {
    background-color: #ffecb3;
  }
  
  .empty-state {
    text-align: center;
    padding: 40px 20px;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }
  
  .empty-icon {
    font-size: 48px;
    margin-bottom: 20px;
    color: #9e9e9e;
  }
  
  .empty-state h3 {
    margin: 0 0 10px 0;
    color: #616161;
  }
  
  .empty-state p {
    margin: 0;
    color: #757575;
  }
  
  /* Modal styles */
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }
  
  .modal-content {
    background-color: white;
    border-radius: 8px;
    width: 90%;
    max-width: 700px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 20px;
    border-bottom: 1px solid #eee;
  }
  
  .modal-header h3 {
    margin: 0;
    color: #333;
  }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #757575;
    line-height: 1;
  }
  
  .modal-body {
    padding: 20px;
  }
  
  .certificate-details {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  
  .document-preview {
    background-color: #f9f9f9;
    border: 1px solid #eee;
    border-radius: 8px;
    padding: 15px;
  }
  
  .preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
  }
  
  .preview-header h4 {
    margin: 0;
    color: #333;
  }
  
  .download-link {
    color: #4a6cf7;
    text-decoration: none;
    font-weight: 500;
    font-size: 14px;
  }
  
  .download-link:hover {
    text-decoration: underline;
  }
  
  .certificate-image {
    height: 200px;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
  .certificate-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;
  }
  
  .placeholder-icon {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 80px;
    height: 80px;
  }
  
  .pdf-icon {
    background-color: #f44336;
    color: white;
    padding: 5px 10px;
    border-radius: 4px;
    font-weight: bold;
    font-family: monospace;
  }
  
  .placeholder-text {
    color: #757575;
    font-size: 14px;
  }
  
  .certificate-data {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  
  .detail-section {
    padding-bottom: 15px;
    border-bottom: 1px solid #eee;
  }
  
  .detail-section:last-child {
    border-bottom: none;
  }
  
  .detail-section h4 {
    margin: 0 0 15px 0;
    color: #333;
  }
  
  .detail-row {
    display: flex;
    margin-bottom: 10px;
  }
  
  .detail-row:last-child {
    margin-bottom: 0;
  }
  
  .detail-row .label {
    width: 150px;
    font-weight: 600;
    color: #555;
  }
  
  .detail-row .value {
    flex: 1;
  }
  
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #eee;
  }
  
  button {
    padding: 10px 16px;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  .primary-btn {
    background-color: #4a6cf7;
    color: white;
  }
  
  .primary-btn:hover:not(:disabled) {
    background-color: #3a5bd9;
  }
  
  .secondary-btn {
    background-color: #ff9800;
    color: white;
  }
  
  .secondary-btn:hover:not(:disabled) {
    background-color: #f57c00;
  }
  
  .tertiary-btn {
    background-color: #f5f5f5;
    color: #333;
  }
  
  .tertiary-btn:hover {
    background-color: #e0e0e0;
  }
  
  /* Responsive styles */
  @media (max-width: 768px) {
    .filters {
      flex-direction: column;
      gap: 10px;
    }
    
    .filter-options {
      flex-direction: column;
      gap: 10px;
    }
    
    .detail-row {
      flex-direction: column;
    }
    
    .detail-row .label {
      width: 100%;
      margin-bottom: 5px;
    }
    
    .modal-actions {
      flex-direction: column;
    }
    
    .modal-actions button {
      width: 100%;
    }
    
    .certificate-details {
      flex-direction: column;
    }
  }
  </style>