#!/bin/bash
set -e

# Script to validate environment variables and configurations

ENVIRONMENT=${1:-staging}

echo "🔍 Validating environment configuration for: $ENVIRONMENT"

# Check if environment file exists
if [[ ! -f "terraform/environments/$ENVIRONMENT/terraform.tfvars" ]]; then
    echo "❌ Environment file not found: terraform/environments/$ENVIRONMENT/terraform.tfvars"
    exit 1
fi

# Check App Platform spec
if [[ ! -f ".do/app.$ENVIRONMENT.yaml" ]]; then
    echo "❌ App Platform spec not found: .do/app.$ENVIRONMENT.yaml"
    exit 1
fi

echo "✅ Configuration files found"

# Validate YAML files
echo "🔍 Validating YAML syntax..."
python3 -c "
import yaml
import sys

files = ['.do/app.$ENVIRONMENT.yaml']
for file in files:
    try:
        with open(file, 'r') as f:
            yaml.safe_load(f)
        print(f'✅ {file} is valid YAML')
    except Exception as e:
        print(f'❌ {file} is invalid: {e}')
        sys.exit(1)
"

# Check required environment variables
echo "🔍 Checking required environment variables..."

# Load .env file if it exists
ENV_FILE=".env.${ENVIRONMENT}"
if [[ -f "$ENV_FILE" ]]; then
    echo "📋 Loading from $ENV_FILE"
    source "$ENV_FILE"
fi

REQUIRED_VARS=(
    "DIGITALOCEAN_ACCESS_TOKEN"
    "LOADSURE_API_KEY"
    "RABBITMQ_URL"
)

OPTIONAL_VARS=(
    "SPACES_ACCESS_KEY"
    "SPACES_SECRET_KEY"
)

missing_vars=()

for var in "${REQUIRED_VARS[@]}"; do
    if [[ -z "${!var}" ]]; then
        missing_vars+=("$var")
    fi
done

if [[ ${#missing_vars[@]} -gt 0 ]]; then
    echo "❌ Missing required environment variables:"
    printf '%s\n' "${missing_vars[@]}"
    echo ""
    echo "Please set these variables in:"
    echo "  - GitHub repository secrets (for CI/CD)"
    echo "  - $ENV_FILE file (for local deployment)"
    echo "  - Your shell environment"
    exit 1
fi

echo "✅ All required environment variables are set"

# Validate optional variables
echo "🔍 Checking optional environment variables..."
for var in "${OPTIONAL_VARS[@]}"; do
    if [[ -z "${!var}" ]]; then
        echo "⚠️  Optional variable $var is not set"
    else
        echo "✅ Optional variable $var is set"
    fi
done

# Check tools
echo "🔍 Checking required tools..."
REQUIRED_TOOLS=(
    "terraform"
    "doctl"
    "curl"
    "git"
    "node"
    "npm"
)

for tool in "${REQUIRED_TOOLS[@]}"; do
    if command -v "$tool" >/dev/null 2>&1; then
        echo "✅ $tool is installed"
    else
        echo "❌ $tool is not installed"
        exit 1
    fi
done

echo ""
echo "🎉 All validations passed! Ready to deploy to $ENVIRONMENT"