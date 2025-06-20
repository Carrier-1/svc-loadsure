output "app_id" {
  description = "The ID of the deployed DigitalOcean App"
  value       = digitalocean_app.svc_loadsure.id
}

output "app_live_url" {
  description = "The live URL of the deployed DigitalOcean App"
  value       = digitalocean_app.svc_loadsure.live_url
}

output "database_host" {
  description = "The host of the PostgreSQL database"
  value       = digitalocean_database_cluster.postgres.host
  sensitive   = true
}

output "database_port" {
  description = "The port of the PostgreSQL database"
  value       = digitalocean_database_cluster.postgres.port
}

output "database_name" {
  description = "The name of the PostgreSQL database"
  value       = digitalocean_database_db.app_db.name
}

output "database_user" {
  description = "The PostgreSQL database user"
  value       = digitalocean_database_user.app_user.name
  sensitive   = true
}

output "redis_host" {
  description = "The host of the Redis instance"
  value       = digitalocean_database_cluster.redis.host
  sensitive   = true
}

output "redis_port" {
  description = "The port of the Redis instance"
  value       = digitalocean_database_cluster.redis.port
}

output "spaces_bucket_name" {
  description = "The name of the Spaces bucket for assets"
  value       = var.create_spaces_bucket ? digitalocean_spaces_bucket.assets[0].name : ""
}

output "environment" {
  description = "The deployment environment"
  value       = var.environment
}