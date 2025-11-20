-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types
CREATE TYPE expense_source AS ENUM ('manual', 'imported', 'api');
CREATE TYPE expense_status AS ENUM ('confirmed', 'pending');
CREATE TYPE category_type AS ENUM ('predefined', 'custom');
CREATE TYPE file_type AS ENUM ('xlsx', 'csv');
CREATE TYPE import_status AS ENUM ('processing', 'completed', 'failed');
CREATE TYPE connection_status AS ENUM ('active', 'disconnected', 'error');

-- User table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    default_category_id UUID,
    date_format VARCHAR(20) DEFAULT 'MM/DD/YYYY',
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Category table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    type category_type NOT NULL,
    color_code VARCHAR(7),
    icon VARCHAR(50),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT category_type_check CHECK (
        (type = 'predefined' AND user_id IS NULL) OR
        (type = 'custom' AND user_id IS NOT NULL)
    )
);

CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_categories_type ON categories(type);
CREATE UNIQUE INDEX idx_categories_user_name_unique 
    ON categories(user_id, LOWER(name)) 
    WHERE deleted_at IS NULL;

-- Insert predefined categories
INSERT INTO categories (name, type, color_code, icon) VALUES
    ('Food & Dining', 'predefined', '#FF6B6B', 'utensils'),
    ('Transportation', 'predefined', '#4ECDC4', 'car'),
    ('Shopping', 'predefined', '#45B7D1', 'shopping-bag'),
    ('Entertainment', 'predefined', '#F7B731', 'film'),
    ('Bills & Utilities', 'predefined', '#5F27CD', 'file-invoice'),
    ('Healthcare', 'predefined', '#00D2D3', 'heartbeat'),
    ('Personal', 'predefined', '#FF9FF3', 'user'),
    ('Other', 'predefined', '#95AAC9', 'ellipsis-h');

-- ImportSession table
CREATE TABLE import_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_type file_type NOT NULL,
    total_rows INTEGER DEFAULT 0 NOT NULL,
    successful_rows INTEGER DEFAULT 0 NOT NULL,
    failed_rows INTEGER DEFAULT 0 NOT NULL,
    error_details JSONB,
    status import_status DEFAULT 'processing' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_import_sessions_user_id ON import_sessions(user_id);
CREATE INDEX idx_import_sessions_status ON import_sessions(status);
CREATE INDEX idx_import_sessions_created_at ON import_sessions(created_at DESC);

-- FinancialConnection table
CREATE TABLE financial_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    institution_name VARCHAR(255) NOT NULL,
    account_id VARCHAR(255) NOT NULL,
    access_token TEXT NOT NULL,
    item_id VARCHAR(255) NOT NULL,
    status connection_status DEFAULT 'active' NOT NULL,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_financial_connections_user_id ON financial_connections(user_id);
CREATE INDEX idx_financial_connections_status ON financial_connections(status);
CREATE UNIQUE INDEX idx_financial_connections_user_item 
    ON financial_connections(user_id, item_id);

-- Expense table
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    date DATE NOT NULL,
    description TEXT,
    source expense_source DEFAULT 'manual' NOT NULL,
    status expense_status DEFAULT 'confirmed' NOT NULL,
    import_session_id UUID REFERENCES import_sessions(id) ON DELETE SET NULL,
    connection_id UUID REFERENCES financial_connections(id) ON DELETE SET NULL,
    external_id VARCHAR(255),
    merchant_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT expense_source_session_check CHECK (
        (source != 'imported') OR (import_session_id IS NOT NULL)
    ),
    CONSTRAINT expense_source_connection_check CHECK (
        (source != 'api') OR (connection_id IS NOT NULL)
    )
);

CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_category_id ON expenses(category_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_expenses_user_date ON expenses(user_id, date DESC);
CREATE INDEX idx_expenses_import_session_id ON expenses(import_session_id);
CREATE INDEX idx_expenses_connection_id ON expenses(connection_id);
CREATE UNIQUE INDEX idx_expenses_connection_external 
    ON expenses(connection_id, external_id) 
    WHERE external_id IS NOT NULL;

-- Add foreign key for user default_category_id (after categories table exists)
ALTER TABLE users 
    ADD CONSTRAINT fk_users_default_category 
    FOREIGN KEY (default_category_id) 
    REFERENCES categories(id) ON DELETE SET NULL;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_import_sessions_updated_at BEFORE UPDATE ON import_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_connections_updated_at BEFORE UPDATE ON financial_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
