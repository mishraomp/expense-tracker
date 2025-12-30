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

variable "vnet_name" {
  type = string
}

variable "vnet_address_space" {
  type = list(string)
}

variable "aca_subnet_name" {
  type = string
}

variable "aca_subnet_cidr" {
  type = string
}

variable "postgres_subnet_name" {
  type = string
}

variable "postgres_subnet_cidr" {
  type = string
}
