# Infrastructure and CI/CD Pipeline Documentation

This document outlines the infrastructure setup, CI/CD pipelines, and deployment processes for the Loadsure service.

## Infrastructure Overview

The Loadsure service is deployed on DigitalOcean's App Platform with infrastructure managed as code using Terraform. This approach provides several benefits:

- **Infrastructure as Code (IaC)**: All infrastructure is defined in version-controlled Terraform files
- **Repeatable deployments**: Environments can be reliably recreated or scaled
- **Drift prevention**: Automated checks prevent configuration drift between environments
- **Self-documenting**: Infrastructure requirements are explicitly defined in code
- **Security by design**: Network isolation ensures only necessary ports are exposed

### Network Architecture

The service uses a private VPC (Virtual Private Cloud) for network isolation. This approach ensures:

- Only the API port (3000) is exposed publicly
- All internal services (Redis, PostgreSQL) are isolated within the private network
- Database resources are protected by firewall rules
- All internal communication happens via secure private networking

This network isolation model mirrors the local development setup, creating consistency between environments and enhancing security by minimizing the attack surface.

### Architecture Components

The service consists of several key components:

1. **API Service**: Main Node.js backend service handling API requests
2. **Worker Service**: Background processing service for Loadsure data
3. **Queue Monitor**: Service that monitors queue depth and manages worker scaling
4. **PostgreSQL Database**: Primary data storage
5. **Redis Cache**: Used for session storage, caching, and queue management

## Development Workflow

### Trunk-Based Development

We follow a trunk-based development approach, where:

- The `main` branch serves as the trunk (single source of truth)
- All development happens in short-lived feature branches
- Changes are frequently integrated into the trunk via pull requests
- Deployments are controlled by approval gates, not branch names

This approach provides several advantages:

- **Faster integration**: Changes are integrated more frequently
- **Reduced merge conflicts**: Smaller, more frequent merges
- **Higher quality trunk**: The main branch is always in a deployable state
- **Easier rollbacks**: Smaller, focused changes are easier to revert if needed
- **Better collaboration**: Team members are working off the same recent codebase

### Development Process

1. Create a feature branch from `main`
2. Develop and test your changes locally
3. Push your branch and create a pull request to `main`
4. CI pipeline automatically runs tests and validations
5. Get code review and approval from team members
6. Merge your changes into `main`
7. Deployment to staging happens automatically from `main`
8. Deployment to production requires explicit approval

## Configuration Management

The infrastructure is configured in two complementary ways:

1. **Terraform**: The primary source of truth for infrastructure definition
2. **App Platform Configuration**: DigitalOcean's App Platform YAML files (in `.do/` directory)

To maintain consistency between these two systems, we've implemented:

- **Sync script**: `scripts/sync-app-config.js` synchronizes Terraform configs with App Platform YAML files
- **Drift detection**: CI pipeline checks for inconsistencies between configurations
- **Environment-specific variables**: Separate configuration files for staging and production

## CI/CD Pipeline

### Continuous Integration

The CI pipeline (`.github/workflows/ci.yml`) handles:

- **Unit testing**: Runs tests against a local development environment
- **Linting & code quality**: Ensures code meets standards
- **Security scanning**: Detects vulnerabilities and secrets
- **Infrastructure validation**: Validates Terraform files and App Platform configurations
- **Drift detection**: Ensures configurations are in sync
- **Integration testing**: For pull requests to ensure changes work correctly
- **Merge readiness**: Final check before changes can be merged to trunk

### Deployment Pipeline with Gates

The deployment pipeline (`.github/workflows/deploy.yml`) follows a gated approach:

1. **Trigger**: Deployments are triggered by pushes to `main` or manual dispatch
2. **Environment Determination**: Identifies target environment (staging/production)
3. **Deployment Validation Gate**: First approval gate to proceed with deployment
4. **Infrastructure Deployment**: Applies Terraform configurations
5. **Deployment Monitoring**: Waits for deployment to complete successfully
6. **Database Migrations**: Runs migrations once app is deployed
7. **Smoke Tests**: Verifies basic functionality of the deployed application
8. **Production Final Approval Gate**: Additional approval gate for production
9. **Production Finalization**: Final steps for production deployment
10. **Notifications**: Reports deployment status

This gated approach ensures:
- Deployments are intentional and reviewed
- Production deployments require explicit approval
- Each stage completes successfully before proceeding

## Environment Configuration

### Staging Environment

The staging environment is configured for:

- Automatic deployments on push to `main`
- Development-tier resources for cost efficiency
- More verbose logging and debugging
- More frequent data refresh cycles

### Production Environment

The production environment is configured for:

- Manual deployment approval for safety
- Production-tier resources for reliability and performance
- Multiple instances for fault tolerance
- Optimized for performance rather than debugging

## Secrets Management

Secrets are managed in GitHub Actions secrets and passed securely to:

1. Terraform for infrastructure provisioning
2. DigitalOcean App Platform as environment variables
3. CI/CD pipelines for testing and deployment

## Monitoring and Logging

- **Application logs**: Available through DigitalOcean App Platform
- **Infrastructure metrics**: Monitored through DigitalOcean monitoring
- **Deployment status**: Tracked in GitHub Actions workflows

## Recommendations for Maintenance

### Regular Maintenance Tasks

1. **Update dependencies**: Regularly update Node.js packages and dependencies
2. **Review security scans**: Address vulnerabilities identified in CI pipeline
3. **Validate Terraform plans**: Review infrastructure changes before applying
4. **Check for drift**: Periodically verify configurations are in sync

### Best Practices for Trunk-Based Development

1. **Small, focused changes**: Keep pull requests small and focused on a single concern
2. **Frequent integration**: Integrate changes to the trunk frequently (at least daily)
3. **Feature flags**: Use feature flags for larger features that aren't ready for users
4. **Comprehensive tests**: Ensure good test coverage to maintain trunk quality
5. **Code reviews**: All changes should be reviewed before merging to trunk
6. **Fix the trunk immediately**: If an issue is found in the trunk, fix it immediately

### Potential Improvements

1. **Database High Availability**: Upgrade to multi-node PostgreSQL for production
2. **CDN Integration**: Add CDN for static assets if needed
3. **Blue/Green Deployments**: Implement for zero-downtime updates
4. **Advanced Monitoring**: Add APM tools for deeper performance insights
5. **Automated Rollbacks**: Enhance the deployment pipeline with automated rollback capability
6. **Feature Flag Service**: Implement a robust feature flag service for safer deployments

## Troubleshooting

### Common Issues

1. **Configuration drift**: Run `node scripts/sync-app-config.js` to synchronize
2. **Failed deployments**: Check logs in GitHub Actions for specific errors
3. **Database connection issues**: Verify connection strings and credentials
4. **Worker scaling problems**: Check queue monitor logs and thresholds
5. **Approval gates timing out**: GitHub Actions approval gates expire after 7 days

### Support Resources

- DigitalOcean documentation: https://docs.digitalocean.com/products/app-platform/
- Terraform documentation: https://www.terraform.io/docs
- GitHub Actions documentation: https://docs.github.com/en/actions