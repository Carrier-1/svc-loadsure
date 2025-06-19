#!/bin/bash
set -e

# Deployment script for local testing or manual deployment
ENVIRONMENT=${1:-staging}
GITHUB_SHA=${GITHUB_SHA:-$(git rev-parse HEAD)}

echo "🚀 Deploying svc-loadsure to $ENVIRONMENT environment..."
echo "📝 Commit: $GITHUB_SHA"
echo "📍 Repository: Carrier-1/svc-loadsure"

# Validate environment
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    echo "❌ Invalid environment. Use 'staging' or 'production'"
    exit 1
fi

# Check required tools
command -v terraform >/dev/null 2>&1 || { echo "❌ Terraform not installed"; exit 1; }
command -v doctl >/dev/null 2>&1 || { echo "❌ doctl not installed"; exit 1; }

# Load environment file if exists
if [[ -f ".env.${ENVIRONMENT}" ]]; then
    echo "📋 Loading environment variables from .env.${ENVIRONMENT}"
    source ".env.${ENVIRONMENT}"
fi

# Validate required environment variables
REQUIRED_VARS=(
    "DIGITALOCEAN_ACCESS_TOKEN"
    "LOADSURE_API_KEY" 
    "RABBITMQ_URL"
    "SPACES_ACCESS_KEY"
    "SPACES_SECRET_KEY"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [[ -z "${!var}" ]]; then
        echo "❌ Required environment variable $var is not set"
        exit 1
    fi
done

echo "✅ Environment variables validated"

# Deploy infrastructure
echo "🏗️  Deploying infrastructure..."
cd terraform

export AWS_ACCESS_KEY_ID="$SPACES_ACCESS_KEY"
export AWS_SECRET_ACCESS_KEY="$SPACES_SECRET_KEY"

terraform init \
    -backend-config="access_key=$SPACES_ACCESS_KEY" \
    -backend-config="secret_key=$SPACES_SECRET_KEY"

terraform plan \
    -var-file="environments/$ENVIRONMENT/terraform.tfvars" \
    -var="do_token=$DIGITALOCEAN_ACCESS_TOKEN" \
    -var="loadsure_api_key=$LOADSURE_API_KEY" \
    -var="rabbitmq_url=$RABBITMQ_URL" \
    -out=tfplan

terraform apply -auto-approve tfplan

# Get outputs
APP_ID=$(terraform output -raw app_id)
APP_URL=$(terraform output -raw app_live_url)

echo "✅ Infrastructure deployed"
echo "📱 App ID: $APP_ID"
echo "🌐 App URL: $APP_URL"
echo "🏷️  Expected domains:"
if [[ "$ENVIRONMENT" == "staging" ]]; then
    echo "   - dev-carrier1-svc-loadsure-api.ondigitalocean.app"
else
    echo "   - carrier1-svc-loadsure-api.ondigitalocean.app"
fi

# Wait for deployment
echo "⏳ Waiting for app to deploy..."
cd ..

for i in {1..20}; do
    STATUS=$(doctl apps get $APP_ID --format Status --no-header)
    echo "📊 App status: $STATUS (attempt $i/20)"
    
    if [[ "$STATUS" == "RUNNING" ]]; then
        echo "✅ App is running!"
        break
    elif [[ "$STATUS" == "ERROR" ]]; then
        echo "❌ App deployment failed!"
        doctl apps get $APP_ID
        exit 1
    fi
    
    sleep 15
done

# Run migrations
echo "🗄️  Running database migrations..."
doctl apps exec $APP_ID \
    --component api-service \
    --command "npm run migrate" || echo "⚠️  Migration failed or not needed"

# Smoke tests
echo "🧪 Running smoke tests..."
curl -f "$APP_URL/health" || { echo "❌ Health check failed"; exit 1; }
curl -f "$APP_URL/api-docs.json" >/dev/null || { echo "❌ API docs check failed"; exit 1; }
curl -f "$APP_URL/api/support-data/status" >/dev/null || { echo "❌ Support data check failed"; exit 1; }

echo "✅ Smoke tests passed!"
echo ""
echo "🎉 Deployment completed successfully!"
echo "🌐 Application URL: $APP_URL"
echo "📖 API Documentation: $APP_URL/api-docs"
echo "📊 Health Check: $APP_URL/health"
echo "🏷️  DigitalOcean App Platform Dashboard:"
echo "   https://cloud.digitalocean.com/apps/$APP_ID"