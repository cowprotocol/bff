CREATE TABLE notifications_indexer_state (
  key TEXT NOT NULL,
  chainId INTEGER,
  state JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (key, chainId)
);

-- Update the updated_at column with the current timestamp
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_updated_at
BEFORE UPDATE ON notifications_indexer_state
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();



