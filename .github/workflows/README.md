# GitHub Actions Workflows

This directory contains GitHub Actions workflows for CI/CD processes in the Loadsure service.

## Workflows

- **ci.yml**: Runs tests, linting, and validation for every pull request and push to main
- **k8s-deploy.yml**: Deploys the application to a Kubernetes cluster

## Kubernetes Deployment Workflow

The `k8s-deploy.yml` workflow automates the process of deploying the application to a Kubernetes cluster. It handles building and pushing Docker images, updating Kubernetes manifests, and applying them in the correct order.

### Prerequisites

To use the Kubernetes deployment workflow, you need to set up the following:

1. A Kubernetes cluster (e.g., DigitalOcean Kubernetes)
2. A container registry (e.g., DigitalOcean Container Registry)
3. The following GitHub secrets:

   - `DIGITALOCEAN_ACCESS_TOKEN`: A DigitalOcean API token with read/write access
   - `CLUSTER_NAME`: The name of your Kubernetes cluster
   - `DB_USERNAME`: Database username
   - `DB_PASSWORD`: Database password
   - `RABBITMQ_USER`: RabbitMQ username
   - `RABBITMQ_PASSWORD`: RabbitMQ password
   - `LOADSURE_API_KEY`: API key for the Loadsure service

### Secrets Management

The workflow manages Kubernetes secrets securely:

1. Secrets are created dynamically during the deployment process using GitHub Secrets
2. File permissions are restricted to prevent unauthorized access
3. Secrets are never committed to the repository
4. Each environment (staging/production) has its own set of secrets

For production environments with stricter security requirements, consider integrating with a dedicated secrets management solution such as:
- HashiCorp Vault
- AWS Secrets Manager
- Azure Key Vault
- Google Secret Manager

### How It Works

The workflow follows these steps:

1. **Test**: Runs the CI workflow to ensure all tests pass
2. **Determine Environment**: Sets up environment variables based on the deployment target
3. **Validate Deployment**: Approval gate for the deployment
4. **Build and Push Images**: Builds Docker images and pushes them to the container registry
5. **Update Kubernetes Manifests**: Updates the image tags in the Kubernetes manifests
6. **Deploy to Kubernetes**: Applies the Kubernetes manifests in the correct order
7. **Verify Deployment**: Checks that the deployment was successful
8. **Production Final Approval**: Additional approval gate for production deployments
9. **Finalize Deployment**: Reports on the deployment status

### Usage

The workflow can be triggered in two ways:

1. **Automatically**: When changes are pushed to the `main` branch, the workflow will deploy to the staging environment.

2. **Manually**: You can trigger the workflow manually from the GitHub Actions tab, selecting either the staging or production environment.

### Environment Configuration

The workflow supports two environments:

- **Staging**: Used for testing changes before they go to production
- **Production**: The live environment

Each environment has its own approval gates:

- For staging: `staging-approval`
- For production: `production-approval` and `production-final-approval`

### Troubleshooting

Common issues and their solutions:

- **Image build failures**: Check that the Dockerfile paths are correct and that the build context contains all necessary files.

- **Deployment failures**: Check the logs for error messages. You may need to manually check the status of the Kubernetes resources:
  ```
  kubectl -n svc-loadsure get pods
  kubectl -n svc-loadsure describe pod <pod-name>
  kubectl -n svc-loadsure logs <pod-name>
  ```

- **Health check failures**: Ensure that the health endpoints are properly configured and that the services are running correctly.

## CI Workflow

The `ci.yml` workflow runs tests, linting, and validation for every pull request and push to the main branch. It ensures that the code meets quality standards before being deployed.