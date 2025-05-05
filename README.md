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

6. **Redis**
   - Used for distributed request tracking
   - Handles response coordination between services
   - Enables higher throughput and resilience

7. **PostgreSQL**
   - Stores quotes, bookings, and certificates
   - Provides persistent storage for reporting and auditing
   - Powers data retrieval APIs

8. **Queue Monitor**
   - Monitors queue depths in RabbitMQ
   - Auto-scales worker processes based on load
   - Ensures optimal resource utilization

9. **Vue.js Frontend** (Placeholder)
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
│   │   ├── controllers/          # API routes handlers
│   │   ├── services/             # Business logic services
│   │   ├── middleware/           # Express middleware
│   │   ├── config.js             # Configuration
│   │   └── index.js              # Main application
│   ├── database/                 # Database models and migrations
│   ├── data/                     # Persisted support data
│   ├── __tests__/                # Unit and integration tests
│   ├── .env.example              # Environment variables template
│   ├── Dockerfile                # Backend container definition
│   └── package.json              # Dependencies
├── frontend/                     # Frontend application (placeholder)
├── docker-compose.yml            # Main container orchestration
├── docker-compose.dev.yml        # Development environment overrides
├── nginx.conf                    # NGINX configuration
├── Makefile                      # Development workflow commands
├── cleanup.sh                    # Helper script to clean node_modules
├── e2e-test.js                   # End-to-end test script
└── package.json                  # Root project dependencies
```

## Prerequisites

Before getting started, make sure you have the following prerequisites installed:

- Docker (>= 20.10.0)
- Docker Compose (>= 2.0.0)
- Node.js (>= 18.0.0) for local development
- NPM (>= 9.0.0) or Yarn (>= 1.22.0)

## Getting Started

### Clone the Repository

```bash
git clone https://github.com/yourusername/loadsure-integration.git
cd loadsure-integration
```

### Configuration

1. Create a `.env` file in the root directory:

```bash
cp backend/.env.example backend/.env
```

2. Adjust the settings in the `.env` file as needed:

```
# Server Configuration
PORT=3000

# RabbitMQ Configuration
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672

# Loadsure API Configuration
LOADSURE_API_KEY=your_loadsure_api_key_here
LOADSURE_BASE_URL=https://portal.loadsure.net/api

# Database Configuration
DB_DIALECT=postgres
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=loadsure
DB_PASSWORD=loadsurepass
DB_NAME=loadsure_dev
DB_SSL=false
DB_SSL_REJECT_UNAUTHORIZED=true

# Queue Scaling (optional)
MIN_WORKERS=1
MAX_WORKERS=5
SCALE_UP_THRESHOLD=10
SCALE_DOWN_THRESHOLD=2
CHECK_INTERVAL=10000
WORKER_CONCURRENCY=3
```

### Starting the Services

You can use the included Makefile to easily start all services:

```bash
# Start development environment
make dev

# Or use Docker Compose directly
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

This will start:
- PostgreSQL database
- RabbitMQ message broker
- Redis cache
- Database migration service
- API service
- Loadsure service
- Queue monitor
- NGINX gateway

### Verify the Services

You can check if all services are running:

```bash
make status
# or
docker-compose ps
```

You should see all services in the "Up" state. The API will be available at http://localhost:3000/api.

The Swagger documentation is available at http://localhost:3000/api-docs.

### Running Tests

To run the automated tests:

```bash
# Unit tests for the backend
cd backend && npm test

# End-to-end tests (with services running)
npm run test:e2e
# or
./run-e2e-test.sh
```

## API Endpoints

### Insurance API
- `POST /api/insurance/quotes` - Get insurance quote (complete format)
- `POST /api/insurance/quotes/simple` - Get insurance quote (simplified format)
- `GET /api/insurance/quotes/:id` - Get a specific quote by ID
- `GET /api/insurance/quotes/list` - List all quotes
- `POST /api/insurance/bookings` - Book insurance
- `GET /api/insurance/bookings/:id` - Get a specific booking by ID
- `GET /api/insurance/bookings/list` - List all bookings
- `POST /api/insurance/certificates` - Get certificate details
- `GET /api/insurance/certificates/:number` - Get a specific certificate by number
- `GET /api/insurance/certificates/list` - List all certificates
- `GET /api/insurance/stats` - Get system statistics
- `GET /api/insurance/search` - Search across quotes, bookings, and certificates

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

## Development Workflow

The project includes several helpful commands in the Makefile for common development tasks:

```bash
# Start development environment
make dev

# Start production environment
make prod

# Stop all services
make down

# Restart all services
make restart

# Build containers
make build

# View logs
make logs
make logs-api
make logs-frontend

# Run database migrations
make migrate

# Show status of containers
make status

# Clean up node_modules
make clean

# Deep clean (removes containers, volumes, node_modules)
make clean-all
```

## Developing Locally

While the services run in Docker containers, you can also run parts of the application locally for faster development:

```bash
# Install dependencies
cd backend && npm install

# Start the API service locally
npm run dev

# Start the Loadsure service locally
npm run service

# Start the queue monitor locally
npm run monitor
```

Note: When running services locally, adjust the `.env` file to connect to the Docker services:

```
RABBITMQ_URL=amqp://localhost:5672
REDIS_URL=redis://localhost:6379
DB_HOST=localhost
```

## Monitoring and Maintenance

### RabbitMQ Management
Access the RabbitMQ management console at http://localhost:15672 (guest/guest) to monitor queues, connections, and messages.

### Database Access
You can connect to the PostgreSQL database:

```bash
docker-compose exec postgres psql -U loadsure -d loadsure_dev
```

### Redis Inspection
Inspect Redis contents:

```bash
docker-compose exec redis redis-cli
```

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

## Production Deployment

Before deploying to production, consider:

1. **Security**
   - Add proper authentication to API endpoints
   - Secure RabbitMQ with authentication and TLS
   - Use secrets management for API keys
   - Configure firewalls and network security

2. **Persistence**
   - Configure persistent volumes for PostgreSQL, RabbitMQ, and Redis
   - Implement backup and restore procedures
   - Set up database replication

3. **Scalability**
   - Adjust replica counts for Loadsure service
   - Add load balancing for the API service
   - Configure PostgreSQL for high availability

4. **Monitoring**
   - Implement health checks and metrics
   - Set up alerts for service failures
   - Monitor queue depths and message processing times

5. **Disaster Recovery**
   - Document recovery procedures
   - Test failovers regularly
   - Implement backup verification

## Troubleshooting

### Common Issues

1. **Database connection fails**
   - Check if postgres container is running
   - Verify database credentials in `.env`
   - Wait a few seconds for the database to initialize

2. **RabbitMQ connection fails**
   - Check if rabbitmq container is running
   - Verify RabbitMQ credentials in `.env`
   - Check network connectivity between services

3. **Redis connection fails**
   - Check if redis container is running
   - Verify Redis URL in `.env`

4. **API returns 408 Request Timeout**
   - This usually means the Loadsure Service is not processing messages
   - Check Loadsure Service logs for errors
   - Verify Loadsure API key is valid

### Logs Access

To view logs for troubleshooting:

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api-service
docker-compose logs -f loadsure-service
```

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Add tests for new functionality
4. Ensure tests pass with `npm test`
5. Submit a pull request