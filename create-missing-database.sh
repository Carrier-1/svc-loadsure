#!/bin/bash
# create-missing-database.sh - Creates both loadsure and loadsure_dev databases

# Run this script from your project directory
# Usage: ./create-missing-database.sh

set -e

echo "Creating both 'loadsure' and 'loadsure_dev' databases..."

# Create the loadsure database
echo "Attempting to create 'loadsure' database..."
docker-compose exec -T postgres psql -U loadsure -d postgres -c "CREATE DATABASE loadsure;"
if [ $? -eq 0 ]; then
  echo "Database 'loadsure' created successfully!"
else
  echo "Note: Database 'loadsure' creation failed, it might already exist or there might be permission issues."
fi

# Create the loadsure_dev database
echo "Attempting to create 'loadsure_dev' database..."
docker-compose exec -T postgres psql -U loadsure -d postgres -c "CREATE DATABASE loadsure_dev;"
if [ $? -eq 0 ]; then
  echo "Database 'loadsure_dev' created successfully!"
else
  echo "Note: Database 'loadsure_dev' creation failed, it might already exist or there might be permission issues."
fi

# Restart services
echo "Restarting services to apply changes..."
docker-compose restart api-service loadsure-service

echo "Done! Both databases should now be available."
echo "Check logs to verify that the services are connecting successfully:"
echo "docker-compose logs api-service"