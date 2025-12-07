# Commercive System Documentation

## Overview

This documentation provides a comprehensive understanding of the Commercive system, which consists of two interconnected applications:

1. **Commercive Shopify App** (`commercive-app-v2-main`)
   - URL: `https://app.commercive.co`
   - Purpose: Shopify embedded app that syncs store data to Supabase

2. **Commercive Dashboard** (`dashboard-commercive-main`)
   - URL: `https://dashboard.commercive.co`
   - Purpose: Web dashboard for affiliates and admins to view store data

Both applications share a **single Supabase database** - the Shopify app writes data, and the dashboard reads it.

---

## Documentation Files

| File | Description |
|------|-------------|
| [01-DATABASE-SCHEMA.md](./01-DATABASE-SCHEMA.md) | Complete database schema, tables, relationships, and entity diagrams |
| [02-SYSTEM-ARCHITECTURE.md](./02-SYSTEM-ARCHITECTURE.md) | System architecture, deployment, authentication flows |
| [03-HARDCODED-DATA-ISSUES.md](./03-HARDCODED-DATA-ISSUES.md) | Hardcoded values that may need to be dynamic |
| [04-DATA-FLOW.md](./04-DATA-FLOW.md) | How data flows from Shopify to Dashboard |
| [05-INCONSISTENCIES-AND-RECOMMENDATIONS.md](./05-INCONSISTENCIES-AND-RECOMMENDATIONS.md) | Bugs, issues, and fix recommendations |
| [database-analysis-script.sql](./database-analysis-script.sql) | SQL script to analyze database structure |

---

## Quick Start for Engineers

### Understanding the System

1. Start with [02-SYSTEM-ARCHITECTURE.md](./02-SYSTEM-ARCHITECTURE.md) for high-level overview
2. Read [04-DATA-FLOW.md](./04-DATA-FLOW.md) to understand how data moves through the system
3. Review [01-DATABASE-SCHEMA.md](./01-DATABASE-SCHEMA.md) for table structures

### Working on Issues

1. Check [05-INCONSISTENCIES-AND-RECOMMENDATIONS.md](./05-INCONSISTENCIES-AND-RECOMMENDATIONS.md) for known bugs
2. Use [database-analysis-script.sql](./database-analysis-script.sql) to analyze live database state
3. Reference [03-HARDCODED-DATA-ISSUES.md](./03-HARDCODED-DATA-ISSUES.md) for static vs dynamic data

---

## Key Concepts

### How Data Gets into the Database

```
Shopify Store → Webhooks → Commercive App → Transform → Supabase
                                                           ↓
                                              Dashboard → Display
```

1. **Initial Sync:** When store installs app, all orders/inventory are fetched
2. **Ongoing Sync:** Webhooks keep data updated in real-time

### Core Tables

| Table | Purpose | Written By |
|-------|---------|------------|
| `stores` | Store configuration | Shopify App |
| `order` | Orders from Shopify | Shopify App |
| `inventory` | Product stock levels | Shopify App |
| `trackings` | Shipment tracking | Shopify App |
| `user` | Dashboard users | Both |
| `affiliates` | Affiliate program | Dashboard |

### Store URL as Primary Key

The `store_url` field (e.g., `store.myshopify.com`) is used across all tables to link data to specific stores. Always filter by `store_url` when querying store-specific data.

---

## Critical Fixes Needed

### IMMEDIATE (Security)

1. **Remove secret key logging** - `commercive-app-v2-main/app/supabase.server.ts:6`
   ```typescript
   // DELETE THIS LINE:
   console.log(SUPABASE_SECRET_KEY);
   ```

2. **Remove Redis credentials** - `commercive-app-v2-main/app/utils/supabaseHelpers.tsx:6-11`
   - Delete the commented-out Redis configuration

### HIGH PRIORITY (Bugs)

3. **Fix backorder counter** - `commercive-app-v2-main/app/utils/supabaseHelpers.tsx:283`
   ```typescript
   // Change from:
   const updatedBackOrders = inventoryData.back_orders || 0 + 1;
   // To:
   const updatedBackOrders = (inventoryData.back_orders || 0) + 1;
   ```

---

## Environment Variables

### Shopify App

```env
DATABASE_URL=postgres://...          # Prisma connection
DIRECT_URL=postgres://...            # Direct PostgreSQL
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SECRET_KEY=eyJ...           # Service role key
SHOPIFY_API_KEY=xxx
SHOPIFY_API_SECRET=xxx
SHOPIFY_APP_URL=https://app.commercive.co
CURRENCY_API_KEY=xxx
```

### Dashboard

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_CLIENT_URL=https://dashboard.commercive.co
NEXT_PUBLIC_AWS_LAMBDA_URL=https://...
MAILERSEND_APIKEY=xxx
```

---

## Testing Database Changes

Before making schema changes:

1. Run the analysis script in Supabase SQL Editor:
   ```sql
   -- Copy contents of database-analysis-script.sql
   ```

2. Check for orphaned data (Part 17 of script)

3. Verify data freshness (Part 18 of script)

---

## Contact

For questions about this documentation, refer to the codebase or contact the development team.
