#!/bin/bash
# Expense Tracker - Post-Removal Script
# This script runs after the .deb package is removed
set -e

SERVICE_USER="expense-tracker"

echo "→ Cleaning up Expense Tracker installation..."

# Reload systemd
systemctl daemon-reload

# Remove nginx site config
if [ -f /etc/nginx/sites-enabled/expense-tracker ]; then
    rm -f /etc/nginx/sites-enabled/expense-tracker
    rm -f /etc/nginx/sites-available/expense-tracker
    nginx -t 2>/dev/null && systemctl reload nginx || true
    echo "→ Nginx configuration removed."
fi

# Note: We intentionally do NOT remove:
# - /etc/expense-tracker/ (configuration files)
# - /var/log/expense-tracker/ (log files)
# - Database data
# This allows for reinstallation without data loss

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    Uninstallation Complete                     ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "The following were preserved (remove manually if not needed):"
echo "  - Configuration: /etc/expense-tracker/"
echo "  - Logs: /var/log/expense-tracker/"
echo "  - PostgreSQL databases: expense_tracker, keycloak"
echo ""
echo "To completely remove all data:"
echo "  sudo rm -rf /etc/expense-tracker /var/log/expense-tracker"
echo "  sudo -u postgres dropdb expense_tracker"
echo "  sudo -u postgres dropdb keycloak"
echo "  sudo userdel expense-tracker"
echo ""

exit 0
