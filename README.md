# Loadsure Insurance Integration

This project provides a complete event-driven microservice solution for integrating cargo insurance functionality from Loadsure into your shipping application.

## Architecture Overview

The system uses an event-driven microservice architecture with RabbitMQ as the message broker, providing asynchronous communication between components.

### Key Components

1. **API Service**
   - Exposes RESTful endpoints for quote requests and insurance booking
   - Communicates with other components via message queues
   - Serves cached support data to frontend applications

2. **Loadsure API Service**
   - Handles direct communication with Loadsure's APIs
   - Maps internal data formats to Loadsure's expected formats
   - Processes API responses and formats them for internal use

3. **Support Data Service**
   - Fetches and caches reference data from Loadsure
   - Persists data to disk for resilience
   - Provides mapping functions between internal and Loadsure formats
   - Exposes endpoints for frontend to access reference data

4. **Support Data Refresh Service**
   - Manages scheduled updates of reference data
   - Supports manual refresh requests
   - Ensures data is always up-to-date

5. **RabbitMQ**
   - Acts as the message broker between services
   - Provides reliable message delivery with acknowledgments
   - Supports error handling and retry mechanisms

6. **Vue.js Frontend**
   - Provides user interface for insurance quote and purchase
   - Consumes reference data from API for dynamic form generation
   - Displays quote information and booking confirmation

## Data Flow

### Quote Request Flow
1. Frontend submits freight details to `/api/insurance/quotes`
2. API service publishes a message to the `quote-requested` queue
3. Loadsure API service consumes the message and calls Loadsure API
4. Loadsure API service publishes result to the `quote-received` queue
5. API service receives the result and returns it to the frontend

### Insurance Booking Flow
1. Frontend submits booking request to `/api/insurance/bookings`
2. API service publishes a message to the `booking-requested` queue
3. Loadsure API service consumes the message and calls Loadsure API
4. Loadsure API service publishes result to the `booking-confirmed` queue
5. API service receives the result and returns it to the frontend

### Support Data Flow
1. On startup, support data is loaded from disk (if available)
2. Missing or stale data is fetched from Loadsure API
3. Data is cached in memory and persisted to disk
4. Daily scheduled refresh keeps data current
5. Frontend can access current data via API endpoints

## Project Structure

```
loadsure-integration/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   └── supportDataController.js   # API routes for support data
│   │   ├── services/
│   │   │   ├── loadsureApiService.js      # Loadsure API integration
│   │   │   ├── supportDataService.js      # Support data management
│   │   │   └── supportDataRefreshService.js # Scheduled data refresh
│   │   ├── config.js                      # Configuration
│   │   └── index.js                       # Main application
│   ├── data/                              # Persisted support data
│   ├── .env                               # Environment variables
│   ├── Dockerfile                         # Backend container definition
│   └── package.json                       # Dependencies
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── CargoInsurance.vue         # Insurance component
│   │   ├── App.vue                        # Main application
│   │   └── main.js                        # Entry point
│   ├── Dockerfile                         # Frontend container definition
│   └── package.json                       # Dependencies
└── docker-compose.yml                     # Container orchestration
```

## API Endpoints

### Insurance API
- `POST /api/insurance/quotes` - Get insurance quote
- `POST /api/insurance/bookings` - Book insurance

### Support Data API
- `GET /api/support-data/commodities` - Get list of commodities
- `GET /api/support-data/commodity-exclusions` - Get commodity exclusions
- `GET /api/support-data/equipment-types` - Get equipment types
- `GET /api/support-data/load-types` - Get load types
- `GET /api/support-data/freight-classes` - Get freight classes
- `GET /api/support-data/terms-of-sales` - Get terms of sales
- `GET /api/support-data/status` - Get support data status
- `POST /api/support-data/refresh` - Manually refresh support data
- `POST /api/support-data/schedule` - Update refresh schedule

## Setup and Configuration

### Prerequisites
- Docker and Docker Compose
- Node.js 18.x or higher (for local development)
- Loadsure API credentials

### Environment Variables
Configure these in the `.env` file or docker-compose.yml:

```
PORT=3000
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
LOADSURE_API_KEY=your_loadsure_api_key_here
LOADSURE_BASE_URL=https://api.loadsure.com
SUPPORT_DATA_REFRESH_SCHEDULE=0 0 * * *
```

### Running with Docker Compose
```bash
# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Local Development
```bash
# Install dependencies
cd backend
npm install

# Start the API service
npm run dev

# Start the Loadsure service (in another terminal)
npm run service
```

## Frontend Integration

The frontend can access the support data endpoints to build dynamic forms based on the latest reference data from Loadsure. This ensures that dropdowns, validations, and other form elements are always up-to-date.

Example integration:

```javascript
// Fetch freight classes for dropdown
async fetchFreightClasses() {
  try {
    const response = await fetch('/api/support-data/freight-classes');
    const data = await response.json();
    this.freightClasses = data;
  } catch (error) {
    console.error('Error fetching freight classes:', error);
  }
}
```

## Monitoring and Maintenance

### RabbitMQ Management
Access the RabbitMQ management console at http://localhost:15672 (guest/guest) to monitor queues, connections, and messages.

### Support Data Status
Check the status of the support data:
```bash
curl http://localhost:3000/api/support-data/status
```

### Manual Refresh
Trigger a manual refresh of support data:
```bash
curl -X POST http://localhost:3000/api/support-data/refresh
```

## Production Considerations

Before deploying to production, consider:

1. **Security**
   - Add proper authentication to API endpoints
   - Secure RabbitMQ with authentication and TLS
   - Use secrets management for API keys

2. **Persistence**
   - Add a database for quotes and bookings
   - Consider Redis for caching if memory usage becomes an issue

3. **Scalability**
   - Create multiple instances of the Loadsure service
   - Add load balancing for the API service

4. **Monitoring**
   - Implement health checks and metrics
   - Set up alerts for service failures
   - Monitor queue depths and message processing times

5. **Disaster Recovery**
   - Implement backup and restore procedures
   - Set up failover mechanisms
   - Document recovery procedures