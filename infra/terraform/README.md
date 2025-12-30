# Terraform Infrastructure

This directory contains Terraform code for provisioning the Azure infrastructure for this repository.

## Layout

- Root module: `infra/terraform/` is the single Terraform root.
- `modules/`: reusable internal modules composed by the root module.
- `terraform.<env>.tfvars`: per-environment static configuration (e.g., `terraform.dev.tfvars`, `terraform.test.tfvars`, `terraform.prod.tfvars`).

Secrets are not stored in `.tfvars` files; runtime secrets are always read from Azure Key Vault.

## Local workflow

From repo root:

- Format: `terraform fmt -recursive`
- Validate/plan (per environment):
  - `cd infra/terraform`
  - `terraform init`
  - `terraform validate`
  - `terraform plan -var-file=terraform.dev.tfvars`
