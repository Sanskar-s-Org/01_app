#!/bin/bash
set -e

# Ensure local bin directory is in PATH
export PATH=$HOME/bin:$PATH

echo "Starting Integration Test..."

# Check required tools
echo "Checking AWS CLI version..."
aws --version

echo "Checking jq version..."
jq --version

# Fetch EC2 instance details
echo "Fetching EC2 instance with tag 'dev-deploy'..."
URL=$(aws ec2 describe-instances \
    --filters "Name=tag:Name,Values=dev-deploy" "Name=instance-state-name,Values=running" \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

echo "Detected EC2 Public IP: $URL"

if [[ -z "$URL" || "$URL" == "None" ]]; then
    echo "ERROR: Could not find running EC2 instance with tag 'dev-deploy'"
    exit 1
fi

echo "Testing application health endpoint..."
http_code=$(curl -s -o /dev/null -w "%{http_code}" http://$URL:3000/health)

echo "Health endpoint returned HTTP status: $http_code"

if [[ "$http_code" == "200" ]]; then
    echo "✓ Integration Test PASSED - Application is healthy"
    exit 0
else
    echo "✗ Integration Test FAILED - Expected HTTP 200, got $http_code"
    exit 1
fi
