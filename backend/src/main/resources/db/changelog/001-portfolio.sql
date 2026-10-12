CREATE TABLE store_state (
    id INTEGER PRIMARY KEY CHECK (id = 1)
);
INSERT INTO store_state VALUES (1);
CREATE TABLE investment_entries (
    id UUID PRIMARY KEY,
    asset_type VARCHAR(80) NOT NULL,
    owner_id VARCHAR NOT NULL,
    subcategory VARCHAR(80),
    value_pln NUMERIC(38, 2) NOT NULL CHECK (value_pln >= 0),
    valuation_date DATE NOT NULL,
    created_at TIMESTAMP(9) WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP(9) WITH TIME ZONE,
    position BIGINT NOT NULL
);
CREATE TABLE investment_operations (
    id UUID PRIMARY KEY,
    operation_type VARCHAR(80) NOT NULL,
    asset_type VARCHAR(80) NOT NULL,
    owner_id VARCHAR NOT NULL,
    subcategory VARCHAR(80),
    amount_pln NUMERIC(38, 2) NOT NULL CHECK (amount_pln >= 0),
    fee_pln NUMERIC(38, 2) NOT NULL CHECK (fee_pln >= 0),
    tax_pln NUMERIC(38, 2) NOT NULL CHECK (tax_pln >= 0),
    operation_date DATE NOT NULL,
    note VARCHAR(250),
    created_at TIMESTAMP(9) WITH TIME ZONE NOT NULL,
    group_id UUID,
    position BIGINT NOT NULL
);
CREATE TABLE portfolio_plans (
    scope VARCHAR PRIMARY KEY,
    bonds DOUBLE PRECISION NOT NULL,
    stocks DOUBLE PRECISION NOT NULL,
    gold DOUBLE PRECISION NOT NULL,
    developed DOUBLE PRECISION NOT NULL,
    emerging DOUBLE PRECISION NOT NULL
);
CREATE INDEX entries_by_owner_asset ON investment_entries(owner_id, asset_type, subcategory, valuation_date);
CREATE INDEX operations_by_owner_asset ON investment_operations(owner_id, asset_type, subcategory, operation_date);
CREATE INDEX operations_by_group ON investment_operations(group_id);
