# Quick Deployment Guide - Partner Dashboard Updates

## Step 1: Apply Database Migration

Open your Supabase SQL Editor and run the following migration:

```sql
-- Add new columns to referrals table
ALTER TABLE public.referrals
ADD COLUMN IF NOT EXISTS business_type text,
ADD COLUMN IF NOT EXISTS client_country text,
ADD COLUMN IF NOT EXISTS client_niche text,
ADD COLUMN IF NOT EXISTS client_group text;

-- Add comments for documentation
COMMENT ON COLUMN public.referrals.business_type IS 'Type of business (e.g., E-commerce, Retail, etc.)';
COMMENT ON COLUMN public.referrals.client_country IS 'Country of the client';
COMMENT ON COLUMN public.referrals.client_niche IS 'Business niche or category';
COMMENT ON COLUMN public.referrals.client_group IS 'Client group classification';
```

## Step 2: Update Referral View

Run the updated view SQL in Supabase SQL Editor:

```sql
drop view if exists referral_view;

create view public.referral_view with (security_invoker = on) as
select
  r.id,
  r.created_at,
  r.store_name,
  r.quantity_of_order,
  r.order_number,
  r.order_time,
  r.customer_number,
  r.uuid,
  r.affiliate_id,
  r.agent_name,
  r.invoice_total,
  r.business_type,
  r.client_country,
  r.client_niche,
  r.client_group,
  acs.uid,
  acs.commission_method,
  acs.commission_rate,
  acs.affiliate,
  acs.customer_id,
  afs.user_id,
  case
    when acs.commission_method = 1 then acs.commission_rate * r.quantity_of_order::numeric
    when acs.commission_method = 2 then acs.commission_rate * r.invoice_total
    else 0::numeric
  end as total_commission
from
  referrals r
  left join affiliate_customer_setting acs on acs.affiliate = r.affiliate_id
  and acs.customer_id = r.customer_number
  left join affiliates afs on afs.affiliate_id = r.affiliate_id
  ;
GRANT SELECT ON referral_view to authenticated;
```

## Step 3: Test Database Changes

Verify the changes:

```sql
-- Check referrals table has new columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'referrals'
AND column_name IN ('business_type', 'client_country', 'client_niche', 'client_group');

-- Check view has new columns
SELECT * FROM referral_view LIMIT 1;
```

## Step 4: Deploy Application

```bash
# Install dependencies (if needed)
npm install

# Build the application
npm run build

# Deploy to your hosting platform (Vercel example)
vercel --prod
```

## Step 5: Verify Deployment

1. **Navigate to Partner Dashboard**
   - Go to `/commercive-partners` as an affiliate user
   - Verify the table shows all 10 columns:
     - Date
     - Order #
     - Client ID
     - Store Name
     - Business Type
     - Country
     - Qty
     - Total Amount
     - Rate
     - Commission

2. **Test Sorting**
   - Click on each column header
   - Verify ascending/descending sort works
   - Check that sort indicators (up/down arrows) appear

3. **Test CSV Upload**
   - Go to admin partner management
   - Click "Upload Referrals"
   - Download the CSV template
   - Verify template has new columns
   - Upload a test CSV with the new format
   - Verify data appears in partner dashboard

4. **Test Responsive Design**
   - View on mobile device or resize browser
   - Table should scroll horizontally
   - All columns should remain visible with scroll

## Rollback Plan

If you need to rollback:

```sql
-- Remove new columns (if needed)
ALTER TABLE public.referrals
DROP COLUMN IF EXISTS business_type,
DROP COLUMN IF EXISTS client_country,
DROP COLUMN IF EXISTS client_niche,
DROP COLUMN IF EXISTS client_group;

-- Restore old view (save your old view SQL first!)
-- Run your backed-up view SQL here
```

## Troubleshooting

### Issue: Table not showing new columns
- **Solution**: Hard refresh browser (Ctrl+F5 or Cmd+Shift+R)
- Check browser console for errors
- Verify database migration was applied

### Issue: CSV upload fails
- **Solution**: Check CSV column headers match exactly
- Verify affiliate_id is in format AFF-XXXXXXXX
- Check for duplicate order numbers in CSV

### Issue: TypeScript errors
- **Solution**: Ensure database.types.ts was updated
- Run: `npm run type-check` (if available)
- Restart your development server

### Issue: Sorting not working
- **Solution**: Check that fetchReferrals dependency array includes sortField and sortDirection
- Verify column names in SortableHeader match database column names

## Post-Deployment Checklist

- [ ] Database migration successful
- [ ] View updated and accessible
- [ ] Application deployed without errors
- [ ] Partner dashboard displays 10 columns
- [ ] Column sorting works on all columns
- [ ] CSV template download has new format
- [ ] CSV upload with new columns works
- [ ] Table is responsive on mobile
- [ ] No TypeScript errors
- [ ] No console errors in browser

## Support

For issues or questions:
1. Check the PARTNER_DASHBOARD_UPDATES.md for detailed information
2. Review database logs in Supabase
3. Check application logs in your hosting platform
4. Verify all files were deployed correctly
