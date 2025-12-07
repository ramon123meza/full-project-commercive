# Database Schema Documentation

## Overview

The Commercive system uses a **single Supabase PostgreSQL database** shared between two applications:

1. **commercive-app-v2-main** (Shopify App) - WRITES data from Shopify stores
2. **dashboard-commercive-main** (Dashboard) - READS data for display to affiliates/admins

Both applications connect to the same Supabase instance using different client configurations.

---

## Table Summary

| Table | Description | Written By | Read By |
|-------|-------------|------------|---------|
| `user` | Dashboard user accounts | Dashboard, Shopify App | Dashboard |
| `admin` | Admin role mapping | Dashboard | Dashboard |
| `affiliates` | Affiliate program data | Dashboard | Dashboard |
| `stores` | Connected Shopify stores | Shopify App, Dashboard | Both |
| `store_to_user` | User-to-store relationships | Shopify App, Dashboard | Both |
| `session` | Shopify OAuth sessions | Shopify App | Shopify App |
| `order` | Orders from Shopify | Shopify App | Dashboard |
| `order_items` | Line items within orders | Shopify App | Dashboard |
| `inventory` | Product inventory levels | Shopify App | Dashboard |
| `trackings` | Shipment tracking info | Shopify App | Dashboard |
| `referrals` | Affiliate referral data | External/Manual | Dashboard |
| `payouts` | Affiliate commission payouts | Dashboard | Dashboard |
| `affiliate_customer_setting` | Commission configurations | Dashboard | Dashboard |
| `webhooks` | Webhook event logs | Shopify App | Both |
| `issues` | Support tickets | Dashboard | Dashboard |
| `new_leads` | Lead generation data | Dashboard | Dashboard |
| `signup_request` | Signup requests | Dashboard | Dashboard |
| `_prisma_migrations` | Database migrations | Prisma ORM | N/A |

---

## Detailed Table Schemas

### Core User Tables

#### `user`
Dashboard user accounts (affiliates, merchants, employees).

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | string (UUID) | NO | Primary key (Supabase auth user ID) |
| `email` | string | YES | User email address |
| `first_name` | string | YES | First name |
| `last_name` | string | YES | Last name |
| `user_name` | string | YES | Display username |
| `phone_number` | string | YES | Contact phone |
| `role` | string | YES | Role: "admin", "employee", "user" |
| `referral_code` | string | YES | Unique affiliate referral code |
| `visible_pages` | string[] | YES | Allowed dashboard pages |
| `visible_store` | string[] | YES | Allowed store URLs |
| `created_at` | timestamp | NO | Creation timestamp |

**Notes:**
- `id` corresponds to Supabase Auth user UUID
- `visible_pages` controls feature access (e.g., ["home", "inventory", "partners"])
- `visible_store` restricts which stores a user can view

---

#### `admin`
Marks users as administrators.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | number | NO | Auto-increment primary key |
| `user_id` | string | NO | FK to `user.id` |
| `email` | string | NO | Admin email |
| `created_at` | timestamp | NO | Creation timestamp |

**Relationships:**
- `admin.user_id` -> `user.id`

---

#### `affiliates`
Affiliate program enrollment and settings.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | number | NO | Auto-increment primary key |
| `user_id` | string | NO | FK to `user.id` |
| `affiliate_id` | string | YES | Unique affiliate identifier |
| `status` | AFFILIATE_STATUS | NO | Pending/Approved/Declined/None/Completed |
| `store_url` | string | YES | FK to `stores.store_url` |
| `form_url` | string | YES | Affiliate application form URL |
| `auto_payout_enabled` | boolean | NO | Auto-payout setting |
| `preferred_payment_method` | string | NO | PayPal, Bank, etc. |
| `payment_method_details` | JSON | NO | Payment configuration |
| `created_at` | timestamp | NO | Creation timestamp |

**Relationships:**
- `affiliates.user_id` -> `user.id` (one-to-one)
- `affiliates.store_url` -> `stores.store_url`

**Enum `AFFILIATE_STATUS`:**
- `Pending` - Awaiting approval
- `Approved` - Active affiliate
- `Declined` - Application rejected
- `None` - Not an affiliate
- `Completed` - Used for payouts

---

### Store Tables

#### `stores`
Connected Shopify stores.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | string (UUID) | NO | Primary key |
| `store_name` | string | NO | Display name |
| `store_url` | string | NO | Shopify domain (unique identifier) |
| `is_inventory_fetched` | boolean | NO | Initial inventory sync complete |
| `is_store_listed` | boolean | NO | Store visible in dashboard |
| `created_at` | timestamp | NO | Creation timestamp |

**Important:**
- `store_url` is the **primary linking field** across all tables
- Format: `store-name.myshopify.com`

---

#### `store_to_user`
Many-to-many relationship between users and stores.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `uuid` | string | NO | Primary key |
| `user_id` | string | NO | FK to `user.id` |
| `store_id` | string | NO | FK to `stores.id` |
| `created_at` | timestamp | NO | Creation timestamp |

**Relationships:**
- `store_to_user.user_id` -> `user.id`
- `store_to_user.store_id` -> `stores.id`

---

#### `session`
Shopify OAuth session storage.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | string | NO | Session identifier (primary key) |
| `shop` | string | NO | Shopify store domain |
| `state` | string | NO | OAuth state parameter |
| `isOnline` | boolean | NO | Online vs offline session |
| `scope` | string | YES | Granted OAuth scopes |
| `expires` | timestamp | YES | Session expiration |
| `accessToken` | string | NO | Shopify API access token |
| `userId` | number | YES | Shopify user ID |
| `firstName` | string | YES | User first name |
| `lastName` | string | YES | User last name |
| `email` | string | YES | User email |
| `accountOwner` | boolean | NO | Is store owner |
| `locale` | string | YES | Locale setting |
| `collaborator` | boolean | YES | Is collaborator |
| `emailVerified` | boolean | YES | Email verification status |

**Used By:** Shopify App only (for OAuth management)

---

### Order Tables

#### `order`
Orders synced from Shopify stores.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | string (UUID) | NO | Internal UUID |
| `order_id` | number | NO | Shopify order ID (unique) |
| `order_number` | number | NO | Display order number |
| `store_url` | string | YES | Source store domain |
| `customer_email` | string | YES | Customer email |
| `customer_id` | number | YES | Shopify customer ID |
| `financial_status` | string | YES | paid/pending/refunded/etc. |
| `fulfillment_status` | string | YES | fulfilled/partial/null |
| `sub_total_price` | string | NO | Subtotal before shipping/tax |
| `sub_total_price_usd` | string | YES | Converted to USD |
| `total_order_value` | string | NO | Total including all fees |
| `currency` | string | YES | Original currency code |
| `shipping_costs` | number | YES | Shipping amount |
| `shipping_costs_usd` | string | YES | Shipping in USD |
| `shipping_address` | JSON | YES | Full shipping address |
| `line_items` | JSON[] | YES | Array of line items |
| `fulfillments` | JSON | YES | Fulfillment data |
| `current_total_tax` | string | YES | Tax amount |
| `current_total_tax_set` | JSON | YES | Tax details |
| `tax_rate` | number | YES | Calculated tax rate |
| `total_discounts` | string | YES | Discount amount |
| `total_discounts_set` | JSON | YES | Discount details |
| `order_tags` | string | YES | Shopify order tags |
| `order_status_url` | string | YES | Customer order status URL |
| `processed_at` | timestamp | YES | Order processing time |
| `created_at` | timestamp | NO | Record creation |
| `updated_at` | timestamp | NO | Last update |

**Unique Constraint:** `order_id`

---

#### `order_items`
Individual line items from orders.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | string (UUID) | NO | Primary key |
| `order_id` | number | NO | FK to `order.order_id` |
| `lineItem_id` | number | YES | Shopify line item ID |
| `product_id` | number | YES | Shopify product ID |
| `sku` | string | YES | Product SKU |
| `vendor_name` | string | YES | Product vendor |
| `quantity` | number | YES | Quantity ordered |
| `price` | string | YES | Unit price |
| `currency` | string | YES | Price currency |
| `grams` | number | YES | Item weight |
| `image_url` | string | YES | Product image |
| `total_discount` | string | YES | Line item discount |
| `discount_allocations` | JSON | YES | Discount breakdown |
| `store_url` | string | YES | Source store |
| `created_at` | timestamp | NO | Record creation |

---

### Inventory Tables

#### `inventory`
Product inventory levels from Shopify.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `inventory_id` | string | NO | Shopify inventory item ID (PK) |
| `store_url` | string | NO | Source store domain |
| `product_id` | string | YES | Shopify product ID |
| `variant_id` | number | YES | Shopify variant ID |
| `sku` | string | YES | Product SKU |
| `product_name` | string | YES | Product title |
| `variant_name` | string | YES | Variant title |
| `product_image` | string | YES | Product image URL |
| `inventory_level` | JSON | YES | Stock levels by location |
| `back_orders` | number | YES | Backorder count |
| `created_at` | timestamp | NO | Record creation |

**JSON Structure for `inventory_level`:**
```json
{
  "quantities": [
    {
      "name": "available",
      "quantity": 100
    },
    {
      "name": "committed",
      "quantity": 5
    },
    {
      "name": "incoming",
      "quantity": 50
    }
  ]
}
```

**Unique Constraint:** `inventory_id`

---

### Tracking Tables

#### `trackings`
Shipment tracking information.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | string (UUID) | NO | Primary key |
| `order_id` | number | NO | FK to `order.order_id` |
| `store_url` | string | YES | Source store domain |
| `status` | string | NO | General status |
| `shipment_status` | string | YES | Detailed shipment status |
| `tracking_number` | string | YES | Primary tracking number |
| `tracking_numbers` | JSON | YES | Array of all tracking numbers |
| `tracking_company` | string | YES | Carrier name |
| `tracking_url` | string | YES | Primary tracking URL |
| `tracking_urls` | JSON | YES | Array of tracking URLs |
| `destination` | JSON | YES | Destination address |
| `store_location` | string | YES | Origin location |
| `created_at` | timestamp | NO | Record creation |
| `updated_at` | timestamp | NO | Last update |

**Relationships:**
- `trackings.order_id` -> `order.order_id` (one-to-one)

---

### Affiliate & Commission Tables

#### `referrals`
Affiliate referral tracking.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | number | NO | Auto-increment primary key |
| `uuid` | string | NO | Unique identifier |
| `affiliate_id` | string | NO | Affiliate identifier |
| `customer_number` | string | NO | Customer identifier |
| `order_number` | string | NO | Associated order number |
| `order_time` | string | NO | Order timestamp |
| `quantity_of_order` | number | NO | Number of items |
| `invoice_total` | number | YES | Order total |
| `store_name` | string | NO | Store name |
| `agent_name` | string | YES | Sales agent |
| `business_type` | string | YES | Customer business type |
| `client_country` | string | YES | Customer country |
| `client_group` | string | YES | Customer segment |
| `client_niche` | string | YES | Customer niche |
| `created_at` | timestamp | NO | Record creation |

**Note:** This table appears to be populated externally or manually, not directly from Shopify webhooks.

---

#### `affiliate_customer_setting`
Commission rate configuration per customer.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `uid` | string | NO | Primary key |
| `affiliate` | string | NO | Affiliate identifier |
| `customer_id` | string | NO | Customer identifier |
| `commission_rate` | number | NO | Commission percentage |
| `commission_method` | number | NO | Calculation method |

---

#### `payouts`
Affiliate commission payouts.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | string (UUID) | NO | Primary key |
| `user_id` | string | NO | FK to `user.id` |
| `store_url` | string | YES | Associated store |
| `amount` | number | NO | Payout amount |
| `paypal_address` | string | NO | PayPal email |
| `payment_method` | string | NO | Payment method |
| `payment_details` | JSON | NO | Payment configuration |
| `status` | AFFILIATE_STATUS | NO | Pending/Approved/Completed |
| `requested_at` | timestamp | YES | Request timestamp |
| `processed_at` | timestamp | YES | Processing timestamp |
| `notes` | string | YES | Admin notes |
| `created_at` | timestamp | NO | Record creation |

**Relationships:**
- `payouts.user_id` -> `user.id`
- `payouts.store_url` -> `stores.store_url`

---

### System Tables

#### `webhooks`
Webhook event logs for debugging.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | number | NO | Auto-increment primary key |
| `store_url` | string | NO | Source store domain |
| `topic` | string | NO | Webhook topic |
| `payload` | JSON | NO | Full webhook payload |
| `created_at` | timestamp | NO | Receipt timestamp |

---

#### `issues`
Support tickets.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | number | NO | Auto-increment primary key |
| `user_id` | string | YES | FK to `user.id` |
| `store_url` | string | YES | Related store |
| `name` | string | YES | Contact name |
| `email` | string | YES | Contact email |
| `phone_number` | string | YES | Contact phone |
| `issue` | string | YES | Issue description |
| `confirmed` | boolean | NO | Resolution status |
| `created_at` | timestamp | NO | Submission timestamp |

---

#### `new_leads`
Marketing lead generation.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | string (UUID) | NO | Primary key |
| `name` | string | YES | Lead name |
| `email` | string | YES | Lead email |
| `phone` | string | YES | Lead phone |
| `businessPlatform` | string | YES | Platform used |
| `webUrl` | string | YES | Website URL |
| `orderUnits` | string | YES | Monthly order volume |
| `source` | string | YES | Lead source |
| `created_at` | timestamp | NO | Submission timestamp |

---

#### `signup_request`
Dashboard signup requests.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | number | NO | Auto-increment primary key |
| `email` | string | NO | Email address |
| `first_name` | string | NO | First name |
| `last_name` | string | NO | Last name |
| `user_name` | string | NO | Username |
| `phone_number` | string | YES | Phone number |
| `status` | boolean | NO | Approval status |
| `created_at` | timestamp | NO | Request timestamp |

---

## Database Views

### `user_role_view`
Simple view for role-based access checks.

```sql
SELECT id, role FROM "user"
```

### `referral_view`
Joins referrals with affiliate settings and user info for commission display.

**Columns:**
- Referral data (affiliate_id, customer_number, order_number, invoice_total, etc.)
- Commission settings (commission_rate, commission_method)
- Calculated `total_commission`
- User info (affiliate_name, affiliate_email)

### `referral_summary`
Aggregated affiliate performance metrics.

**Columns:**
- `affiliate_id`, `user_id`
- `count` - Total referrals
- `order_count` - Total orders
- `total_amount` - Total revenue
- `customer_ids` - Array of unique customers

### `affiliate_setting_view`
Commission settings with order counts.

### `payout_view`
Aggregated payout summaries by user.

### `customer_ids_view`
Unique customer identifiers for autocomplete.

---

## Database Functions

### `get_admin_ids()`
Returns array of admin user IDs.

```sql
SELECT get_admin_ids(); -- Returns string[]
```

---

## Entity Relationship Diagram

```
                                    +------------------+
                                    |      admin       |
                                    +------------------+
                                    | id (PK)          |
                                    | user_id (FK) ----+----+
                                    | email            |    |
                                    +------------------+    |
                                                           |
+------------------+      +------------------+      +------v---------+
|    affiliates    |      |  store_to_user   |      |      user      |
+------------------+      +------------------+      +------------------+
| id (PK)          |      | uuid (PK)        |      | id (PK)        |
| user_id (FK) ---------+ | user_id (FK) ----+------| email          |
| affiliate_id     |    | | store_id (FK) ---+      | role           |
| status           |    | +------------------+      | visible_pages  |
| store_url (FK) --+    |                    |      | referral_code  |
+-------+----------+    |                    |      +----------------+
        |               |                    |
        v               |                    v
+------------------+    |            +------------------+
|     stores       |<---+            |     payouts      |
+------------------+                 +------------------+
| id (PK)          |<----------------| id (PK)          |
| store_url (UK)   |                 | user_id (FK) --->+
| store_name       |                 | store_url (FK)   |
| is_inventory_... |                 | amount           |
+-------+----------+                 | status           |
        |                            +------------------+
        | (store_url used as FK)
        |
+-------v----------+      +------------------+      +------------------+
|      order       |      |   order_items    |      |    trackings     |
+------------------+      +------------------+      +------------------+
| id (PK)          |      | id (PK)          |      | id (PK)          |
| order_id (UK) <---------| order_id (FK)    |<-----| order_id (FK)    |
| store_url        |      | product_id       |      | tracking_number  |
| customer_email   |      | sku              |      | shipment_status  |
| financial_status |      | quantity         |      | store_url        |
| line_items       |      | price            |      +------------------+
+------------------+      +------------------+

+------------------+      +------------------+
|    inventory     |      |    webhooks      |
+------------------+      +------------------+
| inventory_id (PK)|      | id (PK)          |
| store_url        |      | store_url        |
| sku              |      | topic            |
| inventory_level  |      | payload          |
+------------------+      +------------------+
```

---

## Key Relationships Summary

| From Table | From Column | To Table | To Column | Relationship |
|------------|-------------|----------|-----------|--------------|
| `admin` | `user_id` | `user` | `id` | Many-to-One |
| `affiliates` | `user_id` | `user` | `id` | One-to-One |
| `affiliates` | `store_url` | `stores` | `store_url` | Many-to-One |
| `store_to_user` | `user_id` | `user` | `id` | Many-to-One |
| `store_to_user` | `store_id` | `stores` | `id` | Many-to-One |
| `payouts` | `user_id` | `user` | `id` | Many-to-One |
| `payouts` | `store_url` | `stores` | `store_url` | Many-to-One |
| `trackings` | `order_id` | `order` | `order_id` | One-to-One |
| `issues` | `user_id` | `user` | `id` | Many-to-One |

---

## Notes on `store_url` Usage

The `store_url` field (format: `store-name.myshopify.com`) is used as the **primary linking mechanism** across most tables:

- `order.store_url`
- `order_items.store_url`
- `inventory.store_url`
- `trackings.store_url`
- `affiliates.store_url`
- `payouts.store_url`
- `webhooks.store_url`
- `issues.store_url`

This design means data filtering by store is straightforward, but there's **no foreign key enforcement** on most tables linking to `stores.store_url`. This could lead to orphaned data if stores are deleted.
