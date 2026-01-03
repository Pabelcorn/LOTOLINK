-- ============================================================
-- SUCURSALES (BRANCH OFFICES) MIGRATION
-- Adds support for branch offices within bancas
-- ============================================================

-- Create sucursales table
CREATE TABLE IF NOT EXISTS sucursales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    banca_id UUID NOT NULL REFERENCES bancas(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    address VARCHAR(255),
    city VARCHAR(100),
    phone VARCHAR(50),
    operator_prefix VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    ticket_config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(banca_id, code)
);

CREATE INDEX idx_sucursales_banca_id ON sucursales(banca_id);
CREATE INDEX idx_sucursales_code ON sucursales(code);
CREATE INDEX idx_sucursales_active ON sucursales(is_active);

-- Add updated_at trigger for sucursales
CREATE TRIGGER update_sucursales_updated_at
    BEFORE UPDATE ON sucursales
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add new fields to plays table for enhanced ticket support
ALTER TABLE plays ADD COLUMN IF NOT EXISTS sucursal_id UUID REFERENCES sucursales(id);
ALTER TABLE plays ADD COLUMN IF NOT EXISTS sorteo_number VARCHAR(50);
ALTER TABLE plays ADD COLUMN IF NOT EXISTS sorteo_time VARCHAR(20);
ALTER TABLE plays ADD COLUMN IF NOT EXISTS sorteo_name VARCHAR(100);
ALTER TABLE plays ADD COLUMN IF NOT EXISTS barcode VARCHAR(100);
ALTER TABLE plays ADD COLUMN IF NOT EXISTS valid_until DATE;
ALTER TABLE plays ADD COLUMN IF NOT EXISTS operator_user_id VARCHAR(50);
ALTER TABLE plays ADD COLUMN IF NOT EXISTS modality VARCHAR(20);
ALTER TABLE plays ADD COLUMN IF NOT EXISTS receipt_printed_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for new plays fields
CREATE INDEX IF NOT EXISTS idx_plays_sucursal_id ON plays(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_plays_sorteo_number ON plays(sorteo_number);
CREATE INDEX IF NOT EXISTS idx_plays_barcode ON plays(barcode);
CREATE INDEX IF NOT EXISTS idx_plays_operator ON plays(operator_user_id);

COMMENT ON TABLE sucursales IS 'Branch offices (sucursales) for each banca with independent ticket configuration';
COMMENT ON COLUMN plays.sucursal_id IS 'Reference to the branch office that processed the play';
COMMENT ON COLUMN plays.sorteo_number IS 'Lottery draw number (e.g., #18331)';
COMMENT ON COLUMN plays.sorteo_time IS 'Time of the lottery draw';
COMMENT ON COLUMN plays.barcode IS 'Barcode for ticket scanning';
COMMENT ON COLUMN plays.valid_until IS 'Date until which the ticket is valid (typically 60 days)';
COMMENT ON COLUMN plays.operator_user_id IS 'ID of the operator who processed the play';
