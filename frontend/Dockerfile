# Global ARGs
ARG NODE_VERSION=20-alpine

# Stage 1: Dependencies
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install

# Stage 2: Tester
FROM node:${NODE_VERSION} AS tester
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Run linting
RUN npm run lint

# Stage 3: Builder
FROM node:${NODE_VERSION} AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 4: Runner
FROM nginx:stable-alpine AS runner

LABEL maintainer="arielpeit"
LABEL version="1.0"
LABEL description="Inventory Frontend App"

# Copy the build output
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Install curl for healthcheck
RUN apk add --no-cache curl

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
