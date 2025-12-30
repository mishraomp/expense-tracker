locals {
  ip_rules = {
    for idx, cidr in var.ip_allow_list_cidrs : idx => cidr
  }

  has_database_url_secret     = contains(keys(var.key_vault_secret_ids), "database_url")
  has_keycloak_db_url_secret  = contains(keys(var.key_vault_secret_ids), "keycloak_db_url")
  has_keycloak_admin_password = contains(keys(var.key_vault_secret_ids), "keycloak_admin_password")
  has_postgres_admin_password = contains(keys(var.key_vault_secret_ids), "postgres_admin_password")
}

resource "azurerm_user_assigned_identity" "runtime" {
  name                = "${var.container_app_name}-runtime"
  location            = var.location
  resource_group_name = var.resource_group_name
  tags                = var.tags
}

resource "azurerm_role_assignment" "kv_secrets_user" {
  scope                = var.key_vault_id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.runtime.principal_id
}

resource "azurerm_container_app_environment" "this" {
  name                       = var.container_app_environment_name
  location                   = var.location
  resource_group_name        = var.resource_group_name
  log_analytics_workspace_id = var.log_analytics_workspace_id

  infrastructure_subnet_id = var.aca_subnet_id

  tags = var.tags
}

resource "azurerm_monitor_diagnostic_setting" "env" {
  name                       = "${var.container_app_environment_name}-diag"
  target_resource_id         = azurerm_container_app_environment.this.id
  log_analytics_workspace_id = var.log_analytics_workspace_resource

  enabled_metric {
    category = "AllMetrics"
  }
}

resource "azurerm_container_app" "this" {
  name                         = var.container_app_name
  resource_group_name          = var.resource_group_name
  container_app_environment_id = azurerm_container_app_environment.this.id
  revision_mode                = "Single"

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.runtime.id]
  }

  dynamic "secret" {
    for_each = var.key_vault_secret_ids
    content {
      name                = secret.key
      identity            = azurerm_user_assigned_identity.runtime.id
      key_vault_secret_id = secret.value
    }
  }

  ingress {
    external_enabled = true
    target_port      = 3000
    transport        = "auto"

    dynamic "ip_security_restriction" {
      for_each = local.ip_rules
      content {
        name             = "allow-${ip_security_restriction.key}"
        action           = "Allow"
        ip_address_range = ip_security_restriction.value
        description      = "Allow-listed CIDR"
      }
    }

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    min_replicas = 0
    max_replicas = 1

    init_container {
      name   = "flyway"
      image  = var.flyway_image
      cpu    = 0.25
      memory = "0.5Gi"

      command = ["flyway"]
      args    = ["migrate"]

      env {
        name  = "FLYWAY_URL"
        value = "jdbc:postgresql://${var.postgres_host}:5432/${var.postgres_app_db_name}"
      }
      env {
        name  = "FLYWAY_USER"
        value = var.postgres_admin_username
      }

      dynamic "env" {
        for_each = local.has_postgres_admin_password ? [1] : []
        content {
          name        = "FLYWAY_PASSWORD"
          secret_name = "postgres_admin_password"
        }
      }
    }

    container {
      name   = "api"
      image  = var.backend_image
      cpu    = 0.5
      memory = "1Gi"

      dynamic "env" {
        for_each = local.has_database_url_secret ? [1] : []
        content {
          name        = "DATABASE_URL"
          secret_name = "database_url"
        }
      }

      env {
        name  = "PORT"
        value = "3000"
      }

      readiness_probe {
        transport = "HTTP"
        port      = 3000
        path      = "/health"

        initial_delay           = 5
        interval_seconds        = 10
        timeout                 = 2
        failure_count_threshold = 6
      }
    }

    container {
      name   = "keycloak"
      image  = var.keycloak_image
      cpu    = 0.5
      memory = "1Gi"

      args = ["start-dev"]

      env {
        name  = "KEYCLOAK_ADMIN"
        value = var.keycloak_admin_username
      }

      dynamic "env" {
        for_each = local.has_keycloak_admin_password ? [1] : []
        content {
          name        = "KEYCLOAK_ADMIN_PASSWORD"
          secret_name = "keycloak_admin_password"
        }
      }

      env {
        name  = "KC_DB"
        value = "postgres"
      }

      dynamic "env" {
        for_each = local.has_keycloak_db_url_secret ? [1] : []
        content {
          name        = "KC_DB_URL"
          secret_name = "keycloak_db_url"
        }
      }

      env {
        name  = "KC_HTTP_ENABLED"
        value = "true"
      }
      env {
        name  = "KC_PROXY_HEADERS"
        value = "xforwarded"
      }

      readiness_probe {
        transport = "HTTP"
        port      = 8080
        path      = "/realms/master"

        initial_delay           = 10
        interval_seconds        = 10
        timeout                 = 3
        failure_count_threshold = 6
      }
    }
  }

  tags = var.tags

  depends_on = [azurerm_role_assignment.kv_secrets_user]
}

resource "azurerm_monitor_diagnostic_setting" "app" {
  name                       = "${var.container_app_name}-diag"
  target_resource_id         = azurerm_container_app.this.id
  log_analytics_workspace_id = var.log_analytics_workspace_resource

  enabled_metric {
    category = "AllMetrics"
  }
}
