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

variable "container_app_environment_name" {
  type = string
}

variable "container_app_name" {
  type = string
}

variable "aca_subnet_id" {
  type = string
}

variable "log_analytics_workspace_id" {
  type = string
}

variable "log_analytics_workspace_resource" {
  type = string
}

variable "key_vault_id" {
  type = string
}

variable "key_vault_uri" {
  type = string
}

variable "ip_allow_list_cidrs" {
  type = list(string)
}

variable "backend_image" {
  type = string
}

variable "keycloak_image" {
  type = string
}

variable "flyway_image" {
  type = string
}

variable "keycloak_admin_username" {
  type    = string
  default = "admin"
}

variable "key_vault_secret_ids" {
  type        = map(string)
  description = "Map of secret name => Key Vault secret ID (versioned or versionless)"
  default     = {}
}

variable "postgres_host" {
  type = string
}

variable "postgres_app_db_name" {
  type = string
}

variable "postgres_keycloak_db_name" {
  type = string
}

variable "postgres_admin_username" {
  type      = string
  sensitive = true
}
