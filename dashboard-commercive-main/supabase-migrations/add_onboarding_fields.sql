-- =====================================================
-- COMMERCIVE ONBOARDING FEATURE - DATABASE MIGRATION
-- =====================================================
-- This migration adds onboarding tracking fields to the user table
-- Run this in your Supabase SQL Editor: https://app.supabase.com/project/_/sql

-- Add onboarding fields to user table
ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS onboarding_skipped BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_started_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add comment to document the fields
COMMENT ON COLUMN "user".onboarding_completed IS 'True when user has completed the onboarding wizard';
COMMENT ON COLUMN "user".onboarding_step IS 'Current step in onboarding process (0-4)';
COMMENT ON COLUMN "user".onboarding_skipped IS 'True if user skipped onboarding';
COMMENT ON COLUMN "user".onboarding_started_at IS 'Timestamp when user started onboarding';
COMMENT ON COLUMN "user".onboarding_completed_at IS 'Timestamp when user completed onboarding';

-- Create index for faster queries on onboarding_completed
CREATE INDEX IF NOT EXISTS idx_user_onboarding_completed ON "user" (onboarding_completed);

-- Create a view to easily identify users who need onboarding
CREATE OR REPLACE VIEW users_needing_onboarding AS
SELECT
  id,
  email,
  first_name,
  last_name,
  created_at,
  onboarding_step,
  onboarding_started_at
FROM "user"
WHERE
  onboarding_completed = FALSE
  AND onboarding_skipped = FALSE
  AND created_at > NOW() - INTERVAL '30 days'  -- Only recent users
ORDER BY created_at DESC;

-- Grant access to the view (adjust role as needed)
GRANT SELECT ON users_needing_onboarding TO authenticated;

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================
-- Run this to verify the migration was successful:
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'user'
-- AND column_name LIKE 'onboarding%';

-- =====================================================
-- ROLLBACK (if needed)
-- =====================================================
-- Uncomment and run the following to remove onboarding fields:
--
-- DROP VIEW IF EXISTS users_needing_onboarding;
-- DROP INDEX IF EXISTS idx_user_onboarding_completed;
-- ALTER TABLE "user"
-- DROP COLUMN IF EXISTS onboarding_completed,
-- DROP COLUMN IF EXISTS onboarding_step,
-- DROP COLUMN IF EXISTS onboarding_skipped,
-- DROP COLUMN IF EXISTS onboarding_started_at,
-- DROP COLUMN IF EXISTS onboarding_completed_at;

-- =====================================================
-- DEPLOYMENT NOTES
-- =====================================================
-- 1. Run this migration in Supabase SQL Editor
-- 2. Verify with the verification query above
-- 3. Test onboarding flow at: https://dashboard.commercive.co/onboarding
-- 4. Existing users will have onboarding_completed=FALSE by default
-- 5. You can mark existing users as completed:
--    UPDATE "user" SET onboarding_completed = TRUE WHERE created_at < '2024-01-01';
