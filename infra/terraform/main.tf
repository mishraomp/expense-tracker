locals {
  databases = [
    var.postgres_app_db_name,
    var.postgres_keycloak_db_name,
  ]
}

module "observability" {
  source              = "./modules/observability"
  resource_group_name = var.resource_group_name
  location            = var.location
  tags                = var.tags

  name = var.log_analytics_workspace_name
}

module "network" {
  source              = "./modules/network"
  resource_group_name = var.resource_group_name
  location            = var.location
  tags                = var.tags

  vnet_name          = var.vnet_name
  vnet_address_space = var.vnet_address_space

  aca_subnet_name = var.aca_subnet_name
  aca_subnet_cidr = var.aca_subnet_cidr

  postgres_subnet_name = var.postgres_subnet_name
  postgres_subnet_cidr = var.postgres_subnet_cidr
}

module "key_vault" {
  source              = "./modules/key-vault"
  resource_group_name = var.resource_group_name
  location            = var.location
  tags                = var.tags

  key_vault_name                   = var.key_vault_name
  tenant_id                        = data.azurerm_client_config.current.tenant_id
  log_analytics_workspace_id       = module.observability.log_analytics_workspace_id
  log_analytics_workspace_resource = module.observability.log_analytics_workspace_resource_id
}

module "postgres" {
  source              = "./modules/postgres"
  resource_group_name = var.resource_group_name
  location            = var.location
  tags                = var.tags

  server_name      = var.postgres_server_name
  admin_username   = var.postgres_admin_username
  admin_password   = var.postgres_admin_password
  delegated_subnet = module.network.postgres_subnet_id
  vnet_id          = module.network.vnet_id

  databases                        = local.databases
  log_analytics_workspace_resource = module.observability.log_analytics_workspace_resource_id
}

module "container_apps" {
  source              = "./modules/container-apps"
  resource_group_name = var.resource_group_name
  location            = var.location
  tags                = var.tags

  container_app_environment_name = var.container_app_environment_name
  container_app_name             = var.container_app_name

  aca_subnet_id                    = module.network.aca_subnet_id
  log_analytics_workspace_id       = module.observability.log_analytics_workspace_id
  log_analytics_workspace_resource = module.observability.log_analytics_workspace_resource_id

  key_vault_id  = module.key_vault.key_vault_id
  key_vault_uri = module.key_vault.key_vault_uri

  ip_allow_list_cidrs = var.ip_allow_list_cidrs

  backend_image  = var.backend_image
  keycloak_image = var.keycloak_image
  flyway_image   = var.flyway_image

  keycloak_admin_username = var.keycloak_admin_username
  key_vault_secret_ids    = var.key_vault_secret_ids

  postgres_host             = module.postgres.fqdn
  postgres_app_db_name      = var.postgres_app_db_name
  postgres_keycloak_db_name = var.postgres_keycloak_db_name
  postgres_admin_username   = var.postgres_admin_username
}
