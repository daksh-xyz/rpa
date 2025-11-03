#!/bin/bash

# Quick Deployment Script - Automates the entire AWS deployment process
# This script creates EC2, sets it up, and deploys your RPA backend

set -e

echo "=========================================="
echo "RPA Backend - Quick Deploy to AWS"
echo "=========================================="
echo ""
echo "This script will:"
echo "  1. Create EC2 instance in Mumbai"
echo "  2. Copy project files"
echo "  3. Setup Docker environment"
echo "  4. Deploy the application"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 1
fi

# Step 1: Create EC2 Instance
echo ""
echo "Step 1/4: Creating EC2 Instance..."
./create-ec2.sh

# Read the instance info
if [ ! -f "instance-info.txt" ]; then
    echo "❌ Error: instance-info.txt not found"
    exit 1
fi

PUBLIC_IP=$(grep "Public IP:" instance-info.txt | cut -d' ' -f3)
KEY_FILE="rpa-backend-key.pem"

echo ""
echo "✅ EC2 Instance created with IP: $PUBLIC_IP"

# Step 2: Wait for instance to be ready
echo ""
echo "Step 2/4: Waiting for instance to be ready (30 seconds)..."
sleep 30

# Step 3: Copy files to EC2
echo ""
echo "Step 3/4: Copying project files to EC2..."

# Add EC2 to known hosts to avoid prompt
ssh-keyscan -H $PUBLIC_IP >> ~/.ssh/known_hosts 2>/dev/null || true

# Copy files
echo "Copying backend..."
scp -i $KEY_FILE -r ../backend ubuntu@$PUBLIC_IP:~/ || {
    echo "❌ Failed to copy backend. Retrying in 10 seconds..."
    sleep 10
    scp -i $KEY_FILE -r ../backend ubuntu@$PUBLIC_IP:~/
}

echo "Copying deploy scripts..."
scp -i $KEY_FILE -r ../deploy ubuntu@$PUBLIC_IP:~/ || {
    echo "❌ Failed to copy deploy scripts. Retrying in 10 seconds..."
    sleep 10
    scp -i $KEY_FILE -r ../deploy ubuntu@$PUBLIC_IP:~/
}

echo "✅ Files copied successfully"

# Step 4: Setup and deploy
echo ""
echo "Step 4/4: Setting up and deploying application..."

ssh -i $KEY_FILE ubuntu@$PUBLIC_IP << 'ENDSSH'
    set -e
    echo "🔧 Running setup script..."
    cd ~/deploy
    chmod +x setup-ec2.sh deploy.sh
    ./setup-ec2.sh

    echo "🚀 Deploying application..."
    # Use newgrp to apply docker group without logout
    sg docker -c './deploy.sh'
ENDSSH

echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "Your RPA Backend is now running at:"
echo "  Backend API:      http://$PUBLIC_IP:5000"
echo "  API Health:       http://$PUBLIC_IP:5000/api/health"
echo "  Live Browser:     http://$PUBLIC_IP:7900"
echo "  Selenium Grid:    http://$PUBLIC_IP:4444"
echo ""
echo "Next Steps:"
echo "  1. Update your frontend .env file:"
echo "     VITE_BACKEND_URL=http://$PUBLIC_IP:5000"
echo ""
echo "  2. Run your frontend:"
echo "     npm run dev"
echo ""
echo "  3. Test the connection:"
echo "     curl http://$PUBLIC_IP:5000/api/health"
echo ""
echo "For more details, see deploy/DEPLOYMENT_GUIDE.md"
echo "=========================================="
