#!/bin/bash
set -e

# Ensure Node is installed; if not, the package will still be installed but the service may fail
# Install systemd service
cp packaging/linux/expense-tracker.service /etc/systemd/system/expense-tracker.service
systemctl daemon-reload
systemctl enable expense-tracker
systemctl restart expense-tracker || true

exit 0
