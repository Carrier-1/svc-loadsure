#!/bin/bash
# db-init.sh - Database initialization script
# Purpose: Creates the database and runs migrations

set -e

# Load environment variables if needed
if [ -f .env ]; then
  export $(cat .env | grep -v '#' | xargs)
fi

DB_NAME=${DB_NAME:-loadsure_db}
DB_USER=${DB_USERNAME:-loadsure}
DB_PASSWORD=${DB_PASSWORD:-loadsurepass}
DB_HOST=${DB_HOST:-postgres}

echo "======== Database Initialization ========"
echo "Configuring database: $DB_NAME"
echo "User: $DB_USER"
echo "Host: $DB_HOST"

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
until PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -c '\q' 2>/dev/null; do
  echo "PostgreSQL is unavailable - sleeping for 1 second"
  sleep 1
done

echo "PostgreSQL is ready!"

# Check if database exists
echo "Checking if database exists..."
if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
  echo "Database $DB_NAME already exists."
else
  echo "Database $DB_NAME does not exist. Creating it now..."
  PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -c "CREATE DATABASE $DB_NAME;"
  echo "Database created successfully!"
fi

# Run migrations
echo "Running migrations..."
cd backend
npx sequelize-cli db:migrate

# Run seeders if needed
if [ "$RUN_SEEDERS" = "true" ]; then
  echo "Running seeders..."
  npx sequelize-cli db:seed:all
fi

echo "========================================="
echo "Database setup completed successfully!"