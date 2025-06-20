variable "do_token" {
  description = "DigitalOcean API token"
  type        = string
  sensitive   = true
}

variable "environment" {
  description = "Environment (staging/production)"
  type        = string
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be either 'staging' or 'production'."
  }
}

variable "region" {
  description = "DigitalOcean region"
  type        = string
  default     = "nyc3"
}

variable "vpc_ip_range" {
  description = "IP range for the VPC network (CIDR notation)"
  type        = string
  default     = "10.10.0.0/16"
}

variable "github_branch" {
  description = "GitHub branch to deploy"
  type        = string
}

variable "auto_deploy" {
  description = "Enable automatic deployments on push"
  type        = bool
  default     = true
}

variable "domain_name" {
  description = "Custom domain name"
  type        = string
  default     = ""
}

# App configuration
variable "api_instance_count" {
  description = "Number of API service instances"
  type        = number
  default     = 1
}

variable "api_instance_size" {
  description = "Size of API service instances"
  type        = string
  default     = "basic-xxs"
}

variable "worker_instance_count" {
  description = "Number of worker instances"
  type        = number
  default     = 1
}

variable "worker_instance_size" {
  description = "Size of worker instances"
  type        = string
  default     = "basic-xxs"
}

variable "worker_concurrency" {
  description = "Worker concurrency level"
  type        = number
  default     = 2
}

# Rate limiting
variable "rate_limit_max_requests" {
  description = "Maximum requests per window"
  type        = number
  default     = 100
}

variable "rate_limit_window_ms" {
  description = "Rate limit window in milliseconds"
  type        = number
  default     = 60000
}

# Queue monitoring
variable "min_workers" {
  description = "Minimum number of workers"
  type        = number
  default     = 1
}

variable "max_workers" {
  description = "Maximum number of workers"
  type        = number
  default     = 3
}

variable "scale_up_threshold" {
  description = "Queue depth to trigger scale up"
  type        = number
  default     = 5
}

variable "scale_down_threshold" {
  description = "Queue depth to trigger scale down"
  type        = number
  default     = 1
}

variable "check_interval" {
  description = "Queue monitoring check interval (ms)"
  type        = number
  default     = 30000
}

# Database configuration
variable "postgres_size" {
  description = "PostgreSQL instance size"
  type        = string
  default     = "db-s-dev-database"
}

variable "postgres_node_count" {
  description = "Number of PostgreSQL nodes"
  type        = number
  default     = 1
}

variable "redis_size" {
  description = "Redis instance size"
  type        = string
  default     = "db-s-dev-database"
}

# Application secrets
variable "loadsure_api_key" {
  description = "Loadsure API key"
  type        = string
  sensitive   = true
}

variable "rabbitmq_url" {
  description = "RabbitMQ connection URL"
  type        = string
  sensitive   = true
}

# App configuration
variable "log_level" {
  description = "Application log level"
  type        = string
  default     = "info"
}

variable "refresh_schedule" {
  description = "Support data refresh cron schedule"
  type        = string
  default     = "0 0 * * *"
}

# Optional features
variable "use_custom_images" {
  description = "Use custom Docker images"
  type        = bool
  default     = false
}

variable "create_spaces_bucket" {
  description = "Create Spaces bucket for assets"
  type        = bool
  default     = false
}