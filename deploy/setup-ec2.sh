#!/bin/bash

# EC2 Setup Script for RPA Automation Backend
# This script installs Docker and sets up the environment on Ubuntu 22.04

set -e

echo "=========================================="
echo "RPA Backend - EC2 Setup Script"
echo "=========================================="

# Update system
echo "📦 Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up the repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add current user to docker group
sudo usermod -aG docker $USER

# Start Docker
sudo systemctl enable docker
sudo systemctl start docker

echo "✅ Docker installed successfully!"

# Install additional utilities
echo "📦 Installing additional utilities..."
sudo apt-get install -y git htop

# Configure firewall (UFW)
echo "🔥 Configuring firewall..."
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 5000/tcp  # Backend API
sudo ufw allow 7900/tcp  # VNC Stream
sudo ufw allow 4444/tcp  # Selenium Grid (optional)
echo "y" | sudo ufw enable

echo "✅ EC2 setup completed successfully!"
echo ""
echo "=========================================="
echo "Next Steps:"
echo "1. Log out and log back in for Docker group changes to take effect"
echo "2. Run the deploy script to start the services"
echo "=========================================="
