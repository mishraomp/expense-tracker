#!/bin/bash
# Expense Tracker - Post-Installation Script
# This script runs after the .deb package is installed
#
# Required versions:
#   - PostgreSQL 18+
#   - Node.js 24 LTS+
#   - OpenJDK 25+
#   - Flyway 11+
#   - Keycloak 26+
#
set -e

INSTALL_DIR="/opt/expense-tracker"
CONFIG_DIR="/etc/expense-tracker"
LOG_DIR="/var/log/expense-tracker"
DATA_DIR="/var/lib/expense-tracker"
SERVICE_USER="expense-tracker"

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║       Expense Tracker - Post-Installation Configuration       ║"
echo "╚═══════════════════════════════════════════════════════════════╝"

# ─────────────────────────────────────────────────────────────────────────────
# Create service user
# ─────────────────────────────────────────────────────────────────────────────
echo "→ Creating service user: $SERVICE_USER"
if ! id "$SERVICE_USER" &>/dev/null; then
    useradd --system --no-create-home --shell /usr/sbin/nologin "$SERVICE_USER"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Create required directories
# ─────────────────────────────────────────────────────────────────────────────
echo "→ Setting up directories..."
mkdir -p "$LOG_DIR" "$DATA_DIR" "$CONFIG_DIR"

# ─────────────────────────────────────────────────────────────────────────────
# Set permissions
# ─────────────────────────────────────────────────────────────────────────────
echo "→ Setting permissions..."
chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"
chown -R "$SERVICE_USER:$SERVICE_USER" "$LOG_DIR"
chown -R "$SERVICE_USER:$SERVICE_USER" "$DATA_DIR"
chown -R root:root "$CONFIG_DIR"
chmod 755 "$CONFIG_DIR"
chmod 640 "$CONFIG_DIR"/*.conf 2>/dev/null || true

# Make Flyway and Keycloak executables
chmod +x "$INSTALL_DIR/flyway/flyway" 2>/dev/null || true
chmod +x "$INSTALL_DIR/keycloak-server/bin/"*.sh 2>/dev/null || true

# ─────────────────────────────────────────────────────────────────────────────
# Generate default configuration if not exists
# ─────────────────────────────────────────────────────────────────────────────
if [ ! -f "$CONFIG_DIR/expense-tracker.conf" ]; then
    echo "→ Creating default configuration..."
    cat > "$CONFIG_DIR/expense-tracker.conf" << 'EOF'
# Expense Tracker API Configuration
# Database connection
DATABASE_URL=postgresql://expense_tracker:change_me@localhost:5432/expense_tracker

# API settings
PORT=3000
NODE_ENV=production

# JWT settings (generate a secure secret for production!)
JWT_SECRET=CHANGE_THIS_TO_A_SECURE_SECRET
JWT_EXPIRES_IN=7d

# Keycloak settings
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=expense-tracker
KEYCLOAK_CLIENT_ID=expense-tracker-api
EOF
    chmod 640 "$CONFIG_DIR/expense-tracker.conf"
fi

if [ ! -f "$CONFIG_DIR/keycloak.conf" ]; then
    echo "→ Creating Keycloak configuration..."
    cat > "$CONFIG_DIR/keycloak.conf" << 'EOF'
# Keycloak Configuration
KC_DB=postgres
KC_DB_URL=jdbc:postgresql://localhost:5432/keycloak
KC_DB_USERNAME=keycloak
KC_DB_PASSWORD=change_me

# HTTP settings
KC_HTTP_PORT=8080
KC_HTTP_ENABLED=true
KC_HOSTNAME_STRICT=false

# Initial admin credentials (change after first login!)
KC_BOOTSTRAP_ADMIN_USERNAME=admin
KC_BOOTSTRAP_ADMIN_PASSWORD=change_me
EOF
    chmod 640 "$CONFIG_DIR/keycloak.conf"
fi

# ─────────────────────────────────────────────────────────────────────────────
# PostgreSQL database setup
# ─────────────────────────────────────────────────────────────────────────────
echo "→ Checking PostgreSQL..."
if systemctl is-active --quiet postgresql; then
    echo "  PostgreSQL is running."
    
    # Check if databases exist, create if not
    if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw expense_tracker; then
        echo "  Database 'expense_tracker' already exists."
    else
        echo "  Creating database 'expense_tracker'..."
        sudo -u postgres psql -c "CREATE DATABASE expense_tracker;" || true
        sudo -u postgres psql -c "CREATE USER expense_tracker WITH ENCRYPTED PASSWORD 'change_me';" || true
        sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE expense_tracker TO expense_tracker;" || true
    fi
    
    if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw keycloak; then
        echo "  Database 'keycloak' already exists."
    else
        echo "  Creating database 'keycloak'..."
        sudo -u postgres psql -c "CREATE DATABASE keycloak;" || true
        sudo -u postgres psql -c "CREATE USER keycloak WITH ENCRYPTED PASSWORD 'change_me';" || true
        sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE keycloak TO keycloak;" || true
    fi
else
    echo "  ⚠ PostgreSQL is not running. Please start PostgreSQL and run database setup manually."
fi

# ─────────────────────────────────────────────────────────────────────────────
# Run database migrations with Flyway
# ─────────────────────────────────────────────────────────────────────────────
echo "→ Running database migrations..."
if [ -x "$INSTALL_DIR/flyway/flyway" ]; then
    # Source config for database URL
    if [ -f "$CONFIG_DIR/expense-tracker.conf" ]; then
        source <(grep -E '^DATABASE_URL=' "$CONFIG_DIR/expense-tracker.conf")
    fi
    
    # Parse DATABASE_URL for Flyway format
    if [ -n "$DATABASE_URL" ]; then
        # Extract components from postgresql://user:pass@host:port/dbname
        FLYWAY_URL=$(echo "$DATABASE_URL" | sed 's|postgresql://|jdbc:postgresql://|' | sed 's|?.*||')
        
        "$INSTALL_DIR/flyway/flyway" \
            -url="$FLYWAY_URL" \
            -locations="filesystem:$INSTALL_DIR/migrations" \
            -baselineOnMigrate=true \
            migrate || echo "  ⚠ Migration failed. Check database connection and run manually."
    else
        echo "  ⚠ DATABASE_URL not configured. Skipping migrations."
    fi
else
    echo "  ⚠ Flyway not found. Skipping migrations."
fi

# ─────────────────────────────────────────────────────────────────────────────
# Import Keycloak realm
# ─────────────────────────────────────────────────────────────────────────────
echo "→ Preparing Keycloak realm..."
if [ -f "$INSTALL_DIR/keycloak/realm-export.json" ]; then
    mkdir -p "$INSTALL_DIR/keycloak-server/data/import"
    cp "$INSTALL_DIR/keycloak/realm-export.json" "$INSTALL_DIR/keycloak-server/data/import/"
    chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR/keycloak-server/data"
    echo "  Realm configuration copied. It will be imported on first Keycloak start."
fi

# ─────────────────────────────────────────────────────────────────────────────
# Configure nginx (optional - for reverse proxy on port 80)
# The backend serves frontend at :3000 in production mode
# ─────────────────────────────────────────────────────────────────────────────
echo "→ Configuring nginx (optional reverse proxy)..."
if [ -d /etc/nginx/sites-available ]; then
    if [ ! -f /etc/nginx/sites-available/expense-tracker ]; then
        cat > /etc/nginx/sites-available/expense-tracker << 'EOF'
server {
    listen 80;
    server_name localhost;

    # All traffic goes to the backend (which serves frontend in production)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Keycloak proxy
    location /auth/ {
        proxy_pass http://127.0.0.1:8080/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
        ln -sf /etc/nginx/sites-available/expense-tracker /etc/nginx/sites-enabled/
        echo "  Nginx site configuration created."
    fi
    
    # Test and reload nginx
    nginx -t 2>/dev/null && systemctl reload nginx || true
else
    echo "  Nginx not installed. Backend serves frontend directly at port 3000."
fi

# ─────────────────────────────────────────────────────────────────────────────
# Enable and start services
# ─────────────────────────────────────────────────────────────────────────────
echo "→ Enabling systemd services..."
systemctl daemon-reload

# Enable services (don't start automatically - let admin configure first)
systemctl enable expense-tracker-keycloak.service || true
systemctl enable expense-tracker-api.service || true

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    Installation Complete!                      ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "  1. Edit configuration files in /etc/expense-tracker/"
echo "     - expense-tracker.conf  (API settings)"
echo "     - keycloak.conf         (Identity server settings)"
echo ""
echo "  2. Update database passwords in both config files"
echo ""
echo "  3. Start the services:"
echo "     sudo systemctl start expense-tracker-keycloak"
echo "     sudo systemctl start expense-tracker-api"
echo ""
echo "  4. Access the application:"
echo "     - Frontend: http://localhost/"
echo "     - API:      http://localhost/api/"
echo "     - Keycloak: http://localhost/auth/"
echo ""
echo "Logs are available at: /var/log/expense-tracker/"
echo ""

exit 0
