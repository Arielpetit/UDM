#!/bin/bash
set -e

# 1. Build Images
echo "🏗️  Building Backend Image..."
docker build -t arielpeit/inventory-backend ./backend

echo "🏗️  Building Frontend Image..."
docker build -t arielpeit/inventory-frontend ./frontend

# 2. Push Images
echo "🚀 Pushing Backend to Docker Hub..."
docker push arielpeit/inventory-backend

echo "🚀 Pushing Frontend to Docker Hub..."
docker push arielpeit/inventory-frontend

# 3. Restart Services
echo "🔄 Restarting Docker Compose..."
docker compose down
docker compose up -d

echo "✅ Deployment Complete! Services are running."
