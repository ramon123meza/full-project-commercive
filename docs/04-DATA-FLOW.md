# Data Flow Documentation

## Overview

This document explains how data flows from Shopify stores to the dashboard, confirming the assumption that:

> **Once a store installs the Commercive app, the data such as orders, inventory, etc. will be fetched by the app and that data will feed the dashboard app.**

**This assumption is CORRECT.** The system works as follows:

1. Store installs Shopify App → Initial data sync
2. Shopify sends webhooks on changes → App processes and saves to Supabase
3. Dashboard queries Supabase → Displays data to users

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           SHOPIFY STORE                                  │
│                                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │  Orders  │  │Inventory │  │Fulfillment│  │ Products │               │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘               │
│       │             │             │             │                       │
└───────┼─────────────┼─────────────┼─────────────┼───────────────────────┘
        │             │             │             │
        │ Webhooks    │ Webhooks    │ Webhooks    │ Webhooks
        ▼             ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     COMMERCIVE SHOPIFY APP                               │
│                     (app.commercive.co)                                  │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    /webhooks endpoint                            │   │
│  │                                                                   │   │
│  │  ORDERS_CREATE/UPDATED ──► transformOrderData() ──────────────┐  │   │
│  │  FULFILLMENTS_CREATE/UPDATE ──► transformFulfillmentData() ──►│  │   │
│  │  INVENTORY_LEVELS_UPDATE ──► transformInventoryLevelData() ──►│  │   │
│  │  PRODUCTS_CREATE/UPDATE ──► fetch inventory ──────────────────►│  │   │
│  │                                                    │            │   │
│  │                                                    ▼            │   │
│  │                                          saveToSupabase()       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     │ UPSERT Operations
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           SUPABASE DATABASE                              │
│                                                                          │
│   ┌──────────┐  ┌──────────────┐  ┌───────────┐  ┌───────────┐        │
│   │  order   │  │ order_items  │  │ inventory │  │ trackings │        │
│   └──────────┘  └──────────────┘  └───────────┘  └───────────┘        │
│   ┌──────────┐  ┌──────────────┐  ┌───────────┐  ┌───────────┐        │
│   │  stores  │  │store_to_user │  │   user    │  │ webhooks  │        │
│   └──────────┘  └──────────────┘  └───────────┘  └───────────┘        │
│                                                                          │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     │ SELECT Operations
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      COMMERCIVE DASHBOARD                                │
│                      (dashboard.commercive.co)                           │
│                                                                          │
│   ┌───────────────────────────────────────────────────────────────────┐ │
│   │                     StoreContext                                   │ │
│   │                                                                     │ │
│   │   selectedStore: { store_url: "example.myshopify.com" }           │ │
│   │                        │                                           │ │
│   │                        ▼                                           │ │
│   │   supabase.from("order").select("*").eq("store_url", storeUrl)    │ │
│   │   supabase.from("inventory").select("*").eq("store_url", storeUrl)│ │
│   │   supabase.from("trackings").select("*").eq("store_url", storeUrl)│ │
│   │                                                                     │ │
│   └───────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│   │  Home Page  │  │  Inventory  │  │  Shipments  │  │   Admin     │   │
│   │  (Charts)   │  │  (Stock)    │  │  (Tracking) │  │  (Users)    │   │
│   └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Initial Data Sync (App Installation)

When a store installs the Commercive Shopify app, the following occurs:

### 1. OAuth Authentication
```
Store Admin clicks "Install" in Shopify App Store
    ↓
OAuth flow redirects to /auth/callback
    ↓
Access token stored in "session" table (Prisma)
    ↓
afterAuth hook triggers
```

### 2. User Creation (afterAuth hook)
**File:** `commercive-app-v2-main/app/shopify.server.ts`

```typescript
afterAuth: async ({ session, admin }) => {
  // 1. Fetch shop info
  const storeData = await admin.graphql(storeInfoQuery);

  // 2. Create dashboard user
  await createDashboardUser({
    shop: session.shop,
    email: storeData.shop.email,
    storeName: storeData.shop.name,
    // ...
  });
}
```

**File:** `commercive-app-v2-main/app/utils/createDashboardUser.ts`

```typescript
// Creates:
// 1. Supabase Auth user
// 2. "user" table record
// 3. "stores" table record (upsert)
// 4. "store_to_user" junction record
// 5. "affiliates" record with status "Pending"
```

### 3. Initial Data Fetch
**File:** `commercive-app-v2-main/app/routes/app._index.tsx` (loader)

```typescript
// Check if inventory already synced
const inventoryFetched = await isInventoryFetched(storeUrl);

if (!inventoryFetched) {
  // Fetch ALL inventory from Shopify
  const inventoryData = await fetchAllInventoryLevels(admin);
  await saveInventoryDataToSupabase(transformedInventory);

  // Mark as synced
  await setInventoryFetched({ storeName, storeUrl });
}

// Fetch ALL orders
const orders = await fetchAllOrders(admin);
await saveOrdersToSupabase(transformedOrders);

// Fetch ALL fulfillments
const fulfillments = await fetchAllFulfillments(admin);
await saveFulfillmentDataToSupabase(transformedFulfillments);
```

---

## Ongoing Data Sync (Webhooks)

After initial sync, data is kept up-to-date via Shopify webhooks.

### Webhook Registration
**File:** `commercive-app-v2-main/app/shopify.server.ts`

```typescript
webhooks: {
  ORDERS_CREATE: { deliveryMethod: DeliveryMethod.Http, callbackUrl: "/webhooks" },
  ORDERS_UPDATED: { deliveryMethod: DeliveryMethod.Http, callbackUrl: "/webhooks" },
  FULFILLMENTS_CREATE: { deliveryMethod: DeliveryMethod.Http, callbackUrl: "/webhooks" },
  FULFILLMENTS_UPDATE: { deliveryMethod: DeliveryMethod.Http, callbackUrl: "/webhooks" },
  INVENTORY_LEVELS_UPDATE: { deliveryMethod: DeliveryMethod.Http, callbackUrl: "/webhooks" },
  // ... more webhooks
}
```

### Webhook Processing
**File:** `commercive-app-v2-main/app/routes/webhooks.tsx`

| Webhook Topic | Processing | Database Table |
|---------------|------------|----------------|
| `ORDERS_CREATE` | Transform order data | `order`, `order_items` |
| `ORDERS_UPDATED` | Update existing order | `order`, `order_items` |
| `FULFILLMENTS_CREATE` | Transform fulfillment | `trackings` |
| `FULFILLMENTS_UPDATE` | Update tracking info | `trackings` |
| `INVENTORY_LEVELS_UPDATE` | Fetch full item, transform | `inventory` |
| `INVENTORY_ITEMS_CREATE` | Fetch full item, transform | `inventory` |
| `INVENTORY_ITEMS_UPDATE` | Fetch full item, transform | `inventory` |
| `INVENTORY_ITEMS_DELETE` | Delete record | `inventory` |
| `PRODUCTS_CREATE` | Update inventory per variant | `inventory` |
| `PRODUCTS_UPDATE` | Update inventory per variant | `inventory` |
| `PRODUCTS_DELETE` | Delete inventory records | `inventory` |

### Order Webhook Flow

```
Shopify: New order placed
    ↓
POST /webhooks (topic: ORDERS_CREATE)
    ↓
authenticate.webhook(request) → validates HMAC
    ↓
Get store info via GraphQL
    ↓
Log webhook to "webhooks" table
    ↓
transformOrderData(payload, storeUrl)
    - Extract order_id, order_number, totals
    - Convert currency to USD if needed
    - Format shipping address
    ↓
saveOrdersToSupabase([orderData])
    - UPSERT with conflict on "order_id"
    ↓
transformLineItemsData(payload, storeUrl)
    - Extract product_id, sku, quantity, price
    ↓
saveLineItemsToSupabase(lineItemData)
    - UPSERT with conflict on "order_id,product_id"
    ↓
saveBackorderDataToSupabase(lineItems, order_id)
    - Check if available quantity < 1
    - Increment back_orders count
    ↓
Return 200 OK
```

### Inventory Webhook Flow

```
Shopify: Inventory quantity changed
    ↓
POST /webhooks (topic: INVENTORY_LEVELS_UPDATE)
    ↓
Payload contains: inventory_item_id, available quantity
    ↓
Fetch full inventory item via GraphQL
    query inventoryItemById($id: ID!) {
      inventoryItem(id: $id) {
        id, sku, variant { title, product { title, images } }
        inventoryLevels { quantities { name, quantity } }
      }
    }
    ↓
transformInventoryLevelWebhookData(item, storeUrl)
    - Extract inventory_id, sku, product_name
    - Format inventory_level JSON
    ↓
saveInventoryDataToSupabase([transformedData])
    - UPSERT with conflict on "inventory_id"
    ↓
Return 200 OK
```

---

## Dashboard Data Retrieval

### Store Context
**File:** `dashboard-commercive-main/src/context/StoreContext.tsx`

```typescript
// On load, fetch user's assigned stores
const { data: storeData } = await supabase
  .from("store_to_user")
  .select("*, stores(*)")
  .eq("user_id", user.id);

// User selects a store
setSelectedStore(store);

// Selected store persisted to:
// 1. localStorage (immediate)
// 2. DynamoDB via Lambda (cross-device)
```

### Data Queries by Page

#### Home Dashboard
**File:** `dashboard-commercive-main/src/app/(authentificated)/home/page.tsx`

```typescript
// Orders for selected store within date range
const { data: ordersRes } = await supabase
  .from("order")
  .select("*")
  .gte("created_at", startDate)
  .lte("created_at", endDate)
  .eq("store_url", storeUrl)
  .eq("financial_status", "paid");

// Calculate KPIs
const totalSales = orders.reduce((sum, o) => sum + parseFloat(o.sub_total_price), 0);
const fulfilledOrders = orders.filter(o => o.fulfillment_status === "fulfilled");
```

#### Inventory Page
**File:** `dashboard-commercive-main/src/app/(authentificated)/inventory/page.tsx`

```typescript
const { data } = await supabase
  .from("inventory")
  .select("*")
  .eq("store_url", storeUrl);

// Calculate stock meters from inventory_level JSON
const stockMeter = item.inventory_level?.quantities
  ?.find(q => q.name === "available")?.quantity || 0;
```

#### Shipments Page
**File:** `dashboard-commercive-main/src/app/(authentificated)/shipments/page.tsx`

```typescript
const { data: trackings } = await supabase
  .from("trackings")
  .select("*, order(*)")
  .eq("store_url", storeUrl);

// Join with order data for display
```

#### Forecast API
**File:** `dashboard-commercive-main/src/app/api/forecast/route.ts`

```typescript
// Fetch orders from last 30 days for sales velocity
const { data: orders } = await supabase
  .from("order_items")
  .select("*")
  .eq("store_url", storeUrl)
  .gte("created_at", thirtyDaysAgo);

// Calculate daily sales rate per SKU
// Generate reorder suggestions
```

---

## Data Transformation Details

### Order Data Transformation
**File:** `commercive-app-v2-main/app/utils/transformDataHelpers.tsx`

```typescript
export async function transformOrderData(payload: Payload, storeUrl: string) {
  // Currency conversion if not USD
  let conversionRate = 1;
  if (payload.currency !== "USD") {
    conversionRate = await getConversionRate(payload.currency);
  }

  return {
    order_id: payload.id,
    order_number: payload.order_number,
    store_url: storeUrl,
    customer_email: payload.email,
    customer_id: payload.customer?.id,
    financial_status: payload.financial_status,
    fulfillment_status: payload.fulfillment_status,
    sub_total_price: payload.subtotal_price,
    sub_total_price_usd: (parseFloat(payload.subtotal_price) / conversionRate).toFixed(2),
    total_order_value: payload.total_price,
    currency: payload.currency,
    shipping_costs: parseFloat(payload.total_shipping_price_set?.shop_money?.amount || "0"),
    shipping_address: payload.shipping_address,
    line_items: payload.line_items,
    // ... more fields
  };
}
```

### Inventory Data Transformation
**File:** `commercive-app-v2-main/app/utils/transformDataHelpers.tsx`

```typescript
export function transformInventoryLevelWebhookData(item: any, storeUrl: string) {
  return {
    inventory_id: item.id,
    store_url: storeUrl,
    sku: item.sku,
    product_id: item.variant?.product?.id,
    variant_id: parseInt(item.variant?.id?.split("/").pop() || "0"),
    product_name: item.variant?.product?.title,
    variant_name: item.variant?.title,
    product_image: item.variant?.product?.images?.edges?.[0]?.node?.url,
    inventory_level: item.inventoryLevels?.edges || [],
    // inventory_level structure:
    // [{ node: { quantities: [{ name: "available", quantity: 100 }, ...] } }]
  };
}
```

---

## UPSERT Strategy

All database writes use UPSERT to prevent duplicates:

| Table | Conflict Column(s) | Behavior |
|-------|-------------------|----------|
| `order` | `order_id` | Update existing order |
| `order_items` | `order_id, product_id` | Update existing line item |
| `trackings` | `order_id` | Update tracking for order |
| `inventory` | `inventory_id` | Update stock levels |
| `stores` | `store_url` | Update store info |

**Example:**
```typescript
await supabase
  .from("order")
  .upsert(orderData, { onConflict: "order_id" });
```

---

## Data Freshness

### Real-time Updates
- Webhooks provide near-instant updates (typically < 1 second)
- No polling or scheduled jobs needed

### Potential Delays
1. **Webhook delivery:** Shopify may batch or delay webhooks under load
2. **Network latency:** Webhook processing time
3. **Database propagation:** Near-instant with Supabase

### No Automatic Retry on Dashboard
- Dashboard does not auto-refresh
- Users must manually refresh to see updates
- Consider implementing WebSocket/SSE for real-time UI updates

---

## Verification: Is Data Dynamic?

### Confirmed Dynamic (from database):
- Orders and order items
- Inventory levels
- Shipment tracking
- Store information
- User data

### Confirmed Static (hardcoded):
- Marketing statistics on login page
- S3 image URLs
- External website URLs
- Forecast configuration constants

See `03-HARDCODED-DATA-ISSUES.md` for full list.
