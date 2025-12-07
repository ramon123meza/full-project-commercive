-- =====================================================
-- COMMERCIVE DATABASE REPAIR SCRIPTS
-- =====================================================
-- Run these scripts in the Supabase SQL Editor to repair
-- database issues identified during system analysis.
--
-- WARNING: Always backup your database before running repair scripts!
-- =====================================================

-- =====================================================
-- PART 1: REPAIR store_to_user TABLE (CRITICAL)
-- =====================================================
-- The store_to_user table has 0 rows due to a bug in createDashboardUser.ts
-- This script attempts to reconstruct the links based on store ownership patterns

-- Step 1.1: View current state
SELECT
    'stores' as table_name, COUNT(*) as row_count FROM stores
UNION ALL
SELECT 'user', COUNT(*) FROM "user"
UNION ALL
SELECT 'store_to_user', COUNT(*) FROM store_to_user;

-- Step 1.2: Find potential store-user matches based on email domain patterns
-- This query shows what links SHOULD exist based on store URLs and user emails
WITH potential_links AS (
    SELECT
        s.id as store_id,
        s.store_url,
        s.store_name,
        u.id as user_id,
        u.email,
        u.user_name,
        -- Extract shop name from store_url (e.g., "myshop.myshopify.com" -> "myshop")
        SPLIT_PART(s.store_url, '.', 1) as store_prefix,
        -- Check if user email contains store prefix or vice versa
        CASE
            WHEN LOWER(u.email) LIKE '%' || LOWER(SPLIT_PART(s.store_url, '.', 1)) || '%' THEN 'email_match'
            WHEN LOWER(u.user_name) LIKE '%' || LOWER(SPLIT_PART(s.store_url, '.', 1)) || '%' THEN 'username_match'
            WHEN LOWER(s.store_name) LIKE '%' || LOWER(SPLIT_PART(u.email, '@', 1)) || '%' THEN 'store_name_match'
            ELSE NULL
        END as match_type
    FROM stores s
    CROSS JOIN "user" u
    WHERE u.role = 'user' -- Only regular users, not admins
)
SELECT * FROM potential_links
WHERE match_type IS NOT NULL
ORDER BY store_url, email;

-- Step 1.3: AUTO-LINK based on exact store name match (safest approach)
-- This links users where their email prefix exactly matches the store prefix
-- Review the SELECT first, then run the INSERT if results look correct

-- PREVIEW ONLY - Review before inserting:
SELECT
    gen_random_uuid() as uuid,
    u.id as user_id,
    s.id as store_id,
    NOW() as created_at,
    -- Debug columns
    u.email,
    s.store_url
FROM stores s
JOIN "user" u ON LOWER(SPLIT_PART(s.store_url, '.', 1)) = LOWER(SPLIT_PART(u.email, '@', 1))
WHERE u.role = 'user'
AND NOT EXISTS (
    SELECT 1 FROM store_to_user stu
    WHERE stu.user_id = u.id AND stu.store_id = s.id
);

-- Step 1.4: EXECUTE - Uncomment and run after reviewing Step 1.3
/*
INSERT INTO store_to_user (uuid, user_id, store_id, created_at)
SELECT
    gen_random_uuid() as uuid,
    u.id as user_id,
    s.id as store_id,
    NOW() as created_at
FROM stores s
JOIN "user" u ON LOWER(SPLIT_PART(s.store_url, '.', 1)) = LOWER(SPLIT_PART(u.email, '@', 1))
WHERE u.role = 'user'
AND NOT EXISTS (
    SELECT 1 FROM store_to_user stu
    WHERE stu.user_id = u.id AND stu.store_id = s.id
);
*/

-- Step 1.5: MANUAL LINK - For stores that couldn't be auto-linked
-- Use this template to manually link specific users to stores:
/*
INSERT INTO store_to_user (uuid, user_id, store_id, created_at)
VALUES (
    gen_random_uuid(),
    'USER_UUID_HERE',
    'STORE_UUID_HERE',
    NOW()
);
*/

-- Step 1.6: Link all stores to admin users (admins should see all stores)
-- Preview first:
SELECT
    gen_random_uuid() as uuid,
    u.id as user_id,
    s.id as store_id,
    NOW() as created_at,
    u.email as admin_email,
    s.store_url
FROM stores s
CROSS JOIN "user" u
WHERE u.role = 'admin'
AND NOT EXISTS (
    SELECT 1 FROM store_to_user stu
    WHERE stu.user_id = u.id AND stu.store_id = s.id
);

-- Execute after review:
/*
INSERT INTO store_to_user (uuid, user_id, store_id, created_at)
SELECT
    gen_random_uuid() as uuid,
    u.id as user_id,
    s.id as store_id,
    NOW() as created_at
FROM stores s
CROSS JOIN "user" u
WHERE u.role = 'admin'
AND NOT EXISTS (
    SELECT 1 FROM store_to_user stu
    WHERE stu.user_id = u.id AND stu.store_id = s.id
);
*/


-- =====================================================
-- PART 2: REPAIR affiliates TABLE
-- =====================================================
-- Ensure all users have an affiliate record with proper status

-- Step 2.1: View users without affiliate records
SELECT u.id, u.email, u.role, u.created_at
FROM "user" u
LEFT JOIN affiliates a ON a.user_id = u.id
WHERE a.id IS NULL;

-- Step 2.2: Create affiliate records for users missing them
-- Preview first:
SELECT
    gen_random_uuid() as id,
    u.id as user_id,
    'Pending'::text as status,
    u.email,
    u.first_name as name,
    NOW() as created_at
FROM "user" u
LEFT JOIN affiliates a ON a.user_id = u.id
WHERE a.id IS NULL
AND u.role = 'user';

-- Execute after review:
/*
INSERT INTO affiliates (id, user_id, status, email, name, created_at)
SELECT
    gen_random_uuid() as id,
    u.id as user_id,
    'Pending'::text as status,
    u.email,
    u.first_name as name,
    NOW() as created_at
FROM "user" u
LEFT JOIN affiliates a ON a.user_id = u.id
WHERE a.id IS NULL
AND u.role = 'user';
*/


-- =====================================================
-- PART 3: DATA INTEGRITY CHECKS
-- =====================================================

-- Step 3.1: Find orphaned orders (orders without valid store)
SELECT COUNT(*) as orphaned_orders
FROM "order" o
WHERE NOT EXISTS (SELECT 1 FROM stores s WHERE s.store_url = o.store_url);

-- Step 3.2: Find orphaned inventory (inventory without valid store)
SELECT COUNT(*) as orphaned_inventory
FROM inventory i
WHERE NOT EXISTS (SELECT 1 FROM stores s WHERE s.store_url = i.store_url);

-- Step 3.3: Find orphaned order_items (items without valid order)
SELECT COUNT(*) as orphaned_order_items
FROM order_items oi
WHERE NOT EXISTS (SELECT 1 FROM "order" o WHERE o.order_id = oi.order_id);

-- Step 3.4: Find orphaned trackings (trackings without valid order)
SELECT COUNT(*) as orphaned_trackings
FROM trackings t
WHERE NOT EXISTS (SELECT 1 FROM "order" o WHERE o.order_id = t.order_id);


-- =====================================================
-- PART 4: ADD MISSING INDEXES (Performance)
-- =====================================================
-- These indexes will speed up common queries

-- Index for order queries by store
CREATE INDEX IF NOT EXISTS idx_order_store_url ON "order"(store_url);
CREATE INDEX IF NOT EXISTS idx_order_created_at ON "order"(created_at);
CREATE INDEX IF NOT EXISTS idx_order_store_date ON "order"(store_url, created_at);

-- Index for inventory queries
CREATE INDEX IF NOT EXISTS idx_inventory_store_url ON inventory(store_url);
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_variant_id ON inventory(variant_id);

-- Index for trackings queries
CREATE INDEX IF NOT EXISTS idx_trackings_store_url ON trackings(store_url);
CREATE INDEX IF NOT EXISTS idx_trackings_order_id ON trackings(order_id);

-- Index for order_items queries
CREATE INDEX IF NOT EXISTS idx_order_items_store_url ON order_items(store_url);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Index for store_to_user queries
CREATE INDEX IF NOT EXISTS idx_store_to_user_user_id ON store_to_user(user_id);
CREATE INDEX IF NOT EXISTS idx_store_to_user_store_id ON store_to_user(store_id);


-- =====================================================
-- PART 5: ADD UNIQUE CONSTRAINT FOR store_to_user
-- =====================================================
-- This prevents duplicate user-store links and enables proper upsert behavior

-- Check if constraint already exists:
SELECT constraint_name
FROM information_schema.table_constraints
WHERE table_name = 'store_to_user' AND constraint_type = 'UNIQUE';

-- Add unique constraint if it doesn't exist:
/*
ALTER TABLE store_to_user
ADD CONSTRAINT store_to_user_user_store_unique
UNIQUE (user_id, store_id);
*/


-- =====================================================
-- PART 6: RECREATE DATABASE VIEWS
-- =====================================================
-- These views are critical for the dashboard to display affiliate and referral data
-- NOTE: Views must be dropped in order due to dependencies

-- 6.0: Drop dependent views first (in correct order)
DROP VIEW IF EXISTS referral_summary CASCADE;
DROP VIEW IF EXISTS affiliate_setting_view CASCADE;

-- 6.1: Recreate referral_view with user info
DROP VIEW IF EXISTS referral_view CASCADE;

CREATE VIEW public.referral_view WITH (security_invoker = on) AS
SELECT
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
  COALESCE(acs.commission_method, 2) AS commission_method,
  COALESCE(acs.commission_rate, 0.01) AS commission_rate,
  acs.affiliate,
  acs.customer_id,
  afs.user_id,
  -- Affiliate user info (linked via affiliates table)
  COALESCE(
    NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''),
    u.user_name
  ) AS affiliate_name,
  u.email AS affiliate_email,
  u.first_name AS affiliate_first_name,
  u.last_name AS affiliate_last_name,
  CASE
    WHEN acs.commission_method = 1 THEN acs.commission_rate * r.quantity_of_order::numeric
    WHEN acs.commission_method = 2 THEN acs.commission_rate * r.invoice_total
    ELSE 0.01 * r.invoice_total
  END AS total_commission
FROM
  referrals r
  LEFT JOIN affiliate_customer_setting acs ON acs.affiliate = r.affiliate_id
    AND acs.customer_id = r.customer_number
  LEFT JOIN affiliates afs ON afs.affiliate_id = r.affiliate_id
  LEFT JOIN "user" u ON u.id = afs.user_id;

GRANT SELECT ON referral_view TO authenticated;

-- 6.2: Recreate payout_view
DROP VIEW IF EXISTS payout_view;

CREATE VIEW public.payout_view WITH (security_invoker = on) AS
SELECT
  p.user_id,
  u.email,
  p.status,
  SUM(p.amount) AS total_amount,
  COUNT(p.id) AS total_count
FROM payouts p
LEFT JOIN "user" u ON u.id = p.user_id
GROUP BY p.user_id, u.email, p.status;

GRANT SELECT ON payout_view TO authenticated;

-- 6.3: Recreate referral_summary view
DROP VIEW IF EXISTS referral_summary CASCADE;

CREATE VIEW public.referral_summary WITH (security_invoker = on) AS
SELECT
  rv.affiliate_id,
  rv.user_id,
  rv.affiliate_name,
  rv.affiliate_email,
  SUM(rv.total_commission) AS total_amount,
  COUNT(rv.id) AS count,
  SUM(rv.quantity_of_order) AS order_count,
  ARRAY_AGG(DISTINCT rv.customer_number) AS customer_ids
FROM referral_view rv
GROUP BY rv.affiliate_id, rv.user_id, rv.affiliate_name, rv.affiliate_email;

GRANT SELECT ON referral_summary TO authenticated;

-- 6.4: Recreate affiliate_setting_view (depends on referral_view)
DROP VIEW IF EXISTS affiliate_setting_view CASCADE;

CREATE VIEW public.affiliate_setting_view WITH (security_invoker = on) AS
SELECT
  affiliate_id,
  user_id,
  affiliate_name,
  affiliate_email,
  SUM(total_commission) AS total_amount,
  COUNT(id) AS count,
  SUM(quantity_of_order) AS order_count,
  commission_method,
  commission_rate,
  customer_number
FROM referral_view r
GROUP BY
  affiliate_id,
  customer_number,
  commission_method,
  commission_rate,
  user_id,
  affiliate_name,
  affiliate_email;

GRANT SELECT ON affiliate_setting_view TO authenticated;


-- =====================================================
-- PART 7: VERIFY REPAIRS
-- =====================================================

-- Run this after all repairs to verify the state:
SELECT
    'stores' as table_name, COUNT(*) as row_count FROM stores
UNION ALL
SELECT 'user', COUNT(*) FROM "user"
UNION ALL
SELECT 'store_to_user', COUNT(*) FROM store_to_user
UNION ALL
SELECT 'affiliates', COUNT(*) FROM affiliates
UNION ALL
SELECT 'order', COUNT(*) FROM "order"
UNION ALL
SELECT 'inventory', COUNT(*) FROM inventory;

-- Verify store_to_user links are working:
SELECT
    u.email,
    u.role,
    COUNT(stu.store_id) as linked_stores,
    STRING_AGG(s.store_name, ', ') as store_names
FROM "user" u
LEFT JOIN store_to_user stu ON stu.user_id = u.id
LEFT JOIN stores s ON s.id = stu.store_id
GROUP BY u.id, u.email, u.role
ORDER BY u.role, u.email;


-- =====================================================
-- PART 8: CREATE ADMIN USER (If none exists)
-- =====================================================
-- Only run this if you need to create an admin user

-- Check for existing admins:
SELECT id, email, role FROM "user" WHERE role = 'admin';

-- To create an admin user, first create them via Supabase Auth dashboard,
-- then run this to mark them as admin:
/*
UPDATE "user"
SET role = 'admin',
    visible_pages = ARRAY[
        '/home',
        '/manage-users',
        '/inventory',
        '/shipments',
        '/onboarding',
        '/affiliate-users',
        '/referrals',
        '/payouts',
        '/settings'
    ]
WHERE email = 'admin@example.com';
*/


-- =====================================================
-- END OF REPAIR SCRIPTS
-- =====================================================
