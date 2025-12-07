# System Architecture Documentation

## Overview

The Commercive system consists of two separate applications that work together:

```
+---------------------------+          +---------------------------+
|  SHOPIFY STORES           |          |  COMMERCIVE DASHBOARD     |
|  (Multiple merchants)     |          |  dashboard.commercive.co  |
+------------+--------------+          +------------+--------------+
             |                                      |
             | Webhooks                             | HTTP/API
             | OAuth                                |
             v                                      v
+---------------------------+          +---------------------------+
|  COMMERCIVE SHOPIFY APP   |          |  NEXT.JS DASHBOARD APP    |
|  app.commercive.co        |          |  (dashboard-commercive)   |
|  (commercive-app-v2)      |          |                           |
+------------+--------------+          +------------+--------------+
             |                                      |
             | WRITES                               | READS
             |                                      |
             +------------>  SUPABASE  <------------+
                           (PostgreSQL)
```

---

## Application Details

### 1. Commercive Shopify App (`commercive-app-v2-main`)

**Purpose:** Shopify embedded app that syncs store data to the central database.

**Technology Stack:**
- Framework: Remix.js 2.7.1 with React 18
- Database ORM: Prisma 5.11.0
- Secondary DB: Supabase client
- UI: Shopify Polaris 12.0.0
- Language: TypeScript
- Build: Vite 5.1.3

**Deployment:**
- URL: `https://app.commercive.co`
- Platform: Vercel

**Key Responsibilities:**
1. Handle Shopify OAuth for store installation
2. Manage Shopify sessions
3. Receive and process webhooks from Shopify
4. Sync orders, inventory, fulfillments to Supabase
5. Create dashboard users when stores install the app

**Directory Structure:**
```
commercive-app-v2-main/
├── app/
│   ├── routes/           # API endpoints and pages
│   │   ├── app._index.tsx      # Main dashboard
│   │   ├── webhooks.tsx        # Webhook processor
│   │   ├── auth.login/         # OAuth login
│   │   └── auth.callback/      # OAuth callback
│   ├── utils/
│   │   ├── supabaseHelpers.tsx # DB insert/update functions
│   │   ├── transformDataHelpers.tsx # Data transformers
│   │   ├── shopify.tsx         # GraphQL fetchers
│   │   ├── queries.ts          # GraphQL queries
│   │   └── createDashboardUser.ts
│   ├── types/
│   │   ├── database.types.ts   # Supabase schema types
│   │   └── payload.tsx         # Webhook payload types
│   ├── shopify.server.ts       # Shopify OAuth config
│   ├── supabase.server.ts      # Supabase client
│   └── db.server.ts            # Prisma client
├── prisma/
│   └── schema.prisma           # Session table schema
└── extensions/                 # Shopify app extensions
```

---

### 2. Commercive Dashboard (`dashboard-commercive-main`)

**Purpose:** Web dashboard for affiliates and admins to view store data.

**Technology Stack:**
- Framework: Next.js 15.3.6 with React 19
- Database: Supabase client
- UI: Material-UI (MUI) 6.3.0
- Charts: ApexCharts
- Maps: React Leaflet
- Styling: TailwindCSS
- Language: TypeScript

**Deployment:**
- URL: `https://dashboard.commercive.co`
- Platform: Vercel

**Key Responsibilities:**
1. User authentication (Supabase Auth)
2. Display store data to authorized users
3. Admin management (users, stores, payouts)
4. Affiliate commission tracking
5. Inventory management and forecasting
6. Order and shipment tracking
7. Support ticketing

**Directory Structure:**
```
dashboard-commercive-main/
├── src/
│   ├── app/
│   │   ├── (authentificated)/  # Protected routes
│   │   │   ├── admin/          # Admin-only pages
│   │   │   ├── home/           # Main dashboard
│   │   │   ├── inventory/      # Inventory views
│   │   │   ├── shipments/      # Order tracking
│   │   │   └── support/        # Ticketing
│   │   ├── (public)/           # Public routes
│   │   │   └── affiliate-form/ # Affiliate signup
│   │   ├── api/                # API routes
│   │   │   ├── forecast/       # Inventory forecasting
│   │   │   └── notify-admin-new-account/
│   │   ├── login/              # Auth pages
│   │   ├── signUp/
│   │   └── utils/
│   │       └── supabase/       # Client configurations
│   ├── components/             # Reusable UI components
│   ├── context/                # React contexts
│   │   ├── StoreContext.tsx    # Store selection state
│   │   └── OnboardingContext.tsx
│   └── hooks/
│       └── usePermissions.ts   # Permission checks
└── public/                     # Static assets
```

---

## User Roles & Access Control

### Role Hierarchy

| Role | Description | Access Level |
|------|-------------|--------------|
| `admin` | System administrator | Full access to all features |
| `employee` | Staff member | Admin panel access (configurable) |
| `user` | Regular user/affiliate | Limited to assigned stores |

### Permission System

Permissions are controlled by two mechanisms:

1. **Role-based:** `user.role` field
   - Admins bypass all restrictions
   - Employees get admin panel access

2. **Page-based:** `user.visible_pages[]` array
   - Controls which dashboard sections are accessible
   - Values: `["home", "inventory", "partners", "support"]`

3. **Store-based:** `store_to_user` junction table + `user.visible_store[]`
   - Users only see data for their assigned stores

### Affiliate Status Flow

```
User Signup
    ↓
status: "Pending"
    ↓
Admin Review (admin/partners page)
    ↓
    +---> status: "Approved" → Full access
    |
    +---> status: "Declined" → Access denied
```

**Pending affiliates** see a "Locked Screen" until approved.

---

## Authentication Flow

### Dashboard Authentication (Supabase Auth)

```
User → Login Page
         ↓
    Email/Password
         ↓
    Supabase Auth
         ↓
    Session Cookie
         ↓
    Middleware Check
         ↓
    Protected Routes
```

**Implementation:**
- `src/app/middleware.ts` - Route protection
- `src/app/utils/supabase/server.ts` - Server-side client
- `src/app/utils/supabase/client.ts` - Browser client

### Shopify App Authentication (OAuth)

```
Store Admin → Install App
                 ↓
          Shopify OAuth
                 ↓
          /auth/callback
                 ↓
          Store Session (Prisma)
                 ↓
          afterAuth Hook
                 ↓
          Create Dashboard User
```

**Implementation:**
- `app/shopify.server.ts` - OAuth configuration
- `app/routes/auth.callback/route.tsx` - Callback handler
- `app/utils/createDashboardUser.ts` - User creation

---

## Data Flow Architecture

### Store Installation Flow

```
1. Merchant installs app from Shopify App Store
2. OAuth flow completes → access token stored
3. afterAuth hook triggers:
   a. Fetch shop details via GraphQL
   b. Create Supabase auth user
   c. Insert into "user" table
   d. Insert/update "stores" table
   e. Create "store_to_user" link
   f. Create "affiliates" record (Pending status)
4. Initial data sync:
   a. Fetch all orders → save to "order" table
   b. Fetch all inventory → save to "inventory" table
   c. Fetch all fulfillments → save to "trackings" table
   d. Set is_inventory_fetched = true
```

### Webhook Flow (Ongoing Sync)

```
Shopify Store Event
        ↓
    Webhook POST to /webhooks
        ↓
    Authenticate (HMAC validation)
        ↓
    Process by topic:
        ├── ORDERS_CREATE/UPDATED → transform → save to "order" + "order_items"
        ├── FULFILLMENTS_CREATE/UPDATE → transform → save to "trackings"
        ├── INVENTORY_LEVELS_UPDATE → fetch details → save to "inventory"
        ├── PRODUCTS_CREATE/UPDATE → update inventory for variants
        └── PRODUCTS_DELETE → delete inventory records
        ↓
    Return 200 OK
```

### Dashboard Data Fetch Flow

```
User selects store in dropdown
        ↓
    StoreContext updates selectedStore
        ↓
    Page component fetches data:
        SELECT * FROM "order" WHERE store_url = ?
        SELECT * FROM "inventory" WHERE store_url = ?
        SELECT * FROM "trackings" WHERE store_url = ?
        ↓
    Display in UI components
```

---

## Environment Variables

### Shopify App (`commercive-app-v2-main`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Prisma PostgreSQL connection (with pooling) |
| `DIRECT_URL` | Direct PostgreSQL connection |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SECRET_KEY` | Supabase service role key |
| `SHOPIFY_API_KEY` | Shopify app client ID |
| `SHOPIFY_API_SECRET` | Shopify app secret |
| `SHOPIFY_APP_URL` | App deployment URL |
| `CURRENCY_API_KEY` | CurrencyFreaks API key |

### Dashboard (`dashboard-commercive-main`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server) |
| `NEXT_PUBLIC_CLIENT_URL` | Dashboard frontend URL |
| `NEXT_PUBLIC_AWS_LAMBDA_URL` | Lambda for DynamoDB preferences |
| `MAILERSEND_APIKEY` | Email service API key |

---

## Registered Webhooks

The Shopify app registers these webhooks:

| Topic | Handler | Database Tables |
|-------|---------|-----------------|
| `ORDERS_CREATE` | Process new order | `order`, `order_items` |
| `ORDERS_UPDATED` | Update order | `order`, `order_items` |
| `FULFILLMENTS_CREATE` | Create tracking | `trackings` |
| `FULFILLMENTS_UPDATE` | Update tracking | `trackings` |
| `INVENTORY_LEVELS_UPDATE` | Update stock | `inventory` |
| `INVENTORY_LEVELS_CONNECT` | Add location | `inventory` |
| `INVENTORY_LEVELS_DISCONNECT` | Remove location | `inventory` |
| `INVENTORY_ITEMS_CREATE` | New SKU | `inventory` |
| `INVENTORY_ITEMS_UPDATE` | Update SKU | `inventory` |
| `INVENTORY_ITEMS_DELETE` | Delete SKU | `inventory` |
| `PRODUCTS_CREATE` | New product | `inventory` (per variant) |
| `PRODUCTS_UPDATE` | Update product | `inventory` (per variant) |
| `PRODUCTS_DELETE` | Delete product | `inventory` (delete records) |
| `APP_UNINSTALLED` | Cleanup | Session cleanup |

---

## Key File Locations

### Data Processing (Shopify App)

| File | Purpose |
|------|---------|
| `app/routes/webhooks.tsx` | Main webhook processor |
| `app/utils/supabaseHelpers.tsx` | Database insert/update functions |
| `app/utils/transformDataHelpers.tsx` | Data transformation logic |
| `app/utils/shopify.tsx` | GraphQL fetchers |
| `app/utils/queries.ts` | GraphQL query definitions |
| `app/utils/createDashboardUser.ts` | User onboarding |

### Data Display (Dashboard)

| File | Purpose |
|------|---------|
| `src/app/(authentificated)/home/page.tsx` | Main dashboard |
| `src/app/(authentificated)/inventory/page.tsx` | Inventory views |
| `src/app/(authentificated)/shipments/page.tsx` | Order tracking |
| `src/context/StoreContext.tsx` | Store selection state |
| `src/components/admin/` | Admin UI components |

---

## Integration Points

### Shared Database
Both apps connect to the **same Supabase instance**:
- Same `SUPABASE_URL`
- Different auth approaches (service key vs. user auth)

### Store URL as Primary Link
The `store_url` field (e.g., `store-name.myshopify.com`) is the primary identifier used across all tables to filter data by store.

### User Creation Flow
1. Shopify App creates user in Supabase Auth
2. Shopify App creates user record in `user` table
3. Dashboard uses same auth system for login

### Data Freshness
- **Real-time:** Webhooks provide near-instant updates
- **Initial sync:** Full data fetch on app installation
- **No scheduled sync:** Data only updates via webhooks

---

## Deployment Architecture

```
                    VERCEL
        +---------------------------+
        |                           |
        |  +---------------------+  |
        |  | commercive-app-v2   |  |
        |  | (Remix.js)          |  |
        |  | app.commercive.co   |  |
        |  +----------+----------+  |
        |             |             |
        |  +----------v----------+  |
        |  | dashboard-commercive|  |
        |  | (Next.js)           |  |
        |  | dashboard.commercive|  |
        |  +----------+----------+  |
        |             |             |
        +-------------+-------------+
                      |
                      v
            +------------------+
            |    SUPABASE      |
            |   (PostgreSQL)   |
            |   (Auth)         |
            +------------------+
                      |
                      v
            +------------------+
            |     AWS          |
            |  - S3 (images)   |
            |  - Lambda+DynamoDB|
            +------------------+
```
