variable "resource_group_name" {
  type = string
}

variable "location" {
  type = string
}

variable "tags" {
  type    = map(string)
  default = {}
}

variable "server_name" {
  type = string
}

variable "admin_username" {
  type      = string
  sensitive = true
}

variable "admin_password" {
  type      = string
  sensitive = true
}

variable "postgres_version" {
  type    = string
  default = "16"
}

variable "sku_name" {
  type    = string
  default = "B_Standard_B1ms"
}

variable "storage_mb" {
  type    = number
  default = 32768
}

variable "backup_retention_days" {
  type    = number
  default = 7
}

variable "delegated_subnet" {
  type        = string
  description = "Delegated subnet ID for Postgres Flexible Server"
}

variable "vnet_id" {
  type        = string
  description = "VNet ID used for private DNS zone link"
}

variable "databases" {
  type        = list(string)
  description = "Databases to create"
}

variable "log_analytics_workspace_resource" {
  type        = string
  description = "Log Analytics workspace resource ID"
}
