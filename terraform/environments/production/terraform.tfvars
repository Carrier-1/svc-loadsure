environment      = "production"
github_branch    = "main"
auto_deploy      = false # Manual deployments for production
domain_name      = "carrier1-svc-loadsure-api.ondigitalocean.app"

# Instance sizing
api_instance_count     = 2
api_instance_size      = "basic-s"
worker_instance_count  = 2
worker_instance_size   = "basic-s"
worker_concurrency     = 3

# Rate limiting
rate_limit_max_requests = 100
rate_limit_window_ms    = 60000

# Queue monitoring
min_workers          = 2
max_workers          = 5
scale_up_threshold   = 10
scale_down_threshold = 2
check_interval       = 10000

# Database sizing
postgres_size       = "db-s-1vcpu-1gb"
postgres_node_count = 1
redis_size          = "db-s-1vcpu-1gb"

# App config
log_level        = "info"
refresh_schedule = "0 0 * * *" # Daily at midnight

# Optional features
use_custom_images    = false
create_spaces_bucket = true