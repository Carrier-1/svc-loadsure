#!/usr/bin/env node

/**
 * sync-app-config.js
 * 
 * This script synchronizes DigitalOcean App Platform configuration files (.do/app.*.yaml)
 * with Terraform configurations to prevent drift between the two.
 * 
 * Usage:
 *   node sync-app-config.js [--env=staging|production] [--check-only]
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { execSync } = require('child_process');

// Parse arguments
const args = process.argv.slice(2);
const checkOnly = args.includes('--check-only');
const envArg = args.find(arg => arg.startsWith('--env='));
const environment = envArg ? envArg.split('=')[1] : 'both';

if (!['staging', 'production', 'both'].includes(environment)) {
  console.error('Invalid environment. Use --env=staging or --env=production');
  process.exit(1);
}

const environments = environment === 'both' ? ['staging', 'production'] : [environment];

// Paths
const rootDir = path.resolve(__dirname, '..');
const doDir = path.join(rootDir, '.do');
const terraformDir = path.join(rootDir, 'terraform');

// Sync configuration for the specified environment
async function syncAppConfig(env) {
  console.log(`\n🔄 Syncing configuration for ${env} environment...`);
  
  // Read Terraform variables
  const tfVarsPath = path.join(terraformDir, 'environments', env, 'terraform.tfvars');
  if (!fs.existsSync(tfVarsPath)) {
    console.error(`❌ Terraform vars file not found at ${tfVarsPath}`);
    return false;
  }
  
  const tfVars = parseTerraformVars(fs.readFileSync(tfVarsPath, 'utf8'));
  
  // Read existing DO app config
  const doConfigPath = path.join(doDir, `app.${env}.yaml`);
  if (!fs.existsSync(doConfigPath)) {
    console.error(`❌ DO config file not found at ${doConfigPath}`);
    return false;
  }
  
  const doConfig = yaml.load(fs.readFileSync(doConfigPath, 'utf8'));
  
  // Update configuration based on Terraform vars
  let updated = false;
  
  // Update app name
  if (doConfig.name !== `svc-loadsure-${env}`) {
    console.log(`- Updating app name: ${doConfig.name} -> svc-loadsure-${env}`);
    doConfig.name = `svc-loadsure-${env}`;
    updated = true;
  }
  
  // Update region
  if (doConfig.region !== (tfVars.region || 'nyc3')) {
    console.log(`- Updating region: ${doConfig.region} -> ${tfVars.region || 'nyc3'}`);
    doConfig.region = tfVars.region || 'nyc3';
    updated = true;
  }
  
  // Update services
  for (const service of doConfig.services || []) {
    if (service.name === 'api-service') {
      // Update instance count
      if (service.instance_count !== tfVars.api_instance_count) {
        console.log(`- Updating api instance count: ${service.instance_count} -> ${tfVars.api_instance_count}`);
        service.instance_count = tfVars.api_instance_count;
        updated = true;
      }
      
      // Update instance size
      if (service.instance_size_slug !== tfVars.api_instance_size) {
        console.log(`- Updating api instance size: ${service.instance_size_slug} -> ${tfVars.api_instance_size}`);
        service.instance_size_slug = tfVars.api_instance_size;
        updated = true;
      }
      
      // Update GitHub branch
      if (service.github && service.github.branch !== tfVars.github_branch) {
        console.log(`- Updating GitHub branch: ${service.github.branch} -> ${tfVars.github_branch}`);
        service.github.branch = tfVars.github_branch;
        updated = true;
      }
      
      // Update GitHub deploy on push
      if (service.github && service.github.deploy_on_push !== tfVars.auto_deploy) {
        console.log(`- Updating GitHub deploy on push: ${service.github.deploy_on_push} -> ${tfVars.auto_deploy}`);
        service.github.deploy_on_push = tfVars.auto_deploy;
        updated = true;
      }
      
      // Update environment variables
      for (const env of service.envs || []) {
        if (env.key === 'LOG_LEVEL' && env.value !== tfVars.log_level) {
          console.log(`- Updating log level: ${env.value} -> ${tfVars.log_level}`);
          env.value = tfVars.log_level;
          updated = true;
        }
        
        if (env.key === 'API_RATE_LIMIT_MAX_REQUESTS' && env.value !== String(tfVars.rate_limit_max_requests)) {
          console.log(`- Updating rate limit requests: ${env.value} -> ${tfVars.rate_limit_max_requests}`);
          env.value = String(tfVars.rate_limit_max_requests);
          updated = true;
        }
        
        if (env.key === 'API_RATE_LIMIT_WINDOW_MS' && env.value !== String(tfVars.rate_limit_window_ms)) {
          console.log(`- Updating rate limit window: ${env.value} -> ${tfVars.rate_limit_window_ms}`);
          env.value = String(tfVars.rate_limit_window_ms);
          updated = true;
        }
        
        if (env.key === 'SUPPORT_DATA_REFRESH_SCHEDULE' && env.value !== tfVars.refresh_schedule) {
          console.log(`- Updating refresh schedule: ${env.value} -> ${tfVars.refresh_schedule}`);
          env.value = tfVars.refresh_schedule;
          updated = true;
        }
      }
    } else if (service.name === 'loadsure-worker') {
      // Update worker configuration
      if (service.instance_count !== tfVars.worker_instance_count) {
        console.log(`- Updating worker instance count: ${service.instance_count} -> ${tfVars.worker_instance_count}`);
        service.instance_count = tfVars.worker_instance_count;
        updated = true;
      }
      
      if (service.instance_size_slug !== tfVars.worker_instance_size) {
        console.log(`- Updating worker instance size: ${service.instance_size_slug} -> ${tfVars.worker_instance_size}`);
        service.instance_size_slug = tfVars.worker_instance_size;
        updated = true;
      }
      
      // Update GitHub branch
      if (service.github && service.github.branch !== tfVars.github_branch) {
        console.log(`- Updating GitHub branch: ${service.github.branch} -> ${tfVars.github_branch}`);
        service.github.branch = tfVars.github_branch;
        updated = true;
      }
      
      // Update GitHub deploy on push
      if (service.github && service.github.deploy_on_push !== tfVars.auto_deploy) {
        console.log(`- Updating GitHub deploy on push: ${service.github.deploy_on_push} -> ${tfVars.auto_deploy}`);
        service.github.deploy_on_push = tfVars.auto_deploy;
        updated = true;
      }
      
      // Update environment variables
      for (const env of service.envs || []) {
        if (env.key === 'WORKER_CONCURRENCY' && env.value !== String(tfVars.worker_concurrency)) {
          console.log(`- Updating worker concurrency: ${env.value} -> ${tfVars.worker_concurrency}`);
          env.value = String(tfVars.worker_concurrency);
          updated = true;
        }
        
        if (env.key === 'LOG_LEVEL' && env.value !== tfVars.log_level) {
          console.log(`- Updating log level: ${env.value} -> ${tfVars.log_level}`);
          env.value = tfVars.log_level;
          updated = true;
        }
      }
    } else if (service.name === 'queue-monitor') {
      // Update GitHub branch
      if (service.github && service.github.branch !== tfVars.github_branch) {
        console.log(`- Updating GitHub branch: ${service.github.branch} -> ${tfVars.github_branch}`);
        service.github.branch = tfVars.github_branch;
        updated = true;
      }
      
      // Update GitHub deploy on push
      if (service.github && service.github.deploy_on_push !== tfVars.auto_deploy) {
        console.log(`- Updating GitHub deploy on push: ${service.github.deploy_on_push} -> ${tfVars.auto_deploy}`);
        service.github.deploy_on_push = tfVars.auto_deploy;
        updated = true;
      }
      
      // Update environment variables
      for (const env of service.envs || []) {
        if (env.key === 'MIN_WORKERS' && env.value !== String(tfVars.min_workers)) {
          console.log(`- Updating min workers: ${env.value} -> ${tfVars.min_workers}`);
          env.value = String(tfVars.min_workers);
          updated = true;
        }
        
        if (env.key === 'MAX_WORKERS' && env.value !== String(tfVars.max_workers)) {
          console.log(`- Updating max workers: ${env.value} -> ${tfVars.max_workers}`);
          env.value = String(tfVars.max_workers);
          updated = true;
        }
        
        if (env.key === 'SCALE_UP_THRESHOLD' && env.value !== String(tfVars.scale_up_threshold)) {
          console.log(`- Updating scale up threshold: ${env.value} -> ${tfVars.scale_up_threshold}`);
          env.value = String(tfVars.scale_up_threshold);
          updated = true;
        }
        
        if (env.key === 'SCALE_DOWN_THRESHOLD' && env.value !== String(tfVars.scale_down_threshold)) {
          console.log(`- Updating scale down threshold: ${env.value} -> ${tfVars.scale_down_threshold}`);
          env.value = String(tfVars.scale_down_threshold);
          updated = true;
        }
        
        if (env.key === 'CHECK_INTERVAL' && env.value !== String(tfVars.check_interval)) {
          console.log(`- Updating check interval: ${env.value} -> ${tfVars.check_interval}`);
          env.value = String(tfVars.check_interval);
          updated = true;
        }
      }
    }
  }
  
  // Update database configuration
  // Note: Database config in .do files is more about referencing than sizing
  // so we don't need to sync these values as they're managed by Terraform
  
  // Update domains
  if (tfVars.domain_name && doConfig.domains && doConfig.domains.length > 0) {
    const domain = doConfig.domains[0];
    if (domain.domain !== tfVars.domain_name) {
      console.log(`- Updating domain: ${domain.domain} -> ${tfVars.domain_name}`);
      domain.domain = tfVars.domain_name;
      updated = true;
    }
  }
  
  if (updated) {
    if (checkOnly) {
      console.log(`\n⚠️ Configuration drift detected in ${env} environment`);
      return false;
    } else {
      // Write updated config
      fs.writeFileSync(doConfigPath, yaml.dump(doConfig, { lineWidth: 120 }));
      console.log(`\n✅ Updated ${doConfigPath}`);
      return true;
    }
  } else {
    console.log(`\n✅ No changes needed for ${env} environment`);
    return true;
  }
}

// Helper function to parse Terraform vars from .tfvars file
function parseTerraformVars(content) {
  const vars = {};
  const lines = content.split('\n');
  
  for (const line of lines) {
    // Skip comments and empty lines
    if (line.trim().startsWith('#') || line.trim() === '') {
      continue;
    }
    
    // Parse key-value pairs
    const match = line.match(/^\s*([a-zA-Z0-9_]+)\s*=\s*(.+)$/);
    if (match) {
      const [, key, rawValue] = match;
      let value = rawValue.trim();
      
      // Parse values based on type
      if (value === 'true') {
        value = true;
      } else if (value === 'false') {
        value = false;
      } else if (/^[0-9]+$/.test(value)) {
        // Parse integers
        value = parseInt(value, 10);
      } else if (/^[0-9]+\.[0-9]+$/.test(value)) {
        // Parse floats
        value = parseFloat(value);
      } else if (value.startsWith('"') && value.endsWith('"')) {
        // Parse strings
        value = value.slice(1, -1);
      }
      
      vars[key] = value;
    }
  }
  
  return vars;
}

// Main execution
async function main() {
  console.log('🔄 Digital Ocean App Platform Config Sync Tool');
  
  let success = true;
  for (const env of environments) {
    const result = await syncAppConfig(env);
    success = success && result;
  }
  
  if (checkOnly && !success) {
    console.error('\n❌ Configuration drift detected. Run without --check-only to update.');
    process.exit(1);
  } else if (!success) {
    console.error('\n❌ Failed to sync some configurations. Check errors above.');
    process.exit(1);
  } else {
    console.log('\n✅ All configurations are in sync!');
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});