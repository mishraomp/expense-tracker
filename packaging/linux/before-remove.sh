#!/bin/bash
# Expense Tracker - Pre-Removal Script
# This script runs before the .deb package is removed
set -e

echo "→ Stopping Expense Tracker services..."

# Stop services gracefully
systemctl stop expense-tracker-api.service 2>/dev/null || true
systemctl stop expense-tracker-keycloak.service 2>/dev/null || true

# Disable services
systemctl disable expense-tracker-api.service 2>/dev/null || true
systemctl disable expense-tracker-keycloak.service 2>/dev/null || true

echo "→ Services stopped."

exit 0
