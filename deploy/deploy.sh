#!/bin/bash

# Deployment script for RPA Backend on EC2
# This script deploys the Docker containers and starts the services

set -e

echo "=========================================="
echo "RPA Backend - Deployment Script"
echo "=========================================="

# Get the public IP of this EC2 instance
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
echo "📍 Public IP: $PUBLIC_IP"

# Set the VNC URL for the backend
export PUBLIC_URL="http://$PUBLIC_IP:7900"

# Navigate to deployment directory
cd "$(dirname "$0")"

echo "🛑 Stopping existing containers..."
docker compose -f docker-compose.prod.yml down || true

echo "🏗️  Building and starting containers..."
docker compose -f docker-compose.prod.yml up --build -d

echo "⏳ Waiting for services to start..."
sleep 10

# Check service health
echo "🔍 Checking service health..."
if curl -s http://localhost:5000/api/health > /dev/null; then
    echo "✅ Backend is healthy!"
else
    echo "⚠️  Backend health check failed. Check logs with: docker compose -f docker-compose.prod.yml logs"
fi

echo ""
echo "=========================================="
echo "✅ Deployment Completed!"
echo "=========================================="
echo ""
echo "Service URLs:"
echo "  Backend API:      http://$PUBLIC_IP:5000"
echo "  API Health:       http://$PUBLIC_IP:5000/api/health"
echo "  Live Browser:     http://$PUBLIC_IP:7900"
echo "  Selenium Grid:    http://$PUBLIC_IP:4444"
echo ""
echo "Useful Commands:"
echo "  View logs:        docker compose -f docker-compose.prod.yml logs -f"
echo "  Stop services:    docker compose -f docker-compose.prod.yml down"
echo "  Restart:          docker compose -f docker-compose.prod.yml restart"
echo "=========================================="
