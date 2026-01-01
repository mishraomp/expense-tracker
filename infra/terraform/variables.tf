variable "app_env" {
  type        = string
  description = "Environment name: dev|test|prod"

  validation {
    condition     = contains(["dev", "test", "prod"], var.app_env)
    error_message = "app_env must be one of dev|test|prod"
  }
}

variable "resource_group_name" {
  type        = string
  description = "Azure resource group used for all resources in this environment (created by bootstrap)"
}

variable "location" {
  type        = string
  description = "Azure region"
}

variable "tags" {
  type        = map(string)
  description = "Common Azure tags"
  default     = {}
}

variable "ip_allow_list_cidrs" {
  type        = list(string)
  description = "IPv4 CIDR allow-list for Container Apps ingress"
}


variable "log_analytics_workspace_name" {
  type        = string
  description = "Log Analytics workspace name"
}

variable "postgres_server_name" {
  type        = string
  description = "PostgreSQL Flexible Server name (must be globally unique)"
}

variable "postgres_app_db_name" {
  type        = string
  description = "Application database name"
  default     = "expense_tracker"
}

variable "postgres_keycloak_db_name" {
  type        = string
  description = "Keycloak database name"
  default     = "keycloak"
}

variable "postgres_admin_username" {
  type        = string
  description = "Postgres admin username (sensitive value should not be committed to tfvars; pass via pipeline TF_VAR_*)"
  sensitive   = true
}

variable "postgres_admin_password" {
  type        = string
  description = "Postgres admin password (pass via pipeline TF_VAR_*)"
  sensitive   = true
}

variable "vnet_name" {
  type        = string
  description = "VNet name"
}

variable "vnet_address_space" {
  type        = list(string)
  description = "VNet address space"
}

variable "aca_subnet_name" {
  type        = string
  description = "Subnet name for Container Apps Environment"
}

variable "aca_subnet_cidr" {
  type        = string
  description = "Subnet CIDR for Container Apps Environment"
}

variable "postgres_subnet_name" {
  type        = string
  description = "Subnet name for PostgreSQL Flexible Server"
}

variable "postgres_subnet_cidr" {
  type        = string
  description = "Subnet CIDR for PostgreSQL Flexible Server"
}

variable "container_app_environment_name" {
  type        = string
  description = "Container Apps Environment name"
}

variable "container_app_name" {
  type        = string
  description = "Container App name"
}

variable "backend_image" {
  type        = string
  description = "Backend container image (e.g., ghcr.io/<owner>/<repo>-backend:sha-...)"
}

variable "keycloak_image" {
  type        = string
  description = "Keycloak container image"
  default     = "quay.io/keycloak/keycloak:26.0"
}

variable "flyway_image" {
  type        = string
  description = "Flyway container image"
}

variable "keycloak_admin_username" {
  type        = string
  description = "Keycloak admin username"
  default     = "admin"
}

