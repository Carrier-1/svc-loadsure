# Loadsure Insurance Integration

This project provides a complete event-driven microservice solution for integrating cargo insurance functionality from Loadsure into your shipping application.

## Architecture Overview

The system uses an event-driven microservice architecture with RabbitMQ as the message broker, providing asynchronous communication between components. It's deployed on DigitalOcean App Platform with infrastructure managed as code using Terraform.

### Key Components

1. **API Service**
   - Exposes RESTful endpoints for quote requests and insurance booking
   - Communicates with other components via message queues
   - Serves cached support data to frontend applications
   - Handles request routing and response coordination

2. **Loadsure Service**
   - Encapsulated, self-contained service that handles direct communication with Loadsure's APIs
   - Maps internal data formats to Loadsure's expected formats
   - Processes API responses and formats them for internal use
   - Functions as a blackbox service with message-based communication

3. **Queue Monitor**
   - Monitors queue depths in RabbitMQ
   - Auto-scales worker processes based on load
   - Ensures optimal resource utilization
   - Supports both Docker and non-Docker scaling modes

4. **PostgreSQL Database**
   - Stores quotes, bookings, and certificates
   - Provides persistent storage for reporting and auditing
   - Powers data retrieval APIs
   - Supports complex queries and relationships

5. **Redis Cache**
   - Used for distributed request tracking
   - Provides fast caching of support data
   - Handles response coordination between services
   - Enables higher throughput and resilience

6. **NGINX Gateway**
   - Provides a unified API endpoint
   - Handles load balancing across API service instances
   - Sets appropriate timeouts and headers
   - Serves as the entry point for all client requests

7. **Frontend**
   - Vue.js application for demonstrating and testing the API
   - Provides UI for requesting quotes and bookings
   - Displays certificates and support data
   - Used primarily for development and testing

### Network Architecture

The service uses a private VPC (Virtual Private Cloud) for network isolation:

- Only the API port (3001) is exposed publicly through NGINX
- All internal services (Redis, PostgreSQL) are isolated within the private network
- Database resources are protected by firewall rules
- All internal communication happens via secure private networking

## Data Flow

### Quote Request Flow
1. Frontend submits freight details to `/api/insurance/quotes` or `/api/insurance/quotes/simple`
2. API service generates a unique request ID and stores the request in Redis
3. API service publishes a message to the `quote-requested` queue
4. Loadsure service consumes the message and calls Loadsure API
5. Loadsure service saves the result to the database
6. Loadsure service publishes result to the `quote-received` queue
7. API service receives the result, correlates it with the original request using Redis
8. API service returns the result to the frontend

### Insurance Booking Flow
1. Frontend submits booking request to `/api/insurance/bookings`
2. API service generates a unique request ID and stores the request in Redis
3. API service publishes a message to the `booking-requested` queue
4. Loadsure service consumes the message and calls Loadsure API
5. Loadsure service saves the booking to the database
6. Loadsure service publishes result to the `booking-confirmed` queue
7. API service receives the result, correlates it with the original request using Redis
8. API service returns the result to the frontend

### Certificate Cancellation Flow
1. Frontend submits cancellation request to `/api/insurance/certificates/{number}/cancel`
2. API service generates a unique request ID and stores the request in Redis
3. API service publishes a message to the `certificate-cancellation-requested` queue
4. Loadsure service consumes the message and calls Loadsure API
5. Loadsure service updates the certificate status in the database
6. Loadsure service publishes result to the `certificate-cancellation-confirmed` queue
7. API service receives the result, correlates it with the original request using Redis
8. API service returns the result to the frontend

### Support Data Flow
1. On startup, support data is loaded from database (if available)
2. If cache is cold or data is stale, fresh data is fetched from Loadsure API
3. Data is cached in Redis for fast access and stored in PostgreSQL for persistence
4. Daily scheduled refresh keeps data current
5. Frontend can access current data via API endpoints

## Project Structure

```
svc-loadsure/
├── .github/                    # GitHub Actions workflows for CI/CD
│   └── workflows/
│       ├── ci.yml              # Continuous integration workflow
│       └── deploy.yml          # Deployment workflow with approval gates
├── backend/                    # Node.js backend application
│   ├── src/                    # Source code
│   │   ├── controllers/        # API routes handlers
│   │   ├── middleware/         # Express middleware
│   │   ├── services/           # Business logic services
│   │   ├── config.js           # Configuration
│   │   ├── index.js            # Main application
│   │   └── swagger.js          # API documentation
│   ├── database/               # Database models and migrations
│   │   ├── config.js           # Database configuration
│   │   ├── config.cjs          # CommonJS config for Sequelize CLI
│   │   ├── models/             # Sequelize models
│   │   └── migrations/         # Database migrations
│   ├── __tests__/              # Unit and integration tests
│   ├── .env.example            # Environment variables template
│   ├── Dockerfile              # Backend container definition
│   └── package.json            # Dependencies
├── frontend/                   # Vue.js frontend application
│   ├── src/                    # Frontend source code
│   ├── Dockerfile              # Frontend container definition
│   └── package.json            # Frontend dependencies
├── terraform/                  # Infrastructure as code
│   ├── main.tf                 # Main Terraform configuration
│   ├── variables.tf            # Variable definitions
│   └── environments/           # Environment-specific configurations
│       ├── staging/            # Staging environment
│       └── production/         # Production environment
├── docs/                       # Project documentation
│   ├── deployment.md           # Deployment guide
│   └── infrastructure.md       # Infrastructure documentation
├── scripts/                    # Utility scripts
├── docker-compose.yml          # Main container orchestration
├── docker-compose.dev.yml      # Development environment overrides
├── nginx.conf                  # NGINX configuration
├── makefile                    # Development workflow commands
└── package.json                # Root project dependencies
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
git clone https://github.com/yourusername/svc-loadsure.git
cd svc-loadsure
```

### Configuration

1. Create a `.env` file in the root directory:

```bash
cp backend/.env.example .env
```

2. Adjust the settings in the `.env` file as needed:

```
# Server Configuration
API_PORT=3001
FRONTEND_PORT=8081

# RabbitMQ Configuration
RABBITMQ_URL=amqp://rabbitmq:5672
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest

# Loadsure API Configuration
LOADSURE_API_KEY=your_loadsure_api_key_here
LOADSURE_BASE_URL=https://portal.loadsure.net/api

# Database Configuration
DB_DIALECT=postgres
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=loadsure
DB_PASSWORD=your_postgres_password_here
DB_NAME=loadsure_dev
DB_SSL=false

# Redis Configuration
REDIS_URL=redis://redis:6379

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
# Start production environment
make up

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
- Frontend

### Verify the Services

You can check if all services are running:

```bash
make status
# or
docker-compose ps
```

You should see all services in the "Up" state. The API will be available at http://localhost:3001/api.

The Swagger documentation is available at http://localhost:3001/api-docs.

The frontend will be available at http://localhost:8081.

### Running Tests

To run the automated tests:

```bash
# Unit tests for the backend
cd backend && npm test

# End-to-end tests (with services running)
make e2e-test
# or
make up-and-test
# or
make test
```

## Development Workflow

The project uses a trunk-based development approach:

1. Create a feature branch from `main`
2. Develop and test your changes locally
3. Push your branch and create a pull request to `main`
4. CI pipeline automatically runs tests and validations
5. Get code review and approval from team members
6. Merge your changes into `main`
7. Deployment to staging happens automatically from `main`
8. Deployment to production requires explicit approval

### Makefile Commands

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

# Rebuild only changed services
make rebuild-changed
```

## Deployment

The project uses DigitalOcean App Platform for deployment with Infrastructure as Code using Terraform.

### CI/CD Pipeline

The deployment pipeline (`.github/workflows/deploy.yml`) follows a gated approach:

1. **Trigger**: Deployments are triggered by pushes to `main` or manual dispatch
2. **Environment Determination**: Identifies target environment (staging/production)
3. **Deployment Validation Gate**: First approval gate to proceed with deployment
4. **Infrastructure Deployment**: Applies Terraform configurations
5. **Deployment Monitoring**: Waits for deployment to complete successfully
6. **Database Migrations**: Runs migrations once app is deployed
7. **Smoke Tests**: Verifies basic functionality of the deployed application
8. **Production Final Approval Gate**: Additional approval gate for production
9. **Notifications**: Reports deployment status

For more details, see the [Deployment Guide](docs/deployment.md) and [Infrastructure Documentation](docs/infrastructure.md).

## API Endpoints

### Insurance API
- `POST /api/insurance/quotes` - Get insurance quote (complete format)
- `POST /api/insurance/quotes/simple` - Get insurance quote (simplified format)
- `GET /api/insurance/quotes/:id` - Get a specific quote by ID
- `GET /api/insurance/quotes/list` - List all quotes with pagination
- `POST /api/insurance/bookings` - Book insurance
- `GET /api/insurance/bookings/:id` - Get a specific booking by ID
- `GET /api/insurance/bookings/list` - List all bookings with pagination
- `POST /api/insurance/certificates` - Get certificate details
- `GET /api/insurance/certificates/:number` - Get a specific certificate by number
- `POST /api/insurance/certificates/:number/cancel` - Cancel a certificate
- `GET /api/insurance/certificates/list` - List all certificates with pagination
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
- `GET /api/support-data/health` - Get system health status

### Insurance API Minimum Required JSON

```json
{
   "user": {
      "name": "John Q Doe",
      "email": "example@example.com",
      "id": "example@example.com"
   },
   "assured": {
      "name": "John Q Doe",
      "email": "example@example.com",
      "address": {
         "address1": "123 Fake St",
         "city": "Chicao",
         "state": "IL",
         "postal": "34567",
         "country": "USA"
      }
   },
   "shipment": {
      "version": "2",
      "freightId": "FR-599399",
      "poNumber": "PO-963687",
      "pickupDate": "2025-05-01",
      "deliveryDate": "2025-05-08",
      "cargo": {
         "cargoValue": {
            "currency": "USD",
            "value": 10000
         },
         "commodity": [
            2
         ],
         "fullDescriptionOfCargo": "Electronics",
         "weight": {
            "unit": "lbs",
            "value": 500
         },
         "freightClass": [
            {
               "id": "class50",
               "percentage": 100
            }
         ]
      },
      "carriers": [
         {
            "mode": "ROAD",
            "name": "Swift",
            "equipmentType": 2
         }
      ],
      "stops": [
         {
            "stopType": "PICKUP",
            "stopNumber": 1,
            "date": "2025-05-01",
            "address": {
               "address1": "123 Fake St",
               "city": "Chicao",
               "state": "IL",
               "postal": "34567",
               "country": "USA"
            }
         },
         {
            "stopType": "DELIVERY",
            "stopNumber": 2,
            "date": "2025-05-08",
            "address": {
               "address1": "123 Fake St",
               "city": "Denver",
               "state": "CO",
               "postal": "76543",
               "country": "USA"
            }
         }
      ],
      "loadType": "FULL_TRUCKLOAD_1",
      "equipmentType": 2,
      "integrationFeeType": "fixed",
      "integrationFeeValue": 15
   }
}
```

## Technical Implementation Details

### Blackbox Service Architecture

The Loadsure service has been implemented as a fully isolated blackbox service:

1. **Message-based Communication**: All interaction with the Loadsure service is done through RabbitMQ message queues, eliminating direct API calls between services.

2. **Self-contained Processing**: The service independently handles all aspects of Loadsure API interaction, from authentication to error handling.

3. **Database Independence**: The service uses the shared database only for persistence, with no assumptions about database schema outside its domain.

4. **Configurable Concurrency**: Worker instances can process multiple requests concurrently with configurable limits.

5. **Auto-scaling Capability**: The queue monitor service can dynamically adjust the number of worker instances based on queue depth.

### Request Routing and Correlation

The system uses a sophisticated request routing and correlation mechanism:

1. **Distributed Request Tracking**: Redis is used to track pending requests across all API service instances.

2. **Unique Request IDs**: Each request is assigned a UUID that flows through the entire system.

3. **Asynchronous Response Correlation**: When a response arrives via message queue, it's correlated with the original request using the request ID.

4. **Timeout Handling**: If a response doesn't arrive within a configured timeout, an appropriate error is returned to the client.

5. **Instance Affinity**: Responses are routed back to the original API service instance that initiated the request when possible.

### Enhanced Database Schema

The database schema has been optimized for reliability and flexibility:

1. **Soft Deletes**: All tables support soft deletion with `deletedAt` columns.

2. **JSON Storage**: Complex data structures are stored in JSONB columns for flexibility.

3. **Field Length Increases**: String fields have been lengthened to accommodate larger values.

4. **Support Data Tables**: Dedicated tables for support data with appropriate indexing.

5. **Integration Fee Fields**: Added support for percentage or fixed-amount integration fees.

### Resilient Caching Strategy

The system employs a multi-level caching strategy:

1. **Redis Primary Cache**: Fast in-memory cache for quick access to frequently used data.

2. **Database Secondary Cache**: Persistent storage that serves as a fallback if Redis is unavailable.

3. **Cache Warmup**: On service startup, the cache is pre-populated from the database.

4. **Automatic Refresh**: Stale cache entries are automatically refreshed when accessed.

5. **Manual Refresh Option**: An API endpoint allows manual cache refresh when needed.

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
curl http://localhost:3001/api/support-data/status
```

### Manual Refresh
Trigger a manual refresh of support data:
```bash
curl -X POST http://localhost:3001/api/support-data/refresh
```

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

5. **Certificate operations failing**
   - Check that the user ID matches the format expected by Loadsure
   - Verify that the certificate number exists
   - Check permissions for the user ID

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