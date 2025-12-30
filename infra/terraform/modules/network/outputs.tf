output "vnet_id" {
  value = azurerm_virtual_network.this.id
}

output "aca_subnet_id" {
  value = azurerm_subnet.aca.id
}

output "postgres_subnet_id" {
  value = azurerm_subnet.postgres.id
}
