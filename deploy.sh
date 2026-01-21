#!/bin/bash
set -e

# 1. Determine the Version Tag
# Use the short Git commit hash if available, otherwise use the current timestamp.
if [[ $(git rev-parse --is-inside-work-tree 2>/dev/null) == "true" ]]; then
  VERSION=$(git rev-parse --short HEAD)
else
  VERSION=$(date +%Y%m%d-%H%M%S)
fi

echo "✅ Version Tag determined: $VERSION"

# Set the tags for the images
export BACKEND_TAG=$VERSION
export FRONTEND_TAG=$VERSION

# 2. Build Images
echo "🏗️  Building Backend Image (arielpeit/inventory-backend:$BACKEND_TAG)..."
docker build -t arielpeit/inventory-backend:$BACKEND_TAG -t arielpeit/inventory-backend:latest ./backend

echo "🏗️  Building Frontend Image (arielpeit/inventory-frontend:$FRONTEND_TAG)..."
docker build -t arielpeit/inventory-frontend:$FRONTEND_TAG -t arielpeit/inventory-frontend:latest ./frontend

# 3. Push Images
echo "🚀 Pushing Backend to Docker Hub..."
docker push arielpeit/inventory-backend:$BACKEND_TAG
docker push arielpeit/inventory-backend:latest

echo "🚀 Pushing Frontend to Docker Hub..."
docker push arielpeit/inventory-frontend:$FRONTEND_TAG
docker push arielpeit/inventory-frontend:latest

# 4. Restart Services
echo "🔄 Restarting Docker Compose services..."
docker compose down
docker compose up -d

echo "✅ Deployment Complete! Services are running with version $VERSION."
