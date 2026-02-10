-- Migration: Add tickets column to surveydisco_projects table
-- Date: 2026-02-10
-- Requirements: 5.1, 5.3

-- Add tickets column to store array of ticket objects
ALTER TABLE surveydisco_projects 
ADD COLUMN IF NOT EXISTS tickets JSONB DEFAULT '[]'::jsonb;

-- Add index for efficient querying of tickets
CREATE INDEX IF NOT EXISTS idx_projects_tickets ON surveydisco_projects USING GIN (tickets);
