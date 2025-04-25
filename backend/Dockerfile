# Backend Dockerfile
# File: backend/Dockerfile
FROM node:18-alpine

WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install

# Create data directory
RUN mkdir -p /usr/src/app/data && chmod 777 /usr/src/app/data

# Copy source code
COPY . .

# Expose API port
EXPOSE 3000

# Start command is specified in docker-compose.yml