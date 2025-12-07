# Admin User Guide - Commercive Dashboard

## Overview

This guide is for **administrators** of the Commercive Dashboard. Admins have full access to manage users, stores, affiliates, payouts, and all system settings.

---

## Getting Started

### Accessing the Dashboard

1. Navigate to `https://dashboard.commercive.co`
2. Click "Sign In" on the landing page
3. Enter your admin credentials (email and password)
4. Upon successful login, you'll be redirected to the Home dashboard

### Admin Permissions

As an admin, you have access to all dashboard pages:
- `/home` - Dashboard overview with KPIs
- `/manage-users` - User management
- `/inventory` - Inventory monitoring
- `/shipments` - Shipment tracking
- `/onboarding` - New user onboarding status
- `/affiliate-users` - Affiliate management
- `/referrals` - Referral tracking
- `/payouts` - Commission payouts
- `/settings` - System settings

---

## Key Admin Functions

### 1. Approving New Users

When merchants install the Shopify app, they're automatically registered with "Pending" status.

**To approve a new user:**

1. Navigate to **Manage Users** or **Affiliate Users**
2. Find users with "Pending" status
3. Review their information:
   - Store URL
   - Email address
   - Registration date
4. Click "Approve" to activate their account
5. The user will gain access to their dashboard data

**Important:** Users cannot see their store data until approved.

### 2. Managing Stores

Each store that installs the Commercive Shopify app appears in the system.

**To link a user to a store:**

1. Go to **Manage Users**
2. Select the user
3. Use the store assignment feature to link them to their store
4. Verify the link in the `store_to_user` table

**Note:** Due to a recent bug fix, you may need to run the SQL repair scripts to fix existing store-user links. See `docs/07-SQL-REPAIR-SCRIPTS.sql`.

### 3. Viewing All Stores' Data

As an admin, you can switch between stores to view their data:

1. Use the **Store Selector** dropdown in the header
2. Select any store from the list
3. All dashboard data will update to show that store's information

### 4. Affiliate Management

**Affiliate Statuses:**
- `Pending` - New affiliate awaiting approval
- `Approved` - Active affiliate with dashboard access
- `Declined` - Rejected affiliate
- `Completed` - Fulfilled affiliate (if applicable)

**To manage affiliates:**

1. Navigate to **Affiliate Users**
2. Review pending applications
3. Approve or decline based on your criteria
4. Track affiliate performance and commissions

### 5. Processing Payouts

**To process affiliate payouts:**

1. Go to **Payouts**
2. Review pending payout requests
3. Verify commission calculations
4. Process payments through your preferred method
5. Mark payouts as complete

---

## Dashboard Overview (Home Page)

The Home dashboard displays key performance indicators:

### KPI Cards
- **Total Sales** - Sum of all paid orders
- **Fulfilled Orders** - Orders with complete fulfillment
- **Pending Shipments** - Orders awaiting shipment
- **Average Order Value** - Total sales / order count

### Charts
- **Sales Over Time** - Daily/weekly/monthly revenue trends
- **Order Status Distribution** - Breakdown by fulfillment status
- **Top Products** - Best-selling inventory items

### Filters
- **Date Range** - Filter data by time period
- **Store Selector** - View specific store data

---

## Inventory Management

### Viewing Inventory

1. Navigate to **Inventory** or **Inventory Management**
2. View all products with stock levels
3. Critical items (low stock) are highlighted

### Inventory Metrics
- **Available** - Ready to sell
- **Committed** - Reserved for orders
- **Incoming** - Expected from suppliers
- **On Hand** - Physical count
- **Reserved** - Held for specific purposes

### Adding/Editing Inventory (Admin Only)

1. Click "Add Inventory" button
2. Fill in required fields:
   - SKU
   - Product ID
   - Store URL
   - Quantity fields
3. Save to update database

---

## Shipment Tracking

### Viewing Shipments

1. Navigate to **Shipments**
2. View all orders with tracking information
3. Filter by status:
   - Pending
   - In Transit
   - Delivered
   - Exception

### Tracking Details
- Tracking number
- Carrier information
- Delivery status
- Estimated delivery date

---

## User Management

### Viewing Users

1. Navigate to **Manage Users**
2. View all registered users
3. Filter by role (admin/user)
4. Search by email or name

### User Actions
- **Edit** - Modify user details
- **Approve/Decline** - Change affiliate status
- **Delete** - Remove user (use with caution)
- **Reset Password** - Trigger password reset

### Assigning Roles

To make a user an admin:

1. Find the user in Manage Users
2. Edit their profile
3. Change role to "admin"
4. Save changes

**Via SQL (if UI unavailable):**
```sql
UPDATE "user"
SET role = 'admin',
    visible_pages = ARRAY['/home', '/manage-users', '/inventory', '/shipments', '/onboarding', '/affiliate-users', '/referrals', '/payouts', '/settings']
WHERE email = 'admin@example.com';
```

---

## Troubleshooting

### User Can't See Their Store Data

1. Check if user has "Approved" status
2. Verify `store_to_user` table has their link
3. Run SQL repair script if needed:
   ```sql
   -- Check store_to_user links
   SELECT u.email, s.store_url
   FROM "user" u
   LEFT JOIN store_to_user stu ON stu.user_id = u.id
   LEFT JOIN stores s ON s.id = stu.store_id
   WHERE u.email = 'user@example.com';
   ```

### Orders Not Showing

1. Verify the store has synced with Shopify
2. Check webhook logs in `webhooks` table
3. Ensure store_url matches exactly in queries
4. Check date filters aren't excluding data

### Inventory Not Updating

1. Check if `is_inventory_fetched` is true in `stores` table
2. Review webhook logs for `INVENTORY_LEVELS_UPDATE` events
3. Verify inventory_id matches between Shopify and database

### Login Issues

1. Verify user exists in Supabase Auth
2. Check if user record exists in `user` table
3. Ensure email is confirmed in Supabase
4. Try password reset if needed

---

## Database Maintenance

### Running Analysis Scripts

1. Open Supabase Dashboard → SQL Editor
2. Copy scripts from `docs/database-analysis-script.sql`
3. Run to check:
   - Row counts
   - Orphaned data
   - Data freshness
   - Index status

### Running Repair Scripts

1. Open Supabase Dashboard → SQL Editor
2. Copy scripts from `docs/07-SQL-REPAIR-SCRIPTS.sql`
3. Run each section carefully:
   - Preview queries first (SELECT statements)
   - Execute repairs (INSERT/UPDATE statements)
   - Verify results

### Backup Recommendations

Before any maintenance:
1. Export affected tables
2. Note current row counts
3. Run repairs in staging first if possible

---

## Security Best Practices

### For Admins

1. **Use strong passwords** - Minimum 12 characters, mixed case, numbers, symbols
2. **Enable 2FA** - When available through Supabase
3. **Audit access** - Regularly review who has admin access
4. **Monitor logs** - Check for unusual activity

### System Security

1. **API Keys** - Never expose in logs or frontend code
2. **Service Role Key** - Only use server-side
3. **RLS Policies** - Verify Row Level Security is enforced
4. **Webhook Validation** - Ensure Shopify HMAC validation is working

---

## Contact & Support

For technical issues:
1. Check this documentation first
2. Review `docs/05-INCONSISTENCIES-AND-RECOMMENDATIONS.md` for known issues
3. Contact the development team

For business questions:
- Contact your Commercive account manager
