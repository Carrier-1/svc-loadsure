#!/bin/bash
# run-e2e-test.sh
# Script to wait for services to be ready and then run the E2E test

set -e  # Exit on error

# Configuration
API_URL=${API_URL:-"http://localhost:3000/api"}
MAX_RETRIES=30
RETRY_INTERVAL=5
HEALTH_ENDPOINT="http://localhost:3000/health"

# Print banner
echo "================================================"
echo "Loadsure Insurance Integration E2E Test Runner"
echo "================================================"
echo "API URL: $API_URL"
echo

# Ensure we have the necessary dependencies
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is required but not installed."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "Error: npm is required but not installed."
    exit 1
fi

if ! command -v curl &> /dev/null; then
    echo "Error: curl is required but not installed."
    exit 1
fi

# Ensure test script exists
if [ ! -f "e2e-test.js" ]; then
    echo "Error: e2e-test.js not found in current directory."
    echo "Please make sure the test file is in the current directory."
    exit 1
fi

# Check if required packages are installed
if [ ! -d "node_modules/node-fetch" ] || [ ! -d "node_modules/uuid" ]; then
    echo "Installing required npm packages..."
    npm install node-fetch@2 uuid
fi

# Function to check if services are ready
check_services() {
    echo "Checking if services are ready..."
    
    for i in $(seq 1 $MAX_RETRIES); do
        echo "Attempt $i/$MAX_RETRIES: Checking health endpoint..."
        
        if curl -s "$HEALTH_ENDPOINT" | grep -q "\"status\":\"ok\""; then
            echo "✅ Services are ready!"
            return 0
        else
            echo "Services not ready yet. Waiting $RETRY_INTERVAL seconds..."
            sleep $RETRY_INTERVAL
        fi
    done
    
    echo "❌ Services failed to become ready within the timeout period."
    return 1
}

# Function to run the E2E tests
run_tests() {
    echo
    echo "Starting E2E tests..."
    echo
    
    # Export the API URL for the test script
    export API_URL
    
    # Run the test script
    node e2e-test.js
    
    # Capture exit code
    local result=$?
    
    if [ $result -eq 0 ]; then
        echo
        echo "🎉 E2E tests completed successfully!"
        echo
    else
        echo
        echo "❌ E2E tests failed with exit code: $result"
        echo
    fi
    
    return $result
}

# Main execution flow
main() {
    # 1. Wait for services to be ready
    check_services
    
    if [ $? -ne 0 ]; then
        echo "Aborting E2E tests due to service unavailability."
        exit 1
    fi
    
    # 2. Run the tests
    run_tests
    
    # Return the result of the tests
    exit $?
}

# Run the main function
main