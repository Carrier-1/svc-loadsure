Loadsure Insurance Integration
This project provides a complete event-driven microservice solution for integrating cargo insurance functionality from Loadsure into your shipping application.

Architecture Overview
The system uses an event-driven microservice architecture with RabbitMQ as the message broker and Redis as the indempotency/request coordination/caching layer, providing asynchronous communication between components.

Key Components
API Service
Exposes RESTful endpoints for quote requests and insurance booking
Communicates with other components via message queues
Serves cached support data to frontend applications
Handles request routing and response coordination
Loadsure API Service
Encapsulated, self-contained service that handles direct communication with Loadsure's APIs
Maps internal data formats to Loadsure's expected formats
Processes API responses and formats them for internal use
Functions as a blackbox service with message-based communication
Database Service
Handles all database operations related to quotes, bookings, and certificates
Provides persistence layer with soft-delete capability
Supports atomic transactions and integrity constraints
Maintains relationship mapping between related entities
Support Data Service
Fetches and caches reference data from Loadsure
Uses dual-layer caching (Redis + PostgreSQL) for resilience
Provides mapping functions between internal and Loadsure formats
Exposes endpoints for frontend to access reference data
Support Data Refresh Service
Manages scheduled updates of reference data
Supports manual refresh requests
Uses distributed locking to prevent duplicate refreshes
Ensures data is always up-to-date
Queue Monitor Service
Monitors queue depths in RabbitMQ
Auto-scales worker processes based on load
Ensures optimal resource utilization
Supports both Docker and non-Docker scaling modes
RabbitMQ
Acts as the message broker between services
Provides reliable message delivery with acknowledgments
Supports error handling and retry mechanisms
Enables service isolation and decoupling
Redis
Used for distributed request tracking
Provides fast caching of support data
Handles response coordination between services
Enables higher throughput and resilience
PostgreSQL
Stores quotes, bookings, and certificates
Provides persistent storage for reporting and auditing
Powers data retrieval APIs
Supports complex queries and relationships
NGINX Gateway
Provides a unified API endpoint
Handles load balancing across API service instances
Sets appropriate timeouts and headers
Serves as the entry point for all client requests
Data Flow
Quote Request Flow
Frontend submits freight details to /api/insurance/quotes or /api/insurance/quotes/simple
API service generates a unique request ID and stores the request in Redis
API service publishes a message to the quote-requested queue
Loadsure API service consumes the message and calls Loadsure API
Loadsure API service saves the result to the database
Loadsure API service publishes result to the quote-received queue
API service receives the result, correlates it with the original request using Redis
API service returns the result to the frontend
Insurance Booking Flow
Frontend submits booking request to /api/insurance/bookings
API service generates a unique request ID and stores the request in Redis
API service publishes a message to the booking-requested queue
Loadsure API service consumes the message and calls Loadsure API
Loadsure API service saves the booking to the database
Loadsure API service publishes result to the booking-confirmed queue
API service receives the result, correlates it with the original request using Redis
API service returns the result to the frontend
Certificate Cancellation Flow
Frontend submits cancellation request to /api/insurance/certificates/{number}/cancel
API service generates a unique request ID and stores the request in Redis
API service publishes a message to the certificate-cancellation-requested queue
Loadsure API service consumes the message and calls Loadsure API
Loadsure API service updates the certificate status in the database
Loadsure API service publishes result to the certificate-cancellation-confirmed queue
API service receives the result, correlates it with the original request using Redis
API service returns the result to the frontend
Support Data Flow
On startup, support data is loaded from database (if available)
If cache is cold or data is stale, fresh data is fetched from Loadsure API
Data is cached in Redis for fast access and stored in PostgreSQL for persistence
Daily scheduled refresh keeps data current
Frontend can access current data via API endpoints
Project Structure
loadsure-integration/
├── backend/
│   ├── src/
│   │   ├── controllers/          # API routes handlers
│   │   ├── services/             # Business logic services
│   │   │   ├── loadsureApiService.js    # Loadsure API integration
│   │   │   ├── loadsureService.js       # Message-based service
│   │   │   ├── databaseService.js       # Database operations
│   │   │   ├── supportDataService.js    # Support data management
│   │   │   ├── supportDataRefreshService.js # Scheduled refreshes
│   │   │   ├── queueMonitorService.js   # Queue monitoring
│   │   │   └── queueMonitorStarter.js   # Service initializer
│   │   ├── middleware/           # Express middleware
│   │   │   └── rateLimiter.js    # Rate limiting with Redis
│   │   ├── config.js             # Configuration
│   │   ├── index.js              # Main application
│   │   └── swagger.js            # API documentation
│   ├── database/                 # Database models and migrations
│   │   ├── config.js             # Database configuration
│   │   ├── config.cjs            # CommonJS config for Sequelize CLI
│   │   ├── models/               # Sequelize models
│   │   │   ├── Quote.js          # Quote model
│   │   │   ├── Booking.js        # Booking model
│   │   │   └── Certificate.js    # Certificate model
│   │   ├── migrations/           # Database migrations
│   │   │   ├── 20250428000001-create-initial-schema.cjs
│   │   │   ├── 20250429000001-increase-field-lengths.cjs
│   │   │   ├── 20250429000002-add-integration-fee-fields.cjs
│   │   │   ├── 20250429000003-fix-certificate-booking-associate.cjs
│   │   │   ├── 20250507000001-create-support-data-tables.cjs
│   │   │   └── 20250507000002-fix-support-terms-of-sale.cjs
│   │   ├── seeders/              # Seed data
│   │   └── index.js              # Database initialization
│   ├── __tests__/                # Unit and integration tests
│   ├── .env.example              # Environment variables template
│   ├── Dockerfile                # Backend container definition
│   ├── .eslintrc.js              # ESLint configuration
│   ├── .dockerignore             # Docker ignore file
│   ├── babel.config.cjs          # Babel configuration for tests
│   ├── jest.config.cjs           # Jest configuration
│   └── package.json              # Dependencies
├── frontend/                     # Frontend application (placeholder)
├── docker-compose.yml            # Main container orchestration
├── docker-compose.dev.yml        # Development environment overrides
├── nginx.conf                    # NGINX configuration
├── .sequelizerc                  # Sequelize CLI configuration
├── Makefile                      # Development workflow commands
├── cleanup.sh                    # Helper script to clean node_modules
├── e2e-test.js                   # End-to-end test script
├── run-e2e-test.sh               # E2E test runner script
└── package.json                  # Root project dependencies
Prerequisites
Before getting started, make sure you have the following prerequisites installed:

Docker (>= 20.10.0)
Docker Compose (>= 2.0.0)
Node.js (>= 18.0.0) for local development
NPM (>= 9.0.0) or Yarn (>= 1.22.0)
Getting Started
Clone the Repository
bash
git clone https://github.com/yourusername/loadsure-integration.git
cd loadsure-integration
Configuration
Create a .env file in the root directory:
bash
cp backend/.env.example backend/.env
Adjust the settings in the .env file as needed:
# Server Configuration
PORT=3000

# RabbitMQ Configuration
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
RABBITMQ_USER=guest
RABBITMQ_PASS=guest

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

# Redis Configuration
REDIS_URL=redis://redis:6379

# Queue Scaling (optional)
MIN_WORKERS=1
MAX_WORKERS=5
SCALE_UP_THRESHOLD=10
SCALE_DOWN_THRESHOLD=2
CHECK_INTERVAL=10000
WORKER_CONCURRENCY=3
Starting the Services
You can use the included Makefile to easily start all services:

bash
# Start development environment
make dev

# Or use Docker Compose directly
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
This will start:

PostgreSQL database
RabbitMQ message broker
Redis cache
Database migration service
API service
Loadsure service
Queue monitor
NGINX gateway
Frontend (placeholder)
Verify the Services
You can check if all services are running:

bash
make status
# or
docker-compose ps
You should see all services in the "Up" state. The API will be available at http://localhost:3000/api.

The Swagger documentation is available at http://localhost:3000/api-docs.

Running Tests
To run the automated tests:

bash
# Unit tests for the backend
make unit-test

# End-to-end tests (with services running)
make e2e-test

# all tests (with services running)
make test

API Endpoints
Insurance API
POST /api/insurance/quotes - Get insurance quote (complete format)
POST /api/insurance/quotes/simple - Get insurance quote (simplified format)
GET /api/insurance/quotes/:id - Get a specific quote by ID
GET /api/insurance/quotes/list - List all quotes with pagination
POST /api/insurance/bookings - Book insurance
GET /api/insurance/bookings/:id - Get a specific booking by ID
GET /api/insurance/bookings/list - List all bookings with pagination
POST /api/insurance/certificates - Get certificate details
GET /api/insurance/certificates/:number - Get a specific certificate by number
POST /api/insurance/certificates/:number/cancel - Cancel a certificate
GET /api/insurance/certificates/list - List all certificates with pagination
GET /api/insurance/stats - Get system statistics
GET /api/insurance/search - Search across quotes, bookings, and certificates
Support Data API
GET /api/support-data/commodities - Get list of commodities
GET /api/support-data/commodity-exclusions - Get commodity exclusions
GET /api/support-data/equipment-types - Get equipment types
GET /api/support-data/load-types - Get load types
GET /api/support-data/freight-classes - Get freight classes
GET /api/support-data/terms-of-sales - Get terms of sales
GET /api/support-data/status - Get support data status
POST /api/support-data/refresh - Manually refresh support data
POST /api/support-data/schedule - Update refresh schedule
GET /api/support-data/health - Get system health status
Technical Implementation Details
Blackbox Service Architecture
The Loadsure service has been implemented as a fully isolated blackbox service:

Message-based Communication: All interaction with the Loadsure service is done through RabbitMQ message queues, eliminating direct API calls between services.
Self-contained Processing: The service independently handles all aspects of Loadsure API interaction, from authentication to error handling.
Database Independence: The service uses the shared database only for persistence, with no assumptions about database schema outside its domain.
Configurable Concurrency: Worker instances can process multiple requests concurrently with configurable limits.
Auto-scaling Capability: The queue monitor service can dynamically adjust the number of worker instances based on queue depth.
Request Routing and Correlation
The system uses a sophisticated request routing and correlation mechanism:

Distributed Request Tracking: Redis is used to track pending requests across all API service instances.
Unique Request IDs: Each request is assigned a UUID that flows through the entire system.
Asynchronous Response Correlation: When a response arrives via message queue, it's correlated with the original request using the request ID.
Timeout Handling: If a response doesn't arrive within a configured timeout, an appropriate error is returned to the client.
Instance Affinity: Responses are routed back to the original API service instance that initiated the request when possible.
Enhanced Database Schema
The database schema has been optimized for reliability and flexibility:

Soft Deletes: All tables support soft deletion with deletedAt columns.
JSON Storage: Complex data structures are stored in JSONB columns for flexibility.
Field Length Increases: String fields have been lengthened to accommodate larger values.
Support Data Tables: Dedicated tables for support data with appropriate indexing.
Integration Fee Fields: Added support for percentage or fixed-amount integration fees.
Resilient Caching Strategy
The system employs a multi-level caching strategy:

Redis Primary Cache: Fast in-memory cache for quick access to frequently used data.
Database Secondary Cache: Persistent storage that serves as a fallback if Redis is unavailable.
Cache Warmup: On service startup, the cache is pre-populated from the database.
Automatic Refresh: Stale cache entries are automatically refreshed when accessed.
Manual Refresh Option: An API endpoint allows manual cache refresh when needed.
Development Workflow
The project includes several helpful commands in the Makefile for common development tasks:

bash
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
Developing Locally
While the services run in Docker containers, you can also run parts of the application locally for faster development:

bash
# Install dependencies
cd backend && npm install

# Start the API service locally
npm run dev

# Start the Loadsure service locally
npm run service

# Start the queue monitor locally
npm run monitor
Note: When running services locally, adjust the .env file to connect to the Docker services:

RABBITMQ_URL=amqp://localhost:5672
REDIS_URL=redis://localhost:6379
DB_HOST=localhost
Monitoring and Maintenance
RabbitMQ Management
Access the RabbitMQ management console at http://localhost:15672 (guest/guest) to monitor queues, connections, and messages.

Database Access
You can connect to the PostgreSQL database:

bash
docker-compose exec postgres psql -U loadsure -d loadsure_dev
Redis Inspection
Inspect Redis contents:

bash
docker-compose exec redis redis-cli
Support Data Status
Check the status of the support data:

bash
curl http://localhost:3000/api/support-data/status
Manual Refresh
Trigger a manual refresh of support data:

bash
curl -X POST http://localhost:3000/api/support-data/refresh
Production Deployment
Before deploying to production, consider:

Security
Add proper authentication to API endpoints
Secure RabbitMQ with authentication and TLS
Use secrets management for API keys
Configure firewalls and network security
Persistence
Configure persistent volumes for PostgreSQL, RabbitMQ, and Redis
Implement backup and restore procedures
Set up database replication
Scalability
Adjust replica counts for Loadsure service
Add load balancing for the API service
Configure PostgreSQL for high availability
Monitoring
Implement health checks and metrics
Set up alerts for service failures
Monitor queue depths and message processing times
Disaster Recovery
Document recovery procedures
Test failovers regularly
Implement backup verification
Troubleshooting
Common Issues
Database connection fails
Check if postgres container is running
Verify database credentials in .env
Wait a few seconds for the database to initialize
RabbitMQ connection fails
Check if rabbitmq container is running
Verify RabbitMQ credentials in .env
Check network connectivity between services
Redis connection fails
Check if redis container is running
Verify Redis URL in .env
API returns 408 Request Timeout
This usually means the Loadsure Service is not processing messages
Check Loadsure Service logs for errors
Verify Loadsure API key is valid
Certificate operations failing
Check that the user ID matches the format expected by Loadsure
Verify that the certificate number exists
Check permissions for the user ID
Logs Access
To view logs for troubleshooting:

bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api-service
docker-compose logs -f loadsure-service
Contributing
Create a feature branch from main
Make your changes
Add tests for new functionality
Ensure tests pass with npm test
Submit a pull request
