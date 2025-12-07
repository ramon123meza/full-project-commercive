# Database Inconsistencies and Recommendations

This document identifies potential issues in the database system that may affect data reliability and provides recommendations for fixing them.

---

## Critical Issues

### 1. SECURITY: Supabase Secret Key Logged to Console

**Location:** `commercive-app-v2-main/app/supabase.server.ts:6`

```typescript
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY!;
console.log(SUPABASE_SECRET_KEY);  // CRITICAL SECURITY ISSUE
```

**Impact:**
- Service role key exposed in server logs
- Full database access if logs are compromised
- Visible in Vercel deployment logs, monitoring systems

**Recommendation:**
- **IMMEDIATELY DELETE** this console.log statement
- Rotate the Supabase service role key after removal
- Audit logs for any exposure

---

### 2. BUG: Backorder Counter Not Incrementing Correctly

**Location:** `commercive-app-v2-main/app/utils/supabaseHelpers.tsx:283`

```typescript
// Current (BUGGY):
const updatedBackOrders = inventoryData.back_orders || 0 + 1;

// Due to operator precedence, this evaluates as:
// inventoryData.back_orders || (0 + 1)
// Which means: if back_orders is truthy, use it; otherwise use 1
// It does NOT increment!

// Should be:
const updatedBackOrders = (inventoryData.back_orders || 0) + 1;
```

**Impact:**
- Backorder counts are never incremented properly
- Dashboard shows incorrect backorder data

**Recommendation:**
- Fix the operator precedence with parentheses
- Review all backorder counts in database for accuracy

---

### 3. Hardcoded Redis Credentials in Code

**Location:** `commercive-app-v2-main/app/utils/supabaseHelpers.tsx:6-11`

```typescript
// const redis = new Redis({
//   host: "redis-12100.c323.us-east-1-2.ec2.redns.redis-cloud.com",
//   port: 12100,
//   password: "LuMF0crKnoynhQjpA6qaJrdwfYMSP6hS",  // EXPOSED CREDENTIAL!
//   username: "default",
// });
```

**Impact:**
- Even though commented out, credentials are in version control
- Anyone with repo access can see the Redis password

**Recommendation:**
- Remove commented code entirely
- Rotate the Redis password
- Use environment variables for any future Redis configuration

---

## Database Schema Issues

### 4. Missing Foreign Key Constraints

Many tables use `store_url` as a linking field but **lack foreign key constraints**:

| Table | Column | Should Reference |
|-------|--------|------------------|
| `order` | `store_url` | `stores.store_url` |
| `order_items` | `store_url` | `stores.store_url` |
| `inventory` | `store_url` | `stores.store_url` |
| `trackings` | `store_url` | `stores.store_url` |
| `webhooks` | `store_url` | `stores.store_url` |
| `issues` | `store_url` | `stores.store_url` |

**Impact:**
- Orphaned data when stores are deleted
- No referential integrity enforcement
- Data inconsistencies possible

**Recommendation:**
Add foreign key constraints:

```sql
ALTER TABLE "order"
ADD CONSTRAINT order_store_url_fkey
FOREIGN KEY (store_url) REFERENCES stores(store_url)
ON DELETE CASCADE;

-- Repeat for other tables
```

---

### 5. Missing Foreign Key: order_items → order

**Issue:** `order_items.order_id` should reference `order.order_id` but no FK exists.

```sql
-- The table has this UPSERT conflict:
.upsert(lineItemData, { onConflict: "order_id,product_id" })

-- But there's no composite unique constraint on (order_id, product_id)
-- This may cause upsert failures
```

**Impact:**
- Line items can exist without parent order
- Upsert may not work as expected

**Recommendation:**
```sql
-- Add composite unique constraint
ALTER TABLE order_items
ADD CONSTRAINT order_items_order_product_unique
UNIQUE (order_id, product_id);

-- Add foreign key
ALTER TABLE order_items
ADD CONSTRAINT order_items_order_id_fkey
FOREIGN KEY (order_id) REFERENCES "order"(order_id)
ON DELETE CASCADE;
```

---

### 6. Schema Drift Between Apps

The `database.types.ts` files in both projects are slightly different:

**Dashboard has additional fields in `affiliates`:**
- `auto_payout_enabled`
- `preferred_payment_method`
- `payment_method_details`

**Dashboard has additional fields in `referrals`:**
- `business_type`
- `client_country`
- `client_group`
- `client_niche`

**Dashboard has additional enum value:**
- `AFFILIATE_STATUS`: Includes "Completed" (dashboard) vs. missing in app

**Impact:**
- Type mismatches could cause runtime errors
- Data written by one app may not be readable by another

**Recommendation:**
- Regenerate `database.types.ts` in both projects from same source:
  ```bash
  npx supabase gen types typescript --project-id <your-project-id> > database.types.ts
  ```
- Keep both files in sync

---

### 7. Inconsistent ID Types

Some tables use inconsistent ID types:

| Table | ID Column | Type |
|-------|-----------|------|
| `order` | `id` | UUID (string) |
| `order` | `order_id` | number |
| `inventory` | `inventory_id` | string (Shopify GID) |
| `stores` | `id` | UUID (string) |
| `user` | `id` | UUID (string) |

**Issue:** `order_id` is `number` but `inventory.product_id` is `string`.

**Impact:**
- Joins between tables may require type casting
- Potential comparison issues

**Recommendation:**
- Document the expected types clearly
- Consider normalizing to consistent types in future schema updates

---

## Data Integrity Issues

### 8. Potential Orphaned Data

Run the SQL script in `database-analysis-script.sql` (Parts 17-18) to check for:

| Check | Issue |
|-------|-------|
| Orders without stores | Orders exist for stores not in `stores` table |
| Inventory without stores | Inventory for unknown stores |
| Trackings without orders | Tracking records with no matching order |
| store_to_user orphans | Links to deleted users or stores |

**Recommendation:**
- Run orphan detection queries periodically
- Implement cleanup jobs or cascade deletes
- Add foreign key constraints to prevent future orphans

---

### 9. inventory_level JSON Structure Variations

The `inventory.inventory_level` field stores JSON with varying structures:

**From initial sync (GraphQL):**
```json
{
  "edges": [
    {
      "node": {
        "quantities": [
          { "name": "available", "quantity": 100 },
          { "name": "committed", "quantity": 5 }
        ]
      }
    }
  ]
}
```

**From webhooks:**
```json
[
  {
    "node": {
      "quantities": [
        { "name": "available", "quantity": 100 }
      ]
    }
  }
]
```

**Impact:**
- Dashboard code must handle both formats
- Inconsistent parsing logic

**Recommendation:**
- Normalize to consistent structure during save
- Update transformation functions to always produce same format

---

### 10. No Soft Delete for Stores

When a store uninstalls the app, there's no clear data retention policy.

**Current behavior:**
- Session is deleted (handled by `webhooks.app.uninstalled.tsx`)
- Store data (orders, inventory) remains

**Impact:**
- Dashboard may show stale data for uninstalled stores
- Users may see stores they can no longer access

**Recommendation:**
- Add `is_active` or `uninstalled_at` flag to `stores` table
- Update dashboard to filter inactive stores
- Consider data retention policy (archive after X days)

---

## Performance Concerns

### 11. No Indexes on Frequently Queried Columns

Common queries filter by `store_url` and date ranges, but indexes may be missing:

```sql
-- These queries are common but may be slow without indexes:
SELECT * FROM "order" WHERE store_url = ? AND created_at > ?;
SELECT * FROM inventory WHERE store_url = ?;
SELECT * FROM trackings WHERE store_url = ?;
```

**Recommendation:**
```sql
CREATE INDEX idx_order_store_url ON "order"(store_url);
CREATE INDEX idx_order_created_at ON "order"(created_at);
CREATE INDEX idx_order_store_date ON "order"(store_url, created_at);

CREATE INDEX idx_inventory_store_url ON inventory(store_url);
CREATE INDEX idx_trackings_store_url ON trackings(store_url);
```

---

### 12. No Pagination in Initial Sync

**Location:** `commercive-app-v2-main/app/routes/app._index.tsx`

The initial data fetch uses pagination (good), but saves all records in one batch:

```typescript
const inventoryData = await fetchAllInventoryLevels(admin);
// This could return 10,000+ records
await saveInventoryDataToSupabase(transformedInventory);
// Single INSERT with all records
```

**Impact:**
- Large stores may timeout during initial sync
- Memory issues with large datasets

**Recommendation:**
- Save in batches of 100-500 records
- Add progress tracking for large syncs

---

## Webhook Processing Issues

### 13. Webhook Error Handling Returns 200

**Location:** `commercive-app-v2-main/app/routes/webhooks.tsx:288`

```typescript
} catch (processingError) {
  console.error(`❌ Error processing webhook ${topic}:`, processingError);
  // Log the error but still return 200 to prevent Shopify from retrying
}
return new Response("Webhook processed successfully", { status: 200 });
```

**Impact:**
- Failed webhooks are not retried
- Data loss if processing fails
- No alerting on failures

**Recommendation:**
- Implement a dead-letter queue for failed webhooks
- Return 500 for retriable errors, 200 for permanent failures
- Add monitoring/alerting for webhook failures

---

### 14. No Webhook Deduplication

**Issue:** If Shopify sends the same webhook twice (which can happen), it will be processed twice.

**Current mitigation:** UPSERT with conflict resolution

**Potential issue:** Side effects (like backorder increment) may run multiple times.

**Recommendation:**
- Track processed webhook IDs in database
- Skip processing if webhook ID already handled
- Example:
  ```typescript
  const webhookId = request.headers.get("X-Shopify-Webhook-Id");
  const { data: existing } = await supabase
    .from("processed_webhooks")
    .select("id")
    .eq("webhook_id", webhookId)
    .single();

  if (existing) {
    return new Response("Already processed", { status: 200 });
  }
  ```

---

## Authorization Issues

### 15. store_to_user Not Validated in All Queries

**Issue:** Some dashboard queries may not properly filter by user's allowed stores.

**Example concern:**
```typescript
// If selectedStore is somehow set to a store the user shouldn't access...
const { data } = await supabase
  .from("order")
  .select("*")
  .eq("store_url", selectedStore.store_url);
// No verification that user has access to this store
```

**Recommendation:**
- Add Row Level Security (RLS) policies in Supabase
- Or validate store access in every query:
  ```typescript
  // First verify user has access
  const { data: hasAccess } = await supabase
    .from("store_to_user")
    .select("id")
    .eq("user_id", userId)
    .eq("store_id", storeId)
    .single();

  if (!hasAccess && userRole !== 'admin') {
    throw new Error("Unauthorized");
  }
  ```

---

## Summary of Required Fixes

### Immediate (Critical)

| Issue | Location | Action |
|-------|----------|--------|
| Secret key logging | `supabase.server.ts:6` | Delete line, rotate key |
| Backorder bug | `supabaseHelpers.tsx:283` | Add parentheses |
| Redis credentials | `supabaseHelpers.tsx:6-11` | Remove commented code |

### Short-term (High Priority)

| Issue | Action |
|-------|--------|
| Missing FK constraints | Add foreign keys to schema |
| Schema drift | Regenerate types from Supabase |
| order_items constraint | Add composite unique constraint |

### Medium-term (Recommended)

| Issue | Action |
|-------|--------|
| Add indexes | Create indexes on frequently queried columns |
| Store soft delete | Add `is_active` flag |
| Webhook deduplication | Track processed webhook IDs |
| Batch saves | Implement batched inserts for large datasets |

### Long-term (Best Practices)

| Issue | Action |
|-------|--------|
| RLS policies | Implement Row Level Security |
| Monitoring | Add webhook failure alerting |
| Data cleanup | Implement orphan data cleanup jobs |
| Type normalization | Standardize ID types across tables |

---

## Verification Script

Run in Supabase SQL Editor to check current data integrity:

```sql
-- Check for orphaned orders
SELECT COUNT(*) AS orphaned_orders
FROM "order" o
WHERE NOT EXISTS (SELECT 1 FROM stores s WHERE s.store_url = o.store_url);

-- Check for orphaned inventory
SELECT COUNT(*) AS orphaned_inventory
FROM inventory i
WHERE NOT EXISTS (SELECT 1 FROM stores s WHERE s.store_url = i.store_url);

-- Check store_to_user integrity
SELECT COUNT(*) AS orphaned_user_links
FROM store_to_user stu
WHERE NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id = stu.user_id);

SELECT COUNT(*) AS orphaned_store_links
FROM store_to_user stu
WHERE NOT EXISTS (SELECT 1 FROM stores s WHERE s.id = stu.store_id);

-- Check data freshness
SELECT
    'Last order' AS metric,
    MAX(created_at) AS timestamp
FROM "order"
UNION ALL
SELECT
    'Last inventory update' AS metric,
    MAX(created_at) AS timestamp
FROM inventory
UNION ALL
SELECT
    'Last webhook' AS metric,
    MAX(created_at) AS timestamp
FROM webhooks;
```

See `database-analysis-script.sql` for the full diagnostic script.
