// backend/src/swagger.js
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

// Swagger definition
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Loadsure Insurance Integration API',
      version: '1.0.0',
      description: 'API documentation for the Loadsure Insurance Integration Microservice',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: '/api',
        description: 'Development server'
      }
    ],
    tags: [
      {
        name: 'Insurance Quotes',
        description: 'Operations related to insurance quotes'
      },
      {
        name: 'Insurance Bookings',
        description: 'Operations related to insurance bookings'
      },
      {
        name: 'Certificates',
        description: 'Operations related to insurance certificates'
      },
      {
        name: 'Support Data',
        description: 'Operations related to reference data'
      }
    ],
    components: {
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            },
            requestId: {
              type: 'string',
              description: 'Request ID for tracking'
            },
            status: {
              type: 'string',
              enum: ['error'],
              description: 'Response status'
            }
          }
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['success'],
              description: 'Response status'
            }
          }
        },
        QuoteResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['success'],
              description: 'Response status'
            },
            quote: {
              $ref: '#/components/schemas/Quote'
            }
          }
        },
        BookingResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['success'],
              description: 'Response status'
            },
            booking: {
              $ref: '#/components/schemas/Booking'
            }
          }
        },
        CertificateResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['success'],
              description: 'Response status'
            },
            certificate: {
              $ref: '#/components/schemas/Certificate'
            }
          }
        },
        QuoteListResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['success'],
              description: 'Response status'
            },
            quotes: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Quote'
              }
            },
            pagination: {
              $ref: '#/components/schemas/Pagination'
            }
          }
        },
        BookingListResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['success'],
              description: 'Response status'
            },
            bookings: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Booking'
              }
            },
            pagination: {
              $ref: '#/components/schemas/Pagination'
            }
          }
        },
        CertificateListResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['success'],
              description: 'Response status'
            },
            certificates: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Certificate'
              }
            },
            pagination: {
              $ref: '#/components/schemas/Pagination'
            }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            total: {
              type: 'integer',
              description: 'Total number of items'
            },
            page: {
              type: 'integer',
              description: 'Current page number'
            },
            limit: {
              type: 'integer',
              description: 'Number of items per page'
            },
            pages: {
              type: 'integer',
              description: 'Total number of pages'
            }
          }
        },
        Quote: {
          type: 'object',
          properties: {
            quoteId: {
              type: 'string',
              description: 'Unique quote identifier from Loadsure'
            },
            premium: {
              type: 'number',
              format: 'double',
              description: 'Insurance premium amount'
            },
            currency: {
              type: 'string',
              description: 'Currency code (e.g., USD, EUR, GBP)'
            },
            coverageAmount: {
              type: 'number',
              format: 'double',
              description: 'Total coverage amount'
            },
            terms: {
              type: 'string',
              description: 'Insurance terms and conditions'
            },
            expiresAt: {
              type: 'string',
              format: 'date-time',
              description: 'Quote expiration date and time'
            },
            deductible: {
              type: 'number',
              format: 'double',
              description: 'Insurance deductible amount'
            },
            integrationFeeType: {
              type: 'string',
              enum: ['percentage', 'fixed', null],
              description: 'Type of integration fee'
            },
            integrationFeeValue: {
              type: 'number',
              format: 'double',
              description: 'Value of integration fee (percentage or fixed amount)'
            },
            integrationFeeAmount: {
              type: 'number',
              format: 'double',
              description: 'Calculated integration fee amount'
            },
            totalCost: {
              type: 'string',
              description: 'Total cost including premium and integration fee'
            },
            status: {
              type: 'string',
              enum: ['active', 'expired', 'booked', 'cancelled'],
              description: 'Current status of the quote'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Date and time when the quote was created'
            }
          }
        },
        Booking: {
          type: 'object',
          properties: {
            bookingId: {
              type: 'string',
              description: 'Unique booking identifier'
            },
            quoteId: {
              type: 'string',
              description: 'Related quote identifier'
            },
            policyNumber: {
              type: 'string',
              description: 'Insurance policy number'
            },
            certificateUrl: {
              type: 'string',
              format: 'uri',
              description: 'URL to download the insurance certificate'
            },
            status: {
              type: 'string',
              enum: ['active', 'cancelled', 'expired'],
              description: 'Current status of the booking'
            },
            premium: {
              type: 'number',
              format: 'double',
              description: 'Insurance premium amount'
            },
            coverageAmount: {
              type: 'number',
              format: 'double',
              description: 'Total coverage amount'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Date and time when the booking was created'
            }
          }
        },
        Certificate: {
          type: 'object',
          properties: {
            certificateNumber: {
              type: 'string',
              description: 'Certificate number from Loadsure'
            },
            productName: {
              type: 'string',
              description: 'Insurance product name'
            },
            productId: {
              type: 'string',
              description: 'Insurance product identifier'
            },
            status: {
              type: 'string',
              enum: ['ACTIVE', 'CANCELLED', 'EXPIRED', 'PENDING'],
              description: 'Current status of the certificate'
            },
            coverageAmount: {
              type: 'number',
              format: 'double',
              description: 'Total coverage amount'
            },
            premium: {
              type: 'number',
              format: 'double',
              description: 'Insurance premium amount'
            },
            certificateLink: {
              type: 'string',
              format: 'uri',
              description: 'URL to download the insurance certificate'
            },
            validFrom: {
              type: 'string',
              format: 'date-time',
              description: 'Start date of certificate validity'
            },
            validTo: {
              type: 'string',
              format: 'date-time',
              description: 'End date of certificate validity'
            }
          }
        },
        FreightDetailsSimple: {
          type: 'object',
          required: ['description', 'value', 'originCity', 'originState', 'destinationCity', 'destinationState'],
          properties: {
            description: {
              type: 'string',
              description: 'Description of the freight'
            },
            freightClass: {
              type: 'string',
              description: 'Freight class'
            },
            value: {
              type: 'number',
              format: 'double',
              description: 'Value of the freight'
            },
            originCity: {
              type: 'string',
              description: 'Origin city'
            },
            originState: {
              type: 'string',
              description: 'Origin state or province'
            },
            destinationCity: {
              type: 'string',
              description: 'Destination city'
            },
            destinationState: {
              type: 'string',
              description: 'Destination state or province'
            },
            currency: {
              type: 'string',
              default: 'USD',
              description: 'Currency code'
            },
            dimensionLength: {
              type: 'number',
              description: 'Length of the freight'
            },
            dimensionWidth: {
              type: 'number',
              description: 'Width of the freight'
            },
            dimensionHeight: {
              type: 'number',
              description: 'Height of the freight'
            },
            dimensionUnit: {
              type: 'string',
              default: 'in',
              description: 'Unit of dimension measurements'
            },
            weightValue: {
              type: 'number',
              description: 'Weight of the freight'
            },
            weightUnit: {
              type: 'string',
              default: 'lbs',
              description: 'Unit of weight measurement'
            },
            commodityId: {
              type: 'string',
              description: 'Commodity ID from Loadsure'
            },
            loadTypeId: {
              type: 'string',
              description: 'Load type ID from Loadsure'
            },
            equipmentTypeId: {
              type: 'string',
              description: 'Equipment type ID from Loadsure'
            },
            pickupDate: {
              type: 'string',
              format: 'date',
              description: 'Pickup date'
            },
            deliveryDate: {
              type: 'string',
              format: 'date',
              description: 'Delivery date'
            },
            userName: {
              type: 'string',
              description: 'User name'
            },
            userEmail: {
              type: 'string',
              format: 'email',
              description: 'User email'
            },
            assuredName: {
              type: 'string',
              description: 'Assured company name'
            },
            assuredEmail: {
              type: 'string',
              format: 'email',
              description: 'Assured company email'
            },
            integrationFeeType: {
              type: 'string',
              enum: ['percentage', 'fixed', null],
              description: 'Type of integration fee'
            },
            integrationFeeValue: {
              type: 'number',
              format: 'double',
              description: 'Value of integration fee (percentage or fixed amount)'
            }
          }
        },
        FreightDetailsComplete: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              required: ['email'],
              properties: {
                id: { type: 'string' },
                email: { type: 'string', format: 'email' },
                name: { type: 'string' }
              },
              description: 'User information'
            },
            assured: {
              type: 'object',
              required: ['name'],
              properties: {
                name: { type: 'string' },
                email: { type: 'string', format: 'email' },
                address: {
                  type: 'object',
                  properties: {
                    address1: { type: 'string' },
                    address2: { type: 'string' },
                    city: { type: 'string' },
                    state: { type: 'string' },
                    postal: { type: 'string' },
                    country: { type: 'string' }
                  }
                }
              },
              description: 'Assured information'
            },
            shipment: {
              type: 'object',
              required: ['cargo'],
              properties: {
                version: { type: 'string', default: '2' },
                freightId: { type: 'string' },
                poNumber: { type: 'string' },
                pickupDate: { type: 'string', format: 'date' },
                deliveryDate: { type: 'string', format: 'date' },
                cargo: {
                  type: 'object',
                  required: ['cargoValue', 'fullDescriptionOfCargo'],
                  properties: {
                    cargoValue: {
                      type: 'object',
                      required: ['value'],
                      properties: {
                        currency: { type: 'string', default: 'USD' },
                        value: { type: 'number', format: 'double' }
                      }
                    },
                    commodity: {
                      type: 'array',
                      items: { type: 'integer' }
                    },
                    fullDescriptionOfCargo: { type: 'string' },
                    weight: {
                      type: 'object',
                      properties: {
                        unit: { type: 'string', default: 'lbs' },
                        value: { type: 'number', format: 'double' }
                      }
                    },
                    freightClass: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          percentage: { type: 'number' }
                        }
                      }
                    }
                  }
                },
                carriers: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      mode: { type: 'string', default: 'ROAD' },
                      name: { type: 'string' },
                      email: { type: 'string', format: 'email' },
                      phone: { type: 'string' },
                      carrierId: {
                        type: 'object',
                        properties: {
                          type: { type: 'string', default: 'USDOT' },
                          value: { type: 'string' }
                        }
                      },
                      equipmentType: { type: 'integer' }
                    }
                  }
                },
                stops: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      stopType: { type: 'string', enum: ['PICKUP', 'DELIVERY', 'INTERMEDIATE'] },
                      stopNumber: { type: 'integer' },
                      date: { type: 'string', format: 'date' },
                      address: {
                        type: 'object',
                        properties: {
                          address1: { type: 'string' },
                          address2: { type: 'string' },
                          city: { type: 'string' },
                          state: { type: 'string' },
                          postal: { type: 'string' },
                          country: { type: 'string', default: 'USA' }
                        }
                      }
                    }
                  }
                },
                loadType: { type: 'string' },
                equipmentType: { type: 'integer' },
                integrationFeeType: {
                  type: 'string',
                  enum: ['percentage', 'fixed']
                },
                integrationFeeValue: {
                  type: 'number',
                  format: 'double'
                }
              }
            }
          }
        },
        BookingRequest: {
          type: 'object',
          required: ['quoteId'],
          properties: {
            quoteId: {
              type: 'string',
              description: 'Quote ID to book'
            },
            callbackUrl: {
              type: 'string',
              format: 'uri',
              description: 'Optional callback URL for asynchronous processing'
            }
          }
        },
        CertificateRequest: {
          type: 'object',
          required: ['certificateNumber', 'userId'],
          properties: {
            certificateNumber: {
              type: 'string',
              description: 'Certificate number to retrieve'
            },
            userId: {
              type: 'string',
              description: 'User ID for authentication with Loadsure'
            }
          }
        },
        SupportDataStatus: {
          type: 'object',
          properties: {
            lastUpdated: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            },
            refreshActive: {
              type: 'boolean',
              description: 'Whether automatic refresh is active'
            },
            refreshSchedule: {
              type: 'string',
              description: 'Cron schedule expression for automatic refresh'
            },
            dataAvailable: {
              type: 'object',
              properties: {
                commodities: { type: 'boolean' },
                commodityExclusions: { type: 'boolean' },
                equipmentTypes: { type: 'boolean' },
                loadTypes: { type: 'boolean' },
                freightClasses: { type: 'boolean' },
                termsOfSales: { type: 'boolean' }
              }
            }
          }
        },
        SupportDataRefreshRequest: {
          type: 'object',
          properties: {
            schedule: {
              type: 'string',
              description: 'Cron schedule expression'
            }
          }
        },
        SearchParams: {
          type: 'object',
          required: ['term'],
          properties: {
            term: {
              type: 'string',
              description: 'Search term'
            },
            type: {
              type: 'string',
              enum: ['all', 'quotes', 'bookings', 'certificates'],
              default: 'all',
              description: 'Type of records to search'
            }
          }
        }
      }
    }
  },
  apis: ['./src/controllers/*.js'], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

/**
 * Function to setup Swagger middleware
 * @param {Express} app - Express application
 */
function setupSwagger(app) {
  // Serve swagger docs
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Serve swagger.json for external documentation systems
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log('Swagger docs available at /api-docs');
}

export { setupSwagger };