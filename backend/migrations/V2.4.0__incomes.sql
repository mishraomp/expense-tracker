-- V2.4.0__incomes.sql
-- Income tracking table for family income sources

-- Create income_source enum
CREATE TYPE income_source AS ENUM ('salary', 'bonus', 'investment', 'rental', 'freelance', 'gift', 'other');

-- Create income_frequency enum
CREATE TYPE income_frequency AS ENUM ('one_time', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annual');

-- Create incomes table
CREATE TABLE incomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    date DATE NOT NULL,
    source income_source NOT NULL DEFAULT 'salary',
    frequency income_frequency NOT NULL DEFAULT 'one_time',
    description TEXT,
    employer VARCHAR(255),
    is_recurring BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ(6)
);

-- Create indexes for common queries
CREATE INDEX idx_incomes_user_id ON incomes(user_id);
CREATE INDEX idx_incomes_date ON incomes(date);
CREATE INDEX idx_incomes_user_date ON incomes(user_id, date DESC);
CREATE INDEX idx_incomes_source ON incomes(source);
CREATE INDEX idx_incomes_frequency ON incomes(frequency);

-- Add comment
COMMENT ON TABLE incomes IS 'Stores family income records from various sources';
