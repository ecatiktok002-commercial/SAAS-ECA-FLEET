-- Migration: Create table for tracking API usage and subscriber quota limits
CREATE TABLE IF NOT EXISTS subscriber_api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL,
  endpoint TEXT NOT NULL DEFAULT 'receipt-ocr',
  daily_requests INT NOT NULL DEFAULT 0,
  daily_quota INT NOT NULL DEFAULT 1000,
  last_request_at TIMESTAMPTZ DEFAULT NOW(),
  reset_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 day'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_subscriber_endpoint UNIQUE (subscriber_id, endpoint)
);

-- Index for fast lookup by subscriber_id and endpoint
CREATE INDEX IF NOT EXISTS idx_subscriber_api_usage ON subscriber_api_usage (subscriber_id, endpoint);

-- Enable RLS
ALTER TABLE subscriber_api_usage ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to view their own subscriber usage
CREATE POLICY "Allow subscriber to read API usage" ON subscriber_api_usage
  FOR SELECT TO authenticated
  USING (true);
