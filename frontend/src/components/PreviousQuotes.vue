<template>
  <div class="previous-quotes">
    <h2>Previous Insurance Quotes</h2>
    
    <!-- Search and filters -->
    <div class="filters">
      <div class="search-box">
        <input 
          type="text" 
          v-model="searchTerm" 
          placeholder="Search quotes..." 
          @input="applyFilters"
        >
      </div>
      <div class="filter-options">
        <label>
          Status:
          <select v-model="statusFilter" @change="applyFilters">
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="booked">Booked</option>
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
      <p>Loading quotes...</p>
    </div>
    
    <!-- Error message -->
    <div v-if="error" class="error-message">
      <p>{{ error }}</p>
      <button @click="fetchQuotes" class="retry-btn">Retry</button>
    </div>
    
    <!-- Quotes table -->
    <div v-if="!loading && !error && filteredQuotes.length > 0" class="quotes-table">
      <table>
        <thead>
          <tr>
            <th @click="sortBy('createdAt')">
              Date
              <span class="sort-icon" v-if="sortColumn === 'createdAt'">
                {{ sortDirection === 'asc' ? '▲' : '▼' }}
              </span>
            </th>
            <th @click="sortBy('quoteId')">
              Quote ID
              <span class="sort-icon" v-if="sortColumn === 'quoteId'">
                {{ sortDirection === 'asc' ? '▲' : '▼' }}
              </span>
            </th>
            <th @click="sortBy('description')">
              Description
              <span class="sort-icon" v-if="sortColumn === 'description'">
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
            <th @click="sortBy('expiresAt')">
              Expires
              <span class="sort-icon" v-if="sortColumn === 'expiresAt'">
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
          <tr v-for="quote in filteredQuotes" :key="quote.quoteId" @click="viewQuoteDetails(quote)" class="quote-row" :class="{ 'selected': selectedQuoteId === quote.quoteId }">
            <td>{{ formatDate(quote.createdAt) }}</td>
            <td class="id-cell">{{ shortenId(quote.quoteId) }}</td>
            <td>{{ getQuoteDescription(quote) }}</td>
            <td>${{ formatCurrency(quote.premium) }}</td>
            <td>${{ formatCurrency(quote.coverageAmount) }}</td>
            <td>{{ formatDate(quote.expiresAt) }}</td>
            <td>
              <span class="status-badge" :class="getStatusClass(quote.status)">
                {{ capitalizeFirst(quote.status) }}
              </span>
            </td>
            <td class="actions-cell">
              <button @click.stop="viewQuoteDetails(quote)" class="action-btn view-btn">View</button>
              <button 
                @click.stop="useQuote(quote)" 
                class="action-btn use-btn" 
                :disabled="quote.status !== 'active'"
              >
                Use
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- Empty state -->
    <div v-if="!loading && !error && filteredQuotes.length === 0" class="empty-state">
      <div class="empty-icon">📄</div>
      <h3>No quotes found</h3>
      <p v-if="searchTerm || statusFilter !== 'all' || dateRangeFilter !== 'all'">
        Try adjusting your filters to see more results.
      </p>
      <p v-else>
        You haven't requested any insurance quotes yet.
      </p>
    </div>
    
    <!-- Quote detail modal -->
    <div v-if="showDetailModal" class="modal-backdrop" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Quote Details</h3>
          <button class="close-btn" @click="closeModal">&times;</button>
        </div>
        <div class="modal-body" v-if="selectedQuote">
          <div class="quote-details">
            <div class="detail-row">
              <span class="label">Quote ID:</span>
              <span class="value">{{ selectedQuote.quoteId }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Created:</span>
              <span class="value">{{ formatDate(selectedQuote.createdAt, true) }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Expires:</span>
              <span class="value">{{ formatDate(selectedQuote.expiresAt, true) }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Status:</span>
              <span class="value status-badge" :class="getStatusClass(selectedQuote.status)">
                {{ capitalizeFirst(selectedQuote.status) }}
              </span>
            </div>
            <div class="detail-row">
              <span class="label">Premium:</span>
              <span class="value">${{ formatCurrency(selectedQuote.premium) }}</span>
            </div>
            <!-- Display integration fee if present -->
            <div class="detail-row" v-if="selectedQuote.integrationFeeAmount">
              <span class="label">Integration Fee:</span>
              <span class="value">${{ formatCurrency(selectedQuote.integrationFeeAmount) }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Coverage Amount:</span>
              <span class="value">${{ formatCurrency(selectedQuote.coverageAmount) }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Deductible:</span>
              <span class="value">${{ formatCurrency(selectedQuote.deductible) }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Currency:</span>
              <span class="value">{{ selectedQuote.currency }}</span>
            </div>
            
            <!-- Freight Details section -->
            <div class="detail-section">
              <h4>Freight Details</h4>
              <div class="detail-row">
                <span class="label">Description:</span>
                <span class="value">{{ getQuoteDescription(selectedQuote) }}</span>
              </div>
              
              <!-- Origin and Destination -->
              <div class="detail-row" v-if="selectedQuote.requestData && selectedQuote.requestData.stops">
                <span class="label">Origin:</span>
                <span class="value">{{ getOriginCity(selectedQuote) }}, {{ getOriginState(selectedQuote) }}</span>
              </div>
              <div class="detail-row" v-if="selectedQuote.requestData && selectedQuote.requestData.stops">
                <span class="label">Destination:</span>
                <span class="value">{{ getDestinationCity(selectedQuote) }}, {{ getDestinationState(selectedQuote) }}</span>
              </div>
              
              <!-- Freight Classes -->
              <div class="detail-row" v-if="selectedQuote.requestData && selectedQuote.requestData.freightClasses">
                <span class="label">Freight Classes:</span>
                <span class="value">
                  <div v-for="(fc, index) in selectedQuote.requestData.freightClasses" :key="index">
                    {{ fc.classId }} ({{ fc.percentage }}%)
                  </div>
                </span>
              </div>
            </div>
            
            <!-- Terms section -->
            <div class="detail-section">
              <h4>Terms & Conditions</h4>
              <div class="terms-content">
                {{ selectedQuote.terms }}
              </div>
            </div>
          </div>
          
          <div class="modal-actions">
            <button 
              @click="useQuote(selectedQuote)" 
              class="primary-btn" 
              :disabled="selectedQuote.status !== 'active'"
            >
              Use This Quote
            </button>
            <button @click="closeModal" class="secondary-btn">Close</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PreviousQuotes',
  data() {
    return {
      quotes: [],
      filteredQuotes: [],
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
      selectedQuote: null,
      selectedQuoteId: null
    };
  },
  mounted() {
    this.fetchQuotes();
    
    // Set default dates for custom date range
    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    this.startDate = this.formatDateForInput(lastMonth);
    this.endDate = this.formatDateForInput(today);
  },
  methods: {
    async fetchQuotes() {
      this.loading = true;
      this.error = null;
      
      try {
        // API call to get quotes
        const response = await fetch('http://localhost:3000/api/insurance/quotes/list', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch quotes: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'success' && data.quotes) {
          // Convert string dates to Date objects and ensure numeric fields are numbers
          this.quotes = data.quotes.map(quote => ({
            ...quote,
            createdAt: new Date(quote.createdAt),
            updatedAt: new Date(quote.updatedAt),
            expiresAt: new Date(quote.expiresAt),
            premium: parseFloat(quote.premium) || 0,
            coverageAmount: parseFloat(quote.coverageAmount) || 0,
            deductible: parseFloat(quote.deductible) || 0
          }));
          
          // Apply initial sorting
          this.sortQuotes();
          
          // Apply initial filters
          this.applyFilters();
        } else {
          throw new Error('Invalid response from server');
        }
      } catch (error) {
        console.error('Error fetching quotes:', error);
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },
    
    applyFilters() {
      let filtered = [...this.quotes];
      
      // Apply search term filter
      if (this.searchTerm) {
        const term = this.searchTerm.toLowerCase();
        filtered = filtered.filter(quote => 
          quote.quoteId.toLowerCase().includes(term) ||
          (quote.requestData && quote.requestData.description && 
           quote.requestData.description.toLowerCase().includes(term)) ||
          (quote.requestData && quote.requestData.shipment && 
           quote.requestData.shipment.cargo && 
           quote.requestData.shipment.cargo.fullDescriptionOfCargo && 
           quote.requestData.shipment.cargo.fullDescriptionOfCargo.toLowerCase().includes(term))
        );
      }
      
      // Apply status filter
      if (this.statusFilter !== 'all') {
        filtered = filtered.filter(quote => quote.status === this.statusFilter);
      }
      
      // Apply date range filter
      if (this.dateRangeFilter !== 'all') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (this.dateRangeFilter === 'today') {
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          
          filtered = filtered.filter(quote => 
            quote.createdAt >= today && quote.createdAt < tomorrow
          );
        } else if (this.dateRangeFilter === 'week') {
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay()); // Start of current week (Sunday)
          
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 7); // End of current week
          
          filtered = filtered.filter(quote => 
            quote.createdAt >= weekStart && quote.createdAt < weekEnd
          );
        } else if (this.dateRangeFilter === 'month') {
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
          const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
          
          filtered = filtered.filter(quote => 
            quote.createdAt >= monthStart && quote.createdAt < nextMonth
          );
        } else if (this.dateRangeFilter === 'custom' && this.startDate && this.endDate) {
          const start = new Date(this.startDate);
          const end = new Date(this.endDate);
          end.setHours(23, 59, 59, 999); // End of the selected day
          
          filtered = filtered.filter(quote => 
            quote.createdAt >= start && quote.createdAt <= end
          );
        }
      }
      
      this.filteredQuotes = filtered;
      
      // Maintain sort order
      this.sortQuotes();
    },
    
    sortBy(column) {
      // If clicking the same column, toggle the sort direction
      if (this.sortColumn === column) {
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortColumn = column;
        // Default to descending for dates, ascending for everything else
        this.sortDirection = (column === 'createdAt' || column === 'expiresAt') ? 'desc' : 'asc';
      }
      
      this.sortQuotes();
    },
    
    sortQuotes() {
      const direction = this.sortDirection === 'asc' ? 1 : -1;
      
      this.filteredQuotes.sort((a, b) => {
        let valueA, valueB;
        
        // Handle special cases for different column types
        if (this.sortColumn === 'description') {
          valueA = this.getQuoteDescription(a).toLowerCase();
          valueB = this.getQuoteDescription(b).toLowerCase();
        } else if (this.sortColumn === 'premium' || this.sortColumn === 'coverageAmount') {
          valueA = parseFloat(a[this.sortColumn] || 0);
          valueB = parseFloat(b[this.sortColumn] || 0);
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
    
    viewQuoteDetails(quote) {
      this.selectedQuote = quote;
      this.selectedQuoteId = quote.quoteId;
      this.showDetailModal = true;
    },
    
    useQuote(quote) {
      if (quote.status !== 'active') {
        return; // Prevent using expired or booked quotes
      }
      
      // Emit an event to the parent component to use this quote
      this.$emit('use-quote', quote);
      
      // Close the modal if it's open
      this.closeModal();
    },
    
    closeModal() {
      this.showDetailModal = false;
      this.selectedQuote = null;
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
      // Make sure the value is a number before calling toFixed
      try {
        return parseFloat(value).toFixed(2);
      } catch (error) {
        console.warn('Error formatting currency value:', value, error);
        return '0.00';
      }
    },
    
    shortenId(id) {
      if (!id) return '';
      if (id.length <= 8) return id;
      return `${id.substring(0, 4)}...${id.substring(id.length - 4)}`;
    },
    
    getStatusClass(status) {
      switch (status) {
        case 'active': return 'status-active';
        case 'expired': return 'status-expired';
        case 'booked': return 'status-booked';
        default: return '';
      }
    },
    
    capitalizeFirst(str) {
      if (!str) return '';
      return str.charAt(0).toUpperCase() + str.slice(1);
    },
    
    getQuoteDescription(quote) {
      if (!quote || !quote.requestData) return 'No description';
      
      // Handle different request data structures
      if (quote.requestData.description) {
        return quote.requestData.description;
      } else if (quote.requestData.shipment && 
                quote.requestData.shipment.cargo && 
                quote.requestData.shipment.cargo.fullDescriptionOfCargo) {
        return quote.requestData.shipment.cargo.fullDescriptionOfCargo;
      }
      
      return 'No description';
    },
    
    getOriginCity(quote) {
      if (!quote || !quote.requestData) return 'Unknown';
      
      if (quote.requestData.stops && quote.requestData.stops.length > 0) {
        const origin = quote.requestData.stops.find(stop => stop.stopType === 'PICKUP');
        if (origin && origin.address && origin.address.city) {
          return origin.address.city;
        }
      }
      
      if (quote.requestData.originCity) {
        return quote.requestData.originCity;
      }
      
      return 'Unknown';
    },
    
    getOriginState(quote) {
      if (!quote || !quote.requestData) return 'Unknown';
      
      if (quote.requestData.stops && quote.requestData.stops.length > 0) {
        const origin = quote.requestData.stops.find(stop => stop.stopType === 'PICKUP');
        if (origin && origin.address && origin.address.state) {
          return origin.address.state;
        }
      }
      
      if (quote.requestData.originState) {
        return quote.requestData.originState;
      }
      
      return 'Unknown';
    },
    
    getDestinationCity(quote) {
      if (!quote || !quote.requestData) return 'Unknown';
      
      if (quote.requestData.stops && quote.requestData.stops.length > 0) {
        const destination = quote.requestData.stops.find(stop => stop.stopType === 'DELIVERY');
        if (destination && destination.address && destination.address.city) {
          return destination.address.city;
        }
      }
      
      if (quote.requestData.destinationCity) {
        return quote.requestData.destinationCity;
      }
      
      return 'Unknown';
    },
    
    getDestinationState(quote) {
      if (!quote || !quote.requestData) return 'Unknown';
      
      if (quote.requestData.stops && quote.requestData.stops.length > 0) {
        const destination = quote.requestData.stops.find(stop => stop.stopType === 'DELIVERY');
        if (destination && destination.address && destination.address.state) {
          return destination.address.state;
        }
      }
      
      if (quote.requestData.destinationState) {
        return quote.requestData.destinationState;
      }
      
      return 'Unknown';
    }
  }
};
</script>

<style scoped>
.previous-quotes {
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

.quotes-table {
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

.quote-row {
  cursor: pointer;
  transition: background-color 0.2s;
}

.quote-row:hover {
  background-color: #f5f7ff;
}

.quote-row.selected {
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

.status-booked {
  background-color: #e3f2fd;
  color: #1565c0;
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

.use-btn {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.use-btn:hover:not(:disabled) {
  background-color: #c8e6c9;
}

.use-btn:disabled {
  background-color: #f5f5f5;
  color: #9e9e9e;
  cursor: not-allowed;
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
  max-width: 600px;
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

.quote-details {
  margin-bottom: 20px;
}

.detail-row {
  display: flex;
  margin-bottom: 10px;
}

.detail-row .label {
  width: 150px;
  font-weight: 600;
  color: #555;
}

.detail-row .value {
  flex: 1;
}

.detail-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.detail-section h4 {
  margin: 0 0 15px 0;
  color: #333;
}

.terms-content {
  background-color: #f9f9f9;
  padding: 15px;
  border-radius: 4px;
  font-size: 14px;
  line-height: 1.5;
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
  background-color: #f5f5f5;
  color: #333;
}

.secondary-btn:hover {
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
}
</style>