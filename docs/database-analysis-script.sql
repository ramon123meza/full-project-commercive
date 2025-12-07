-- ================================================================
-- COMMERCIVE DATABASE SCHEMA ANALYSIS SCRIPT
-- ================================================================
-- Run this script in the Supabase SQL Editor to get full database
-- schema information for documentation purposes.
-- ================================================================

-- ================================================================
-- PART 1: LIST ALL TABLES WITH ROW COUNTS
-- ================================================================
SELECT
    schemaname,
    tablename,
    n_live_tup AS estimated_row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ================================================================
-- PART 2: DETAILED TABLE STRUCTURE (ALL COLUMNS)
-- ================================================================
SELECT
    t.table_name,
    c.column_name,
    c.data_type,
    c.udt_name AS detailed_type,
    c.is_nullable,
    c.column_default,
    c.character_maximum_length,
    c.numeric_precision
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name, c.ordinal_position;

-- ================================================================
-- PART 3: PRIMARY KEYS
-- ================================================================
SELECT
    tc.table_name,
    kcu.column_name AS primary_key_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
    AND tc.constraint_type = 'PRIMARY KEY'
ORDER BY tc.table_name;

-- ================================================================
-- PART 4: FOREIGN KEY RELATIONSHIPS
-- ================================================================
SELECT
    tc.table_name AS source_table,
    kcu.column_name AS source_column,
    ccu.table_name AS target_table,
    ccu.column_name AS target_column,
    tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_schema = 'public'
    AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;

-- ================================================================
-- PART 5: UNIQUE CONSTRAINTS
-- ================================================================
SELECT
    tc.table_name,
    kcu.column_name AS unique_column,
    tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
    AND tc.constraint_type = 'UNIQUE'
ORDER BY tc.table_name;

-- ================================================================
-- PART 6: INDEXES
-- ================================================================
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ================================================================
-- PART 7: VIEWS
-- ================================================================
SELECT
    table_name AS view_name,
    view_definition
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- ================================================================
-- PART 8: ENUMS (Custom Types)
-- ================================================================
SELECT
    t.typname AS enum_name,
    e.enumlabel AS enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
ORDER BY t.typname, e.enumsortorder;

-- ================================================================
-- PART 9: ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================================
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ================================================================
-- PART 10: TRIGGERS
-- ================================================================
SELECT
    trigger_name,
    event_object_table AS table_name,
    event_manipulation AS trigger_event,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ================================================================
-- PART 11: FUNCTIONS (Stored Procedures)
-- ================================================================
SELECT
    routine_name,
    routine_type,
    data_type AS return_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- ================================================================
-- PART 12: SAMPLE DATA COUNTS FOR KEY TABLES
-- ================================================================
-- This helps understand which tables are actively used

-- User counts
SELECT 'user' AS table_name, COUNT(*) AS row_count FROM "user"
UNION ALL
SELECT 'admin' AS table_name, COUNT(*) AS row_count FROM "admin"
UNION ALL
SELECT 'affiliates' AS table_name, COUNT(*) AS row_count FROM "affiliates"
UNION ALL
SELECT 'stores' AS table_name, COUNT(*) AS row_count FROM "stores"
UNION ALL
SELECT 'store_to_user' AS table_name, COUNT(*) AS row_count FROM "store_to_user"
UNION ALL
SELECT 'order' AS table_name, COUNT(*) AS row_count FROM "order"
UNION ALL
SELECT 'order_items' AS table_name, COUNT(*) AS row_count FROM "order_items"
UNION ALL
SELECT 'inventory' AS table_name, COUNT(*) AS row_count FROM "inventory"
UNION ALL
SELECT 'trackings' AS table_name, COUNT(*) AS row_count FROM "trackings"
UNION ALL
SELECT 'referrals' AS table_name, COUNT(*) AS row_count FROM "referrals"
UNION ALL
SELECT 'payouts' AS table_name, COUNT(*) AS row_count FROM "payouts"
UNION ALL
SELECT 'session' AS table_name, COUNT(*) AS row_count FROM "session"
UNION ALL
SELECT 'webhooks' AS table_name, COUNT(*) AS row_count FROM "webhooks";

-- ================================================================
-- PART 13: ORDERS BY STORE (to see which stores have data)
-- ================================================================
SELECT
    store_url,
    COUNT(*) AS order_count,
    MIN(created_at) AS first_order,
    MAX(created_at) AS last_order
FROM "order"
GROUP BY store_url
ORDER BY order_count DESC;

-- ================================================================
-- PART 14: INVENTORY BY STORE
-- ================================================================
SELECT
    store_url,
    COUNT(*) AS inventory_items,
    COUNT(DISTINCT sku) AS unique_skus
FROM "inventory"
GROUP BY store_url
ORDER BY inventory_items DESC;

-- ================================================================
-- PART 15: STORE SYNC STATUS
-- ================================================================
SELECT
    id,
    store_name,
    store_url,
    is_inventory_fetched,
    is_store_listed,
    created_at
FROM "stores"
ORDER BY created_at DESC;

-- ================================================================
-- PART 16: USER-STORE RELATIONSHIPS
-- ================================================================
SELECT
    u.email,
    u.role,
    s.store_name,
    s.store_url,
    stu.created_at AS linked_at
FROM "store_to_user" stu
LEFT JOIN "user" u ON stu.user_id = u.id
LEFT JOIN "stores" s ON stu.store_id = s.id
ORDER BY stu.created_at DESC
LIMIT 50;

-- ================================================================
-- PART 17: CHECK FOR ORPHANED DATA
-- ================================================================

-- Orders without matching stores
SELECT
    'Orders without stores' AS issue,
    COUNT(*) AS count
FROM "order" o
WHERE NOT EXISTS (
    SELECT 1 FROM "stores" s
    WHERE s.store_url = o.store_url
);

-- Inventory without matching stores
SELECT
    'Inventory without stores' AS issue,
    COUNT(*) AS count
FROM "inventory" i
WHERE NOT EXISTS (
    SELECT 1 FROM "stores" s
    WHERE s.store_url = i.store_url
);

-- Trackings without matching orders
SELECT
    'Trackings without orders' AS issue,
    COUNT(*) AS count
FROM "trackings" t
WHERE NOT EXISTS (
    SELECT 1 FROM "order" o
    WHERE o.order_id = t.order_id
);

-- Store_to_user with missing users
SELECT
    'store_to_user without users' AS issue,
    COUNT(*) AS count
FROM "store_to_user" stu
WHERE NOT EXISTS (
    SELECT 1 FROM "user" u
    WHERE u.id = stu.user_id
);

-- Store_to_user with missing stores
SELECT
    'store_to_user without stores' AS issue,
    COUNT(*) AS count
FROM "store_to_user" stu
WHERE NOT EXISTS (
    SELECT 1 FROM "stores" s
    WHERE s.id = stu.store_id
);

-- ================================================================
-- PART 18: DATA FRESHNESS CHECK
-- ================================================================
SELECT
    'Last order created' AS metric,
    MAX(created_at)::text AS value
FROM "order"
UNION ALL
SELECT
    'Last inventory update' AS metric,
    MAX(updated_at)::text AS value
FROM "inventory"
UNION ALL
SELECT
    'Last tracking update' AS metric,
    MAX(updated_at)::text AS value
FROM "trackings"
UNION ALL
SELECT
    'Last webhook received' AS metric,
    MAX(created_at)::text AS value
FROM "webhooks";

-- ================================================================
-- END OF SCRIPT
-- ================================================================
-- Copy the results and share them so I can help document
-- the exact database structure and relationships.
-- ================================================================
