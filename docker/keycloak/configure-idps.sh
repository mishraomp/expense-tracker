#!/bin/sh
set -e

KEYCLOAK_URL="http://keycloak:8080"
REALM="expense-tracker"

echo "Waiting for Keycloak to be ready..."
until curl -sf ${KEYCLOAK_URL} > /dev/null 2>&1; do
    echo "Still waiting..."
    sleep 5
done
echo "Keycloak is ready!"

# Get admin token
echo "Getting admin access token..."
ADMIN_TOKEN=$(curl -s -X POST "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin" \
  -d "password=admin" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$ADMIN_TOKEN" ] || [ "$ADMIN_TOKEN" == "null" ]; then
    echo "Failed to get admin token"
    exit 1
fi

echo "Admin token obtained successfully"

# Configure Google Identity Provider
if [ -n "$GOOGLE_CLIENT_ID" ] && [ "$GOOGLE_CLIENT_ID" != "your-google-client-id-here.apps.googleusercontent.com" ]; then
    echo "Configuring Google Identity Provider..."
    
    # Check if Google IDP already exists
    EXISTING_GOOGLE=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${REALM}/identity-provider/instances/google" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json")
    
    if echo "$EXISTING_GOOGLE" | grep -q '"alias"'; then
        echo "Google IDP already exists, updating..."
        curl -s -X PUT "${KEYCLOAK_URL}/admin/realms/${REALM}/identity-provider/instances/google" \
          -H "Authorization: Bearer $ADMIN_TOKEN" \
          -H "Content-Type: application/json" \
          -d "{
            \"alias\": \"google\",
            \"providerId\": \"google\",
            \"enabled\": true,
            \"updateProfileFirstLoginMode\": \"on\",
            \"trustEmail\": true,
            \"storeToken\": false,
            \"addReadTokenRoleOnCreate\": false,
            \"authenticateByDefault\": false,
            \"linkOnly\": false,
            \"firstBrokerLoginFlowAlias\": \"first broker login\",
            \"config\": {
              \"clientId\": \"$GOOGLE_CLIENT_ID\",
              \"clientSecret\": \"$GOOGLE_CLIENT_SECRET\",
              \"defaultScope\": \"openid profile email\",
              \"syncMode\": \"IMPORT\",
              \"useJwksUrl\": \"true\"
            }
          }"
    else
        echo "Creating Google IDP..."
        curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${REALM}/identity-provider/instances" \
          -H "Authorization: Bearer $ADMIN_TOKEN" \
          -H "Content-Type: application/json" \
          -d "{
            \"alias\": \"google\",
            \"providerId\": \"google\",
            \"enabled\": true,
            \"updateProfileFirstLoginMode\": \"on\",
            \"trustEmail\": true,
            \"storeToken\": false,
            \"addReadTokenRoleOnCreate\": false,
            \"authenticateByDefault\": false,
            \"linkOnly\": false,
            \"firstBrokerLoginFlowAlias\": \"first broker login\",
            \"config\": {
              \"clientId\": \"$GOOGLE_CLIENT_ID\",
              \"clientSecret\": \"$GOOGLE_CLIENT_SECRET\",
              \"defaultScope\": \"openid profile email\",
              \"syncMode\": \"IMPORT\",
              \"useJwksUrl\": \"true\"
            }
          }"
    fi
    
    # Add role mapper for Google
    echo "Google Identity Provider configured successfully"
else
    echo "Skipping Google IDP configuration (credentials not provided)"
fi

echo "Identity Provider configuration completed!"
