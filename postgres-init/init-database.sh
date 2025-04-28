#!/bin/bash
# init-database.sh - Script to initialize database for Loadsure application
# This script is intended to be run in a Docker container with PostgreSQL.
# It creates a database named 'loadsure_dev' and sets up permissions.
# Usage: This script is automatically executed by the Docker container when it starts.
# Ensure the script is run with superuser privileges
# to have the necessary permissions to create databases and set privileges.
# This script is intended to be run in a Docker container with PostgreSQL.
# It creates a database named 'loadsure_dev' and sets up permissions.
# Usage: This script is automatically executed by the Docker container when it starts.
# Ensure the script is run with superuser privileges
# to have the necessary permissions to create databases and set privileges.
# This script is intended to be run in a Docker container with PostgreSQL.      
set -e

# Function to output info messages
info() {
  echo "[INFO] $@"
}

# Create the loadsure_dev database
info "Creating loadsure_dev database if it doesn't exist..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
  SELECT 'CREATE DATABASE loadsure_dev'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'loadsure_dev');
EOSQL

info "Setting up permissions..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "loadsure_dev" <<-EOSQL
  GRANT ALL PRIVILEGES ON DATABASE loadsure_dev TO $POSTGRES_USER;
EOSQL

info "Database initialization completed successfully!"