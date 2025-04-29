# Loadsure Insurance Integration API Documentation

This document provides information on how to use the Loadsure Insurance Integration API. The API allows you to integrate cargo insurance functionality from Loadsure into your shipping application.

## API Documentation (Swagger)

The API includes comprehensive documentation using Swagger, which provides an interactive interface to explore and test the API endpoints.

### Accessing Swagger Documentation

When the service is running, the Swagger documentation is available at:

```
http://localhost:3000/api-docs
```

The Swagger interface allows you to:
- Browse all available API endpoints
- View request/response schemas
- Send test requests directly from the browser
- View detailed error information

### Swagger JSON Export

If you need to import the API documentation into other tools, you can access the raw Swagger JSON at:

```
http://localhost:3000/api-docs.json
```

## API Overview

The API is organized into the following main sections:

### 1. Insurance Quotes

Endpoints related to requesting and managing insurance quotes:

- `POST /api/insurance/quotes` - Request a quote using the complete API structure
- `POST /api/insurance/quotes/simple` - Request a quote using simplified parameters
- `GET /api/insurance/quotes/{id}` - Get a specific quote by ID
- `GET /api/insurance/quotes/list` - List all quotes with pagination

### 2. Insurance Bookings

Endpoints related to booking insurance:

- `POST /api/insurance/bookings` - Book insurance based on a quote
- `GET /api/insurance/bookings/{id}` - Get a specific booking by ID
- `GET /api/insurance/bookings/list` - List all bookings with pagination

### 3. Certificates

Endpoints related to insurance certificates:

- `POST /api/insurance/certificates` - Get certificate details by number
- `GET /api/insurance/certificates/{number}` - Get a specific certificate by number
- `GET /api/insurance/certificates/list` - List all certificates with pagination

### 4. Support Data

Endpoints for accessing reference data from Loadsure:

- `GET /api/support-data/commodities` - Get all commodities
- `GET /api/support-data/commodity-exclusions` - Get all commodity exclusions
- `GET /api/support-data/equipment-types` - Get all equipment types
- `GET /api/support-data/load-types` - Get all load types
- `GET /api/support-data/freight-classes` - Get all freight classes
- `GET /api/support-data/terms-of-sales` - Get all terms of sales
- `GET /api/support-data/status` - Get support data status
- `POST /api/support-data/refresh` - Manually refresh support data
- `POST /api/support-data/schedule` - Update refresh schedule

### 5. Utility Endpoints

Additional utility endpoints:

- `GET /api/insurance/stats` - Get statistics about quotes, bookings, and certificates
- `GET /api/insurance/search` - Search across quotes, bookings, and certificates

## Quick Start Guide

Here's how to get started with the most important endpoints:

### Support Data

Before requesting quotes, it's recommended to fetch reference data:

```javascript
// Get freight classes
const freightClassesResponse = await fetch('http://localhost:3000/api/support-data/freight-classes');
const freightClasses = await freightClassesResponse.json();

// Get equipment types
const equipmentTypesResponse = await fetch('http://localhost:3000/api/support-data/equipment-types');
const equipmentTypes = await equipmentTypesResponse.json();
```

### Requesting a Quote (Simple Method)

The simplest way to request a quote:

```javascript
const quoteResponse = await fetch('http://localhost:3000/api/insurance/quotes/simple', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    description: "Electronic Equipment",
    freightClass: "70",
    value: 25000,
    originCity: "Chicago",
    originState: "IL",
    destinationCity: "Denver",
    destinationState: "CO",
    userName: "John Doe",
    userEmail: "john@example.com",
    assuredName: "Acme Shipping",
    assuredEmail: "shipping@acme.com"
  })
});

const quoteData = await quoteResponse.json();
const quoteId = quoteData.quote.quoteId;
```

### Booking Insurance

Once you have a quote, you can book the insurance:

```javascript
const bookingResponse = await fetch('http://localhost:3000/api/insurance/bookings', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    quoteId: quoteId
  })
});

const bookingData = await bookingResponse.json();
const certificateUrl = bookingData.booking.certificateUrl;
```

## Integration Flow

The typical integration flow is:

1. Fetch support data for dropdowns and reference data
2. Request a quote using the simple or complete API
3. Display quote details to the user
4. Book insurance if the user accepts the quote
5. Store the booking information and certificate URL

## Advanced Usage

### Integration Fees

The API supports adding integration fees to quotes:

```javascript
// Add a percentage-based fee (10%)
const quoteWithFeeResponse = await fetch('http://localhost:3000/api/insurance/quotes/simple', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    // Basic quote details...
    integrationFeeType: "percentage",
    integrationFeeValue: 0.1 // 10%
  })
});
```

### Complete API Structure

For more complex cases, you can use the complete API structure:

```javascript
const completeQuoteResponse = await fetch('http://localhost:3000/api/insurance/quotes', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    user: {
      id: "user123",
      email: "user@example.com",
      name: "User Name"
    },
    assured: {
      name: "Assured Company",
      email: "assured@example.com",
      address: {
        address1: "123 Main St",
        city: "Chicago",
        state: "IL",
        postal: "60601",
        country: "USA"
      }
    },
    shipment: {
      version: "2",
      freightId: "FR-12345",
      poNumber: "PO-67890",
      pickupDate: "2025-05-01",
      deliveryDate: "2025-05-07",
      cargo: {
        cargoValue: {
          currency: "USD",
          value: 25000
        },
        commodity: [7], // Electronics
        fullDescriptionOfCargo: "Electronic Equipment",
        weight: {
          unit: "lbs",
          value: 500
        },
        freightClass: [
          {
            id: "class70",
            percentage: 100
          }
        ]
      },
      carriers: [
        {
          mode: "ROAD",
          name: "ABC Trucking",
          email: "dispatch@abctrucking.com",
          phone: "555-123-4567",
          carrierId: {
            type: "USDOT",
            value: "12345678"
          },
          equipmentType: 2 // Dry Van
        }
      ],
      stops: [
        {
          stopType: "PICKUP",
          stopNumber: 1,
          date: "2025-05-01",
          address: {
            address1: "123 Pickup St",
            city: "Chicago",
            state: "IL",
            postal: "60601",
            country: "USA"
          }
        },
        {
          stopType: "DELIVERY",
          stopNumber: 2,
          date: "2025-05-07",
          address: {
            address1: "456 Delivery Ave",
            city: "Denver",
            state: "CO",
            postal: "80202",
            country: "USA"
          }
        }
      ],
      loadType: "FULL_TRUCKLOAD_1",
      equipmentType: 2 // Dry Van
    }
  })
});
```

## Error Handling

The API uses standard HTTP status codes and provides detailed error messages:

- `400 Bad Request` - Invalid input parameters
- `404 Not Found` - Resource not found
- `408 Request Timeout` - Request timed out (async operations)
- `500 Internal Server Error` - Server-side error

Example error response:

```json
{
  "error": "Missing required fields: description, freightClass, value",
  "requestId": "123e4567-e89b-12d3-a456-426614174000",
  "status": "error"
}
```

## Rate Limits and Performance

The API does not currently implement rate limiting, but it's recommended to limit requests to ensure optimal performance:

- Quotes: Maximum 5 requests per second
- Bookings: Maximum 2 requests per second
- Reference data: Cache locally when possible

## Support and Feedback

For issues, questions, or feature requests, please contact support at:

- Email: support@example.com
- GitHub Issues: [https://github.com/your-org/loadsure-integration/issues](https://github.com/your-org/loadsure-integration/issues)

## License

This API and documentation are provided under the MIT License.