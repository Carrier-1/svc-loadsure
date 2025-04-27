# Backend Dockerfile
FROM node:18-alpine

WORKDIR /usr/src/app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++ git

# Copy package files first (for better layer caching)
COPY package*.json ./

# Use npm ci instead of npm install
RUN npm ci

# Create data directory
RUN mkdir -p /usr/src/app/data && chmod 777 /usr/src/app/data

# Copy source code
COPY . .

# Expose API port
EXPOSE 3000

# Start command is specified in docker-compose.yml