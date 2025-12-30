output "fqdn" {
  value = azurerm_postgresql_flexible_server.this.fqdn
}

output "server_id" {
  value = azurerm_postgresql_flexible_server.this.id
}

output "private_dns_zone_id" {
  value = azurerm_private_dns_zone.postgres.id
}
