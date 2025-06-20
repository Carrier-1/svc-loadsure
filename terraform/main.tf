terraform {
  required_version = ">= 1.0"
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }

  backend "s3" {
    # Use DigitalOcean Spaces for state
    endpoint                    = "https://nyc3.digitaloceanspaces.com"
    bucket                      = "carrier1-terraform-state"
    key                         = "svc-loadsure/terraform.tfstate"
    region                      = "us-east-1"
    skip_credentials_validation = true
    skip_metadata_api_check     = true
  }
}

provider "digitalocean" {
  token = var.do_token
}

# Create a VPC for network isolation
resource "digitalocean_vpc" "loadsure_vpc" {
  name        = "svc-loadsure-vpc-${var.environment}"
  region      = var.region
  description = "VPC for Loadsure ${var.environment} services"
  ip_range    = var.vpc_ip_range
}

# Create the app
resource "digitalocean_app" "svc_loadsure" {
  spec {
    name   = "svc-loadsure-${var.environment}"
    region = var.region

    # API Service
    service {
      name               = "api-service"
      environment_slug   = "node-js"
      instance_count     = var.api_instance_count
      instance_size_slug = var.api_instance_size
      http_port          = 3000

      github {
        repo           = "Carrier-1/svc-loadsure"
        branch         = var.github_branch
        deploy_on_push = var.auto_deploy
      }

      source_dir  = "/backend"
      run_command = "npm start"

      routes {
        path = "/"
      }

      health_check {
        http_path             = "/health"
        initial_delay_seconds = 15
        period_seconds        = 10
        timeout_seconds       = 5
        success_threshold     = 1
        failure_threshold     = 3
      }

      # Environment variables
      env {
        key   = "NODE_ENV"
        value = var.environment
      }

      env {
        key   = "PORT"
        value = "3000"
      }

      env {
        key   = "LOG_LEVEL"
        value = var.log_level
      }

      env {
        key   = "LOADSURE_BASE_URL"
        value = "https://portal.loadsure.net"
      }

      env {
        key   = "SUPPORT_DATA_REFRESH_SCHEDULE"
        value = var.refresh_schedule
      }

      env {
        key   = "API_RATE_LIMIT_MAX_REQUESTS"
        value = tostring(var.rate_limit_max_requests)
      }

      env {
        key   = "API_RATE_LIMIT_WINDOW_MS"
        value = tostring(var.rate_limit_window_ms)
      }

      # Secrets
      env {
        key   = "LOADSURE_API_KEY"
        value = var.loadsure_api_key
        type  = "SECRET"
        scope = "RUN_TIME"
      }

      env {
        key   = "DATABASE_URL"
        value = digitalocean_database_cluster.postgres.private_uri
        type  = "SECRET"
        scope = "RUN_TIME"
      }

      env {
        key   = "REDIS_URL"
        value = digitalocean_database_cluster.redis.private_uri
        type  = "SECRET"
        scope = "RUN_TIME"
      }

      env {
        key   = "RABBITMQ_URL"
        value = var.rabbitmq_url
        type  = "SECRET"
        scope = "RUN_TIME"
      }
    }

    # Worker Service
    worker {
      name               = "loadsure-worker"
      environment_slug   = "node-js"
      instance_count     = var.worker_instance_count
      instance_size_slug = var.worker_instance_size

      github {
        repo           = "Carrier-1/svc-loadsure"
        branch         = var.github_branch
        deploy_on_push = var.auto_deploy
      }

      source_dir  = "/backend"
      run_command = "node src/services/loadsureService.js"

      env {
        key   = "NODE_ENV"
        value = var.environment
      }

      env {
        key   = "WORKER_CONCURRENCY"
        value = tostring(var.worker_concurrency)
      }

      env {
        key   = "WORKER_ID"
        value = "${var.environment}-worker"
      }

      env {
        key   = "LOG_LEVEL"
        value = var.log_level
      }

      # Secrets
      env {
        key   = "LOADSURE_API_KEY"
        value = var.loadsure_api_key
        type  = "SECRET"
        scope = "RUN_TIME"
      }

      env {
        key   = "DATABASE_URL"
        value = digitalocean_database_cluster.postgres.private_uri
        type  = "SECRET"
        scope = "RUN_TIME"
      }

      env {
        key   = "REDIS_URL"
        value = digitalocean_database_cluster.redis.private_uri
        type  = "SECRET"
        scope = "RUN_TIME"
      }

      env {
        key   = "RABBITMQ_URL"
        value = var.rabbitmq_url
        type  = "SECRET"
        scope = "RUN_TIME"
      }
    }

    # Queue Monitor
    worker {
      name               = "queue-monitor"
      environment_slug   = "node-js"
      instance_count     = 1
      instance_size_slug = "basic-xxs"

      github {
        repo           = "Carrier-1/svc-loadsure"
        branch         = var.github_branch
        deploy_on_push = var.auto_deploy
      }

      source_dir  = "/backend"
      run_command = "node src/services/queueMonitorStarter.js"

      env {
        key   = "NODE_ENV"
        value = var.environment
      }

      env {
        key   = "MIN_WORKERS"
        value = tostring(var.min_workers)
      }

      env {
        key   = "MAX_WORKERS"
        value = tostring(var.max_workers)
      }

      env {
        key   = "SCALE_UP_THRESHOLD"
        value = tostring(var.scale_up_threshold)
      }

      env {
        key   = "SCALE_DOWN_THRESHOLD"
        value = tostring(var.scale_down_threshold)
      }

      env {
        key   = "CHECK_INTERVAL"
        value = tostring(var.check_interval)
      }

      # Secrets
      env {
        key   = "REDIS_URL"
        value = digitalocean_database_cluster.redis.private_uri
        type  = "SECRET"
        scope = "RUN_TIME"
      }

      env {
        key   = "RABBITMQ_URL"
        value = var.rabbitmq_url
        type  = "SECRET"
        scope = "RUN_TIME"
      }
    }

    # Custom domain
    dynamic "domain" {
      for_each = var.domain_name != "" ? [1] : []
      content {
        name = var.domain_name
        type = "PRIMARY"
      }
    }
  }
}

# PostgreSQL Database
resource "digitalocean_database_cluster" "postgres" {
  name                 = "svc-loadsure-postgres-${var.environment}"
  engine               = "pg"
  version              = "15"
  size                 = var.postgres_size
  region               = var.region
  node_count           = var.postgres_node_count
  private_network_uuid = digitalocean_vpc.loadsure_vpc.id

  tags = [var.environment, "svc-loadsure", "database"]
}

resource "digitalocean_database_db" "app_db" {
  cluster_id = digitalocean_database_cluster.postgres.id
  name       = "loadsure"
}

resource "digitalocean_database_user" "app_user" {
  cluster_id = digitalocean_database_cluster.postgres.id
  name       = "loadsure_app"
}

# Redis Database
resource "digitalocean_database_cluster" "redis" {
  name                 = "svc-loadsure-redis-${var.environment}"
  engine               = "redis"
  version              = "7"
  size                 = var.redis_size
  region               = var.region
  node_count           = 1
  private_network_uuid = digitalocean_vpc.loadsure_vpc.id

  tags = [var.environment, "svc-loadsure", "cache"]
}

# Container Registry (optional, for custom images)
resource "digitalocean_container_registry" "main" {
  count                  = var.use_custom_images ? 1 : 0
  name                   = "svc-loadsure"
  subscription_tier_slug = "basic"
  region                 = var.region
}

# Create a firewall for the database clusters
resource "digitalocean_database_firewall" "postgres_firewall" {
  cluster_id = digitalocean_database_cluster.postgres.id

  # Allow access only from resources in the same VPC
  rule {
    type  = "vpc"
    value = digitalocean_vpc.loadsure_vpc.id
  }
}

resource "digitalocean_database_firewall" "redis_firewall" {
  cluster_id = digitalocean_database_cluster.redis.id

  # Allow access only from resources in the same VPC
  rule {
    type  = "vpc"
    value = digitalocean_vpc.loadsure_vpc.id
  }
}

# Spaces bucket for assets (optional)
resource "digitalocean_spaces_bucket" "assets" {
  count  = var.create_spaces_bucket ? 1 : 0
  name   = "svc-loadsure-assets-${var.environment}"
  region = var.region
  acl    = "public-read"
}

# CORS configuration for the bucket (separate resource)
resource "digitalocean_spaces_bucket_cors_configuration" "assets_cors" {
  count  = var.create_spaces_bucket ? 1 : 0
  bucket = digitalocean_spaces_bucket.assets[0].name
  region = digitalocean_spaces_bucket.assets[0].region

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]
    max_age_seconds = 3000
  }
}