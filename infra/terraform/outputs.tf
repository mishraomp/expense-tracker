output "log_analytics_workspace_id" {
  value = module.observability.log_analytics_workspace_id
}

output "key_vault_id" {
  value = module.key_vault.key_vault_id
}

output "key_vault_uri" {
  value = module.key_vault.key_vault_uri
}

output "container_app_fqdn" {
  value = module.container_apps.container_app_fqdn
}
