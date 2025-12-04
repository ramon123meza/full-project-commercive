-- Migration: Add payout enhancements for payment methods and auto-payout
-- Date: 2025-12-04
-- Description: Adds payment method support and auto-payout preferences

-- 1. Add payment method columns to payouts table
ALTER TABLE payouts
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'paypal',
ADD COLUMN IF NOT EXISTS payment_details JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS requested_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Update existing records to have payment_method set
UPDATE payouts
SET payment_method = 'paypal'
WHERE payment_method IS NULL;

-- 3. Add payment preferences to affiliates table
ALTER TABLE affiliates
ADD COLUMN IF NOT EXISTS auto_payout_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS preferred_payment_method VARCHAR(20) DEFAULT 'paypal',
ADD COLUMN IF NOT EXISTS payment_method_details JSONB DEFAULT '{}';

-- 4. Create index for faster payout queries by status
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_user_status ON payouts(user_id, status);

-- 5. Add comment to document the payment_details structure
COMMENT ON COLUMN payouts.payment_details IS 'JSON object containing payment method specific details. Examples:
- PayPal: {"email": "user@example.com"}
- Zelle: {"email": "user@example.com", "phone": "+1234567890"}
- Wise: {"email": "user@example.com", "account_type": "personal"}';

COMMENT ON COLUMN affiliates.payment_method_details IS 'JSON object containing preferred payment method details. Same structure as payouts.payment_details';

-- 6. Update the status enum to include "Requested" if not already there
-- Note: The existing AFFILIATE_STATUS enum already has "Pending" which we'll use for "Requested"
-- "Approved" will be used for "Processing"
-- "Completed" will remain as "Completed"

COMMENT ON COLUMN payouts.status IS 'Payout status: Pending (Requested), Approved (Processing), Completed';
