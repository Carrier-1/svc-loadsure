# Frontend Dockerfile
# Build stage
FROM node:18-alpine as build-stage

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Use npm ci instead of npm install
RUN npm ci

# Copy source files
COPY . .

# Build the app
RUN npm run build

# Production stage with Nginx
FROM nginx:stable-alpine as production-stage

# Copy built files from build stage
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copy custom Nginx config if needed
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]