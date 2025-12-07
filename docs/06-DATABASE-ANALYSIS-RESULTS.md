# Database Analysis Results

This document contains the analysis of the live database based on the SQL query results.

---

## Summary

| Finding | Severity | Impact |
|---------|----------|--------|
| `store_to_user` table has 0 rows | **CRITICAL** | Users cannot be linked to stores |
| `admin` table has 0 rows | **HIGH** | Admin role relies only on `user.role` field |
| `inventory` table lacks `updated_at` column | **MEDIUM** | Cannot track when inventory was last updated |
| Several stores have 0 unique SKUs | **LOW** | May indicate incomplete inventory sync |
| Data is actively flowing (orders up to today) | **GOOD** | System is working for order sync |

---

## Row Counts by Table

| Table | Row Count | Assessment |
|-------|-----------|------------|
| `user` | 49 | Normal |
| `admin` | **0** | **ISSUE: No admin records** |
| `affiliates` | 11 | Normal |
| `stores` | 72 | Normal |
| `store_to_user` | **0** | **CRITICAL: No user-store links!** |
| `order` | 1,691 | Active |
| `order_items` | 2,281 | Active |
| `inventory` | 3,553 | Active |
| `trackings` | 1,018 | Active |
| `referrals` | 257 | Active |
| `payouts` | 0 | No payouts processed yet |
| `session` | 103 | Active Shopify sessions |
| `webhooks` | 8,181 | Very active webhook logging |

---

## CRITICAL ISSUE #1: `store_to_user` Table is Empty

### The Problem

The `store_to_user` junction table, which links users to stores, has **0 rows**.

```
store_to_user: 0 rows
```

### Expected Behavior

When a store installs the Commercive app, the `createDashboardUser.ts` function should:
1. Create a user in the `user` table
2. Create a store in the `stores` table
3. Create a link in `store_to_user` table

### Impact

- **Dashboard cannot show store data to users** - The StoreContext queries `store_to_user` to find which stores a user can access
- **Users see "no stores" error** - Even if they should have access
- **Admin role bypass** - Admins might still work because they fetch all stores

### Code Reference

**File:** `commercive-app-v2-main/app/utils/createDashboardUser.ts`

```typescript
// This code SHOULD create the link:
const storeToUserResult = await supabase.from("store_to_user").insert({
  user_id: userId,
  store_id: storeId,
  uuid: uuidv4(),
});
```

### Possible Causes

1. **Store creation fails before store_to_user insert** - If the store upsert fails, the store_id won't exist
2. **User creation fails** - If Supabase auth or user table insert fails
3. **Silent error** - The insert might be failing but not throwing an error
4. **Race condition** - The user might be created before the store exists
5. **Data was deleted** - Someone may have truncated this table

### Recommended Fix

1. Add logging/error handling to `createDashboardUser.ts`:
   ```typescript
   const { data: linkData, error: linkError } = await supabase
     .from("store_to_user")
     .insert({ user_id, store_id, uuid: uuidv4() });

   if (linkError) {
     console.error("Failed to link user to store:", linkError);
     throw linkError; // Make it visible
   }
   console.log("Successfully linked user to store:", linkData);
   ```

2. Manually verify the function is being called (add logging)

3. Run a repair script to link existing users to stores based on email patterns

---

## CRITICAL ISSUE #2: `admin` Table is Empty

### The Problem

```
admin: 0 rows
```

### Assessment

This might be **by design** - the system appears to use `user.role = 'admin'` instead of the `admin` table.

**Evidence:**
- Dashboard checks `userinfo?.role === "admin"` (from `user` table)
- The `admin` table has a foreign key to `user` but no data

### Current Behavior

Admin access is determined by the `role` field in the `user` table, not the `admin` table.

### Recommendation

Either:
1. **Remove the `admin` table** if it's not used
2. **Populate it** with admin users for additional validation
3. **Document** that admin role comes from `user.role` field

---

## Foreign Key Relationships (Verified)

These relationships exist and are enforced:

| Source Table | Column | Target Table | Column |
|--------------|--------|--------------|--------|
| `admin` | `user_id` | `user` | `id` |
| `affiliates` | `store_url` | `stores` | `store_url` |
| `affiliates` | `user_id` | `user` | `id` |
| `issues` | `user_id` | `user` | `id` |
| `payouts` | `store_url` | `stores` | `store_url` |
| `payouts` | `user_id` | `user` | `id` |
| `store_to_user` | `user_id` | `user` | `id` |
| `store_to_user` | `store_id` | `stores` | `id` |
| `trackings` | `order_id` | `order` | `order_id` |

### Missing Foreign Keys (Not Enforced)

These columns reference other tables but have no FK constraint:

| Table | Column | Should Reference |
|-------|--------|------------------|
| `order` | `store_url` | `stores.store_url` |
| `order_items` | `order_id` | `order.order_id` |
| `order_items` | `store_url` | `stores.store_url` |
| `inventory` | `store_url` | `stores.store_url` |
| `webhooks` | `store_url` | `stores.store_url` |

---

## Schema Discovery: Missing Columns

### `inventory` Table

The query for Part 18 failed because:
```
Error: column "updated_at" does not exist
HINT: Perhaps you meant to reference the column "inventory.created_at".
```

**Finding:** The `inventory` table has `created_at` but NOT `updated_at`.

**Impact:**
- Cannot track when inventory was last updated
- Dashboard may show stale data without knowing it
- The `database.types.ts` file may be out of sync

**Recommendation:**
Add `updated_at` column to inventory table:
```sql
ALTER TABLE inventory
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create trigger to auto-update
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_inventory_modtime
    BEFORE UPDATE ON inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
```

---

## Active Stores Analysis

### Orders by Store (Top 10)

| Store URL | Order Count | Last Order |
|-----------|-------------|------------|
| kbfpan-fw.myshopify.com | 369 | Oct 28, 2025 |
| xjnyz0-2x.myshopify.com | 250 | Sep 12, 2025 |
| simple-guy-development-store.myshopify.com | 225 | **Dec 7, 2025** (today) |
| n06t1a-m8.myshopify.com | 221 | **Dec 7, 2025** (today) |
| wctwuq-hs.myshopify.com | 201 | Dec 6, 2025 |
| pehc6p-8c.myshopify.com | 116 | **Dec 7, 2025** (today) |
| 6dd1xd-28.myshopify.com | 46 | Nov 17, 2025 |
| huz0kz-t0.myshopify.com | 40 | Aug 18, 2025 |
| greebie.myshopify.com | 34 | Nov 25, 2025 |
| for-commercive.myshopify.com | 32 | Oct 15, 2025 |

**Key Finding:** Data is actively flowing - several stores have orders from today (Dec 7, 2025).

### Stores with Inventory Issues

Some stores have inventory items but 0 unique SKUs:

| Store URL | Inventory Items | Unique SKUs |
|-----------|-----------------|-------------|
| moissanitekingdevelopment.myshopify.com | 200 | **0** |
| xjnyz0-2x.myshopify.com | 131 | **0** |
| x8h1va-89.myshopify.com | 37 | **0** |
| sifgpr-aa.myshopify.com | 35 | **0** |
| k2c0xz-4u.myshopify.com | 30 | **0** |
| crb4gg-bt.myshopify.com | 29 | **0** |

**Possible Causes:**
- Products were created without SKUs in Shopify
- Inventory sync didn't capture SKU data
- Webhook transformation lost SKU field

---

## Orphan Data Check

The Part 17 query only returned one result (Supabase ran queries separately):

```json
{
  "issue": "store_to_user without stores",
  "count": 0
}
```

### Run These Queries Separately

To get full orphan check results, run each query individually in Supabase SQL Editor:

```sql
-- 1. Orders without matching stores
SELECT 'Orders without stores' AS issue, COUNT(*) AS count
FROM "order" o
WHERE NOT EXISTS (SELECT 1 FROM stores s WHERE s.store_url = o.store_url);

-- 2. Inventory without matching stores
SELECT 'Inventory without stores' AS issue, COUNT(*) AS count
FROM inventory i
WHERE NOT EXISTS (SELECT 1 FROM stores s WHERE s.store_url = i.store_url);

-- 3. Trackings without matching orders
SELECT 'Trackings without orders' AS issue, COUNT(*) AS count
FROM trackings t
WHERE NOT EXISTS (SELECT 1 FROM "order" o WHERE o.order_id = t.order_id);

-- 4. store_to_user with missing users
SELECT 'store_to_user without users' AS issue, COUNT(*) AS count
FROM store_to_user stu
WHERE NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id = stu.user_id);

-- 5. store_to_user with missing stores
SELECT 'store_to_user without stores' AS issue, COUNT(*) AS count
FROM store_to_user stu
WHERE NOT EXISTS (SELECT 1 FROM stores s WHERE s.id = stu.store_id);
```

---

## Data Freshness

### Corrected Query (without inventory.updated_at)

Run this to check data freshness:

```sql
SELECT 'Last order created' AS metric, MAX(created_at)::text AS value FROM "order"
UNION ALL
SELECT 'Last tracking created' AS metric, MAX(created_at)::text AS value FROM trackings
UNION ALL
SELECT 'Last webhook received' AS metric, MAX(created_at)::text AS value FROM webhooks;
```

Based on the orders data, the system is actively receiving data as of **December 7, 2025**.

---

## Conclusions

### Database Health

| Aspect | Status |
|--------|--------|
| Order sync | **Working** - Orders flowing today |
| Inventory sync | **Working** - Data present |
| Tracking sync | **Working** - 1,018 records |
| Webhook logging | **Working** - 8,181 records |
| User-Store linking | **BROKEN** - 0 records |
| Admin table | **Unused** - 0 records |

### Root Cause of Dashboard Issues

The **empty `store_to_user` table** is likely the primary cause of any issues where:
- Users can't see their store data
- Dashboard shows "no stores available"
- Affiliates can't access their assigned stores

### Immediate Actions Required

1. **Investigate why `store_to_user` is empty**
   - Check `createDashboardUser.ts` for errors
   - Add logging to track the flow
   - Check if there are errors in Vercel logs

2. **Create manual links for existing data**
   - Match users to stores based on email patterns
   - Create `store_to_user` records

3. **Add `updated_at` to inventory table**
   - Enables tracking of data freshness

4. **Run individual orphan data queries**
   - Determine if there's orphaned data

---

## Repair Script (To Link Users to Stores)

If needed, this script can help repair the `store_to_user` table based on patterns:

```sql
-- Find users who should be linked to stores
-- (This assumes email domain matches store URL)
INSERT INTO store_to_user (uuid, user_id, store_id, created_at)
SELECT
    gen_random_uuid()::text,
    u.id,
    s.id,
    NOW()
FROM "user" u
CROSS JOIN stores s
WHERE
    -- Match based on some criteria (adjust as needed)
    u.email LIKE '%' || REPLACE(s.store_url, '.myshopify.com', '') || '%'
    AND NOT EXISTS (
        SELECT 1 FROM store_to_user stu
        WHERE stu.user_id = u.id AND stu.store_id = s.id
    )
ON CONFLICT DO NOTHING;
```

**Note:** Review the results before running any repair script.
