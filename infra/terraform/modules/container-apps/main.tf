locals {
  ip_rules = {
    for idx, cidr in var.ip_allow_list_cidrs : idx => cidr
  }

}

resource "azurerm_user_assigned_identity" "runtime" {
  name                = "${var.container_app_name}-runtime"
  location            = var.location
  resource_group_name = var.resource_group_name
  tags                = var.tags
}


resource "azurerm_container_app_environment" "this" {
  name                               = var.container_app_environment_name
  location                           = var.location
  resource_group_name                = var.resource_group_name
  infrastructure_resource_group_name = "ME-${var.resource_group_name}-rg"
  log_analytics_workspace_id         = var.log_analytics_workspace_id
  workload_profile {
    name                  = "Consumption"
    workload_profile_type = "Consumption"
  }
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

resource "azurerm_container_app" "keycloak" {
  name                         = "${var.container_app_name}-keycloak"
  resource_group_name          = var.resource_group_name
  container_app_environment_id = azurerm_container_app_environment.this.id
  revision_mode                = "Single"

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.runtime.id]
  }
  secret {
    name  = "password"
    value = var.postgres_admin_password
  }
  ingress {
    external_enabled = false
    target_port      = 8080
    transport        = "auto"
    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }
  template {
    min_replicas = 0
    max_replicas = 1
    container {
      name   = "keycloak"
      image  = var.keycloak_image
      cpu    = 0.5
      memory = "1Gi"

      args = ["start-dev"]

      env {
        name  = "KC_BOOTSTRAP_ADMIN_USERNAME"
        value = var.keycloak_admin_username
      }
      env {
        name        = "KC_BOOTSTRAP_ADMIN_PASSWORD"
        secret_name = "password"
      }

      env {
        name  = "KC_DB"
        value = "postgres"
      }
      env {
        name  = "KC_DB_URL"
        value = "jdbc:postgresql://${var.postgres_host}:5432/${var.postgres_keycloak_db_name}"
      }

      env {
        name  = "KC_HTTP_ENABLED"
        value = "true"
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
  secret {
    name  = "password"
    value = var.postgres_admin_password
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
      env {
        name  = "FLYWAY_SCHEMAS"
        value = "public"
      }
      env {
        name  = "FLYWAY_CONNECT_RETRIES"
        value = "10"
      }
      env {
        name  = "FLYWAY_GROUP"
        value = "true"
      }
      env {
        name        = "FLYWAY_PASSWORD"
        secret_name = "password"
      }

    }

    container {
      name   = "api"
      image  = var.backend_image
      cpu    = 0.5
      memory = "1Gi"

      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "POSTGRES_HOST"
        value = var.postgres_host
      }

      env {
        name  = "POSTGRES_USER"
        value = var.postgres_admin_username
      }

      env {
        name        = "POSTGRES_PASSWORD"
        secret_name = "password"
      }
      env {
        name  = "PORT"
        value = "3000"
      }
      env {
        name  = "POSTGRES_DATABASE"
        value = var.postgres_app_db_name
      }
      env {
        name  = "KEYCLOAK_URL"
        value = "https://${var.container_app_name}-keycloak.${azurerm_container_app_environment.this.default_domain}"
      }
      env {
        name  = "KEYCLOAK_REALM"
        value = "expense-tracker"
      }
      env {
        name  = "KEYCLOAK_CLIENT_ID_API"
        value = "expense-tracker-api"
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


  }

  tags = var.tags

}

resource "azurerm_monitor_diagnostic_setting" "app" {
  name                       = "${var.container_app_name}-diag"
  target_resource_id         = azurerm_container_app.this.id
  log_analytics_workspace_id = var.log_analytics_workspace_resource

  enabled_metric {
    category = "AllMetrics"
  }
}
