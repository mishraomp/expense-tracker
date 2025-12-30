resource "azurerm_private_dns_zone" "postgres" {
  name                = "privatelink.postgres.database.azure.com"
  resource_group_name = var.resource_group_name
  tags                = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "postgres" {
  name                  = "${var.server_name}-dnslink"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.postgres.name
  virtual_network_id    = var.vnet_id
  tags                  = var.tags
}

resource "azurerm_postgresql_flexible_server" "this" {
  name                = var.server_name
  location            = var.location
  resource_group_name = var.resource_group_name

  version    = var.postgres_version
  sku_name   = var.sku_name
  storage_mb = var.storage_mb

  administrator_login    = var.admin_username
  administrator_password = var.admin_password

  delegated_subnet_id = var.delegated_subnet
  private_dns_zone_id = azurerm_private_dns_zone.postgres.id

  public_network_access_enabled = false
  backup_retention_days         = var.backup_retention_days

  depends_on = [azurerm_private_dns_zone_virtual_network_link.postgres]

  tags = var.tags
}

resource "azurerm_postgresql_flexible_server_database" "db" {
  for_each = toset(var.databases)

  name      = each.value
  server_id = azurerm_postgresql_flexible_server.this.id

  charset   = "UTF8"
  collation = "en_US.utf8"
}

resource "azurerm_monitor_diagnostic_setting" "this" {
  name                       = "${var.server_name}-diag"
  target_resource_id         = azurerm_postgresql_flexible_server.this.id
  log_analytics_workspace_id = var.log_analytics_workspace_resource

  enabled_log {
    category = "PostgreSQLLogs"
  }

  enabled_metric {
    category = "AllMetrics"
  }
}
