-- Add reports_to to users for approval chain
ALTER TABLE users ADD COLUMN IF NOT EXISTS reports_to uuid REFERENCES users(id) ON DELETE SET NULL;

-- Add approver_id to time_off_requests
ALTER TABLE time_off_requests ADD COLUMN IF NOT EXISTS approver_id uuid REFERENCES users(id) ON DELETE SET NULL;
