# RPA Backend - AWS Deployment Guide

## Prerequisites
- AWS CLI configured with credentials
- SSH client installed
- Node.js and npm installed (for frontend)

## Deployment Steps

### Step 1: Create EC2 Instance

Run the EC2 creation script from the `deploy` directory:

```bash
cd deploy
chmod +x create-ec2.sh
./create-ec2.sh
```

This will:
- Create a Security Group with required ports (22, 5000, 7900, 4444)
- Generate an SSH key pair (`rpa-backend-key.pem`)
- Launch a t3.medium Ubuntu 22.04 instance in Mumbai (ap-south-1)
- Save instance details to `instance-info.txt`

**Note the Public IP address** - you'll need it for the next steps.

### Step 2: SSH into EC2 Instance

Wait 1-2 minutes for the instance to initialize, then SSH:

```bash
ssh -i rpa-backend-key.pem ubuntu@<YOUR_PUBLIC_IP>
```

### Step 3: Copy Project Files to EC2

From your local machine (in a new terminal), copy the project:

```bash
# From the rpa directory
cd /home/valevior/novocuris/rpa

# Copy backend and deploy folders
scp -i deploy/rpa-backend-key.pem -r backend ubuntu@<YOUR_PUBLIC_IP>:~/
scp -i deploy/rpa-backend-key.pem -r deploy ubuntu@<YOUR_PUBLIC_IP>:~/
```

### Step 4: Setup EC2 Environment

Back in your SSH session:

```bash
cd ~/deploy
chmod +x setup-ec2.sh deploy.sh
./setup-ec2.sh
```

After setup completes, **log out and log back in** for Docker group changes to take effect:

```bash
exit
ssh -i rpa-backend-key.pem ubuntu@<YOUR_PUBLIC_IP>
```

### Step 5: Deploy the Application

```bash
cd ~/deploy
./deploy.sh
```

This will:
- Build Docker images
- Start Selenium Chrome and Backend containers
- Display service URLs

### Step 6: Verify Deployment

Test the backend API:

```bash
curl http://<YOUR_PUBLIC_IP>:5000/api/health
```

You should see a JSON response with `"status": "healthy"`

### Step 7: Configure Frontend

On your local machine, create a `.env` file in the rpa directory:

```bash
# In /home/valevior/novocuris/rpa/
cp .env.example .env
```

Edit `.env` and set your EC2 public IP:

```
VITE_BACKEND_URL=http://<YOUR_PUBLIC_IP>:5000
```

### Step 8: Run Frontend Locally

```bash
npm run dev
```

Your frontend will now connect to the AWS backend!

## Service URLs

After deployment, you can access:

- **Backend API**: `http://<PUBLIC_IP>:5000`
- **API Health Check**: `http://<PUBLIC_IP>:5000/api/health`
- **Live Browser (VNC)**: `http://<PUBLIC_IP>:7900`
- **Selenium Grid**: `http://<PUBLIC_IP>:4444`

## Useful Commands

### On EC2 Instance

```bash
# View logs
cd ~/deploy
docker compose -f docker-compose.prod.yml logs -f

# View backend logs only
docker compose -f docker-compose.prod.yml logs -f backend

# View chrome logs only
docker compose -f docker-compose.prod.yml logs -f chrome

# Restart services
docker compose -f docker-compose.prod.yml restart

# Stop services
docker compose -f docker-compose.prod.yml down

# Rebuild and restart
docker compose -f docker-compose.prod.yml up --build -d

# Check container status
docker ps
```

### From Local Machine

```bash
# Update code on EC2
cd /home/valevior/novocuris/rpa
scp -i deploy/rpa-backend-key.pem -r backend ubuntu@<YOUR_PUBLIC_IP>:~/

# Then SSH and restart
ssh -i deploy/rpa-backend-key.pem ubuntu@<YOUR_PUBLIC_IP>
cd ~/deploy
./deploy.sh
```

## Troubleshooting

### Backend not starting
```bash
# Check logs
docker compose -f docker-compose.prod.yml logs backend

# Common issues:
# - Port already in use: docker compose down, then up again
# - Build failed: Check Dockerfile and requirements.txt
```

### Selenium not connecting
```bash
# Check if chrome container is running
docker ps | grep chrome

# Check logs
docker compose -f docker-compose.prod.yml logs chrome

# Restart chrome
docker compose -f docker-compose.prod.yml restart chrome
```

### Cannot access from local frontend
```bash
# Check Security Group rules
aws ec2 describe-security-groups \
  --group-names rpa-backend-sg \
  --region ap-south-1

# Verify port 5000 is open to 0.0.0.0/0
# Test with curl from local machine
curl http://<PUBLIC_IP>:5000/api/health
```

## Security Considerations

⚠️ **Important**: This setup opens ports to the public internet (0.0.0.0/0)

For production use, you should:

1. **Restrict SSH access** to your IP only:
```bash
aws ec2 authorize-security-group-ingress \
  --group-id <SG_ID> \
  --protocol tcp --port 22 \
  --cidr <YOUR_IP>/32 \
  --region ap-south-1
```

2. **Add HTTPS/SSL** using nginx and Let's Encrypt
3. **Add authentication** to your API endpoints
4. **Use AWS Secrets Manager** for sensitive configuration
5. **Enable CloudWatch** for monitoring and logs

## Cost Optimization

To reduce costs:

- **Stop instance when not in use**: `aws ec2 stop-instances --instance-ids <INSTANCE_ID> --region ap-south-1`
- **Start when needed**: `aws ec2 start-instances --instance-ids <INSTANCE_ID> --region ap-south-1`
- **Use smaller instance**: Switch to t3.small if performance allows
- **Set up auto-stop**: Use Lambda to stop instance after business hours

## Cleanup

To delete all AWS resources:

```bash
# Terminate instance
aws ec2 terminate-instances --instance-ids <INSTANCE_ID> --region ap-south-1

# Wait for termination
aws ec2 wait instance-terminated --instance-ids <INSTANCE_ID> --region ap-south-1

# Delete security group
aws ec2 delete-security-group --group-name rpa-backend-sg --region ap-south-1

# Delete key pair
aws ec2 delete-key-pair --key-name rpa-backend-key --region ap-south-1
rm rpa-backend-key.pem
```
