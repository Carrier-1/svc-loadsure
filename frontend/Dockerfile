# Optimize dependencies installation and build caching
FROM node:23-alpine as build-stage

WORKDIR /app

# Copy package files first and install dependencies
# This layer will be cached unless package files change
COPY package*.json ./
RUN npm ci

# Copy only necessary source files for building
COPY .eslintrc* ./ 
COPY babel.config.js ./
COPY vue.config.js ./
COPY src/ ./src/
COPY public/ ./public/

# Build the app
RUN npm run build

# Production stage with Nginx
FROM nginx:stable-alpine AS production-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]