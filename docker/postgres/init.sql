-- Create UUID extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Keycloak database
CREATE DATABASE keycloak;
CREATE DATABASE expense_tracker;
CREATE DATABASE metabase;
-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE expense_tracker TO postgres;
GRANT ALL PRIVILEGES ON DATABASE keycloak TO postgres;
GRANT ALL PRIVILEGES ON DATABASE metabase TO postgres;
