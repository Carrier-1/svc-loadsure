// Project README.md
# Loadsure Insurance Integration

This project provides a complete solution for integrating Loadsure cargo insurance into your shipping application. It consists of:

1. A Node.js-based backend microservice for handling insurance quotes and bookings
2. A Vue.js frontend component for displaying insurance options to users

## Project Structure

```
├── backend/                  # Node.js microservice
│   ├── src/
│   │   └── index.js          # Main application file
│   ├── .env                  # Environment variables
│   └── package.json          # Backend dependencies
│
└── frontend/                 # Vue.js application
    ├── public/               # Static assets
    ├── src/
    │   ├── assets/           # Images and CSS
    │   ├── components/
    │   │   └── CargoInsurance.vue  # Insurance component
    │   ├── App.vue           # Main application component
    │   └── main.js           # Vue application entry point
    └── package.json          # Frontend dependencies
```

## Backend Setup

1. Navigate to the backend directory
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file with your Loadsure API credentials
4. Start the development server:
   ```
   npm run dev
   ```

## Frontend Setup

1. Navigate to the frontend directory
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm run serve
   ```

## Architecture

The system follows an event-driven microservice architecture:

1. The frontend sends a request to the backend API for an insurance quote
2. The backend processes the request asynchronously through events
3. The backend communicates with the Loadsure API to get quotes and book insurance
4. Results are returned to the frontend for display to the user

## Usage

### Getting a Quote

1. User enters freight details in the UI
2. UI sends details to the backend
3. Backend requests quote from Loadsure
4. Quote is displayed to user with protection comparison

### Booking Insurance

1. User selects to purchase insurance
2. UI sends booking request to backend
3. Backend books insurance with Loadsure
4. Confirmation and certificate are returned to the user

## Production Deployment

For production, consider:

1. Adding proper authentication and authorization
2. Implementing a database for persistent storage
3. Setting up logging and monitoring
4. Deploying behind a load balancer for high availability