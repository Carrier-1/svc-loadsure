FROM node:18-alpine

WORKDIR /usr/src/app

# Install only production dependencies first (better caching)
COPY package*.json ./
RUN npm ci --only=production

# Create data directory
RUN mkdir -p /usr/src/app/data && chmod 777 /usr/src/app/data

# Copy only necessary source files
COPY src/ ./src/
COPY database/ ./database/
COPY scripts/ ./scripts/
COPY .env.example ./.env.example

# Expose API port
EXPOSE 3000

# Use production node environment
ENV NODE_ENV=production

# Command is specified in docker-compose.yml