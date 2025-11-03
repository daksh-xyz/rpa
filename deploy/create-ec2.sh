#!/bin/bash

# AWS CLI script to create EC2 instance for RPA Backend
# Region: Mumbai (ap-south-1)

set -e

REGION="ap-south-1"
INSTANCE_TYPE="t3.medium"
AMI_ID="ami-0f58b397bc5c1f2e8"  # Ubuntu 22.04 LTS in Mumbai
KEY_NAME="rpa-backend-key"
SECURITY_GROUP_NAME="rpa-backend-sg"

echo "=========================================="
echo "Creating EC2 Instance in Mumbai Region"
echo "=========================================="

# Create Security Group
echo "🔒 Creating Security Group..."
SG_ID=$(aws ec2 create-security-group \
    --group-name $SECURITY_GROUP_NAME \
    --description "Security group for RPA Backend" \
    --region $REGION \
    --output text --query 'GroupId' 2>/dev/null || \
    aws ec2 describe-security-groups \
        --group-names $SECURITY_GROUP_NAME \
        --region $REGION \
        --output text --query 'SecurityGroups[0].GroupId')

echo "Security Group ID: $SG_ID"

# Add Security Group Rules
echo "📝 Configuring Security Group rules..."

# SSH from anywhere (you should restrict this to your IP for production)
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 22 \
    --cidr 0.0.0.0/0 \
    --region $REGION 2>/dev/null || echo "SSH rule already exists"

# Backend API port
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 5000 \
    --cidr 0.0.0.0/0 \
    --region $REGION 2>/dev/null || echo "Port 5000 rule already exists"

# VNC Stream port
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 7900 \
    --cidr 0.0.0.0/0 \
    --region $REGION 2>/dev/null || echo "Port 7900 rule already exists"

# Selenium Grid port (optional)
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 4444 \
    --cidr 0.0.0.0/0 \
    --region $REGION 2>/dev/null || echo "Port 4444 rule already exists"

# Create Key Pair if it doesn't exist
echo "🔑 Creating/checking SSH key pair..."
if [ ! -f "$KEY_NAME.pem" ]; then
    aws ec2 create-key-pair \
        --key-name $KEY_NAME \
        --region $REGION \
        --query 'KeyMaterial' \
        --output text > $KEY_NAME.pem
    chmod 400 $KEY_NAME.pem
    echo "✅ Key pair created: $KEY_NAME.pem"
else
    echo "✅ Key pair already exists: $KEY_NAME.pem"
fi

# Launch EC2 Instance
echo "🚀 Launching EC2 instance..."
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id $AMI_ID \
    --instance-type $INSTANCE_TYPE \
    --key-name $KEY_NAME \
    --security-group-ids $SG_ID \
    --region $REGION \
    --block-device-mappings 'DeviceName=/dev/sda1,Ebs={VolumeSize=20,VolumeType=gp3}' \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=RPA-Backend}]' \
    --output text --query 'Instances[0].InstanceId')

echo "Instance ID: $INSTANCE_ID"

# Wait for instance to be running
echo "⏳ Waiting for instance to start..."
aws ec2 wait instance-running \
    --instance-ids $INSTANCE_ID \
    --region $REGION

# Get Public IP
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --region $REGION \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

echo ""
echo "=========================================="
echo "✅ EC2 Instance Created Successfully!"
echo "=========================================="
echo ""
echo "Instance Details:"
echo "  Instance ID:  $INSTANCE_ID"
echo "  Public IP:    $PUBLIC_IP"
echo "  Region:       $REGION"
echo "  Instance Type: $INSTANCE_TYPE"
echo ""
echo "SSH Connection:"
echo "  ssh -i $KEY_NAME.pem ubuntu@$PUBLIC_IP"
echo ""
echo "Next Steps:"
echo "  1. Wait 1-2 minutes for instance to fully initialize"
echo "  2. SSH into the instance"
echo "  3. Run the setup script"
echo "=========================================="

# Save instance info to file
cat > instance-info.txt <<EOF
Instance ID: $INSTANCE_ID
Public IP: $PUBLIC_IP
Region: $REGION
SSH Command: ssh -i $KEY_NAME.pem ubuntu@$PUBLIC_IP
API URL: http://$PUBLIC_IP:5000
VNC URL: http://$PUBLIC_IP:7900
EOF

echo ""
echo "Instance info saved to: instance-info.txt"
