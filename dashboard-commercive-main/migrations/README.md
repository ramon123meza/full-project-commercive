# Payout Enhancements Migration Guide

This directory contains database migrations for adding payout request visibility and auto-payout options.

## Changes Overview

### Database Changes
- Added payment method support (PayPal, Zelle, Wise) to payouts table
- Added payment preferences to affiliates table
- Added auto-payout toggle for monthly automatic payouts
- Added status tracking fields (requested_at, processed_at)

### Frontend Changes
- Added payment preferences UI for affiliates
- Added auto-payout toggle with monthly payout message
- Updated payout request flow to use saved payment preferences
- Enhanced admin payout table to show payment methods and better status tracking

## Migration Steps

### 1. Apply Database Migration

Run the following SQL migration in your Supabase SQL editor:

```bash
# Navigate to Supabase dashboard > SQL Editor
# Copy and paste the contents of 001_add_payout_enhancements.sql
```

Or use Supabase CLI:

```bash
supabase db push
```

### 2. Verify Database Changes

After running the migration, verify the following tables have been updated:

**payouts table - New columns:**
- `payment_method` (VARCHAR) - Payment method type (paypal, zelle, wise)
- `payment_details` (JSONB) - Payment method specific details
- `requested_at` (TIMESTAMP) - When payout was requested
- `processed_at` (TIMESTAMP) - When payout was processed
- `notes` (TEXT) - Admin notes

**affiliates table - New columns:**
- `auto_payout_enabled` (BOOLEAN) - Auto payout enabled flag
- `preferred_payment_method` (VARCHAR) - Preferred payment method
- `payment_method_details` (JSONB) - Payment method details

### 3. Update TypeScript Types

The TypeScript database types have been updated in:
- `/src/app/utils/supabase/database.types.ts`

If you're using Supabase CLI, regenerate types:

```bash
supabase gen types typescript --local > src/app/utils/supabase/database.types.ts
```

## Features

### For Affiliates

1. **Payment Preferences**
   - Set preferred payment method (PayPal, Zelle, or Wise)
   - Enter payment details for each method
   - Toggle automatic monthly payouts

2. **Payout Requests**
   - Request payouts using saved payment preferences
   - View payout history with status tracking
   - Receive automatic monthly payouts (if enabled)

3. **Auto-Payout Message**
   - "We pay monthly (3-5 business days at beginning of month)"

### For Admins

1. **Enhanced Payout Table**
   - View payment method for each payout request
   - See payment details (email, phone, account info)
   - Status tracking: Requested → Processing → Completed
   - Process and complete payout requests

2. **Status Workflow**
   - **Requested** (Pending): New payout request from affiliate
   - **Processing** (Approved): Admin has initiated payment
   - **Completed**: Payment has been sent

## Payment Method Details Structure

### PayPal
```json
{
  "email": "user@example.com"
}
```

### Zelle
```json
{
  "zelle_email": "user@example.com",
  "zelle_phone": "+1234567890"
}
```

### Wise
```json
{
  "email": "user@example.com",
  "account_type": "personal"
}
```

## Backward Compatibility

- Existing payouts will default to PayPal payment method
- Legacy `paypal_address` field is still populated for backward compatibility
- All existing payout records remain functional

## Testing

1. **Test as Affiliate:**
   - Navigate to Partner Dashboard
   - Set up payment preferences
   - Toggle auto-payout
   - Request a payout
   - Verify status shows as "Requested"

2. **Test as Admin:**
   - Navigate to Payouts page
   - View payout requests
   - Process a payout (Requested → Processing)
   - Complete a payout (Processing → Completed)
   - Verify payment method and details display correctly

## Rollback

If you need to rollback the migration:

```sql
-- Remove new columns from payouts table
ALTER TABLE payouts
DROP COLUMN IF EXISTS payment_method,
DROP COLUMN IF EXISTS payment_details,
DROP COLUMN IF EXISTS requested_at,
DROP COLUMN IF EXISTS processed_at,
DROP COLUMN IF EXISTS notes;

-- Remove new columns from affiliates table
ALTER TABLE affiliates
DROP COLUMN IF EXISTS auto_payout_enabled,
DROP COLUMN IF EXISTS preferred_payment_method,
DROP COLUMN IF EXISTS payment_method_details;
```

## Support

For issues or questions, please contact the development team.
