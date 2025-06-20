environment      = "staging"
github_branch    = "main"
auto_deploy      = true
domain_name      = "dev-carrier1-svc-loadsure-api.ondigitalocean.app"

# Instance sizing
api_instance_count     = 1
api_instance_size      = "basic-xxs"
worker_instance_count  = 1
worker_instance_size   = "basic-xxs"
worker_concurrency     = 2

# Rate limiting
rate_limit_max_requests = 200
rate_limit_window_ms    = 60000

# Queue monitoring
min_workers          = 1
max_workers          = 3
scale_up_threshold   = 5
scale_down_threshold = 1
check_interval       = 30000

# Database sizing
postgres_size       = "db-s-dev-database"
postgres_node_count = 1
redis_size          = "db-s-dev-database"

# App config
log_level        = "debug"
refresh_schedule = "0 */6 * * *" # Every 6 hours

# Optional features
use_custom_images    = false
create_spaces_bucket = false