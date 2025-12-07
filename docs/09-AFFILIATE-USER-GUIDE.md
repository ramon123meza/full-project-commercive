# Affiliate User Guide - Commercive Dashboard

## Overview

This guide is for **affiliates** (store owners/merchants) using the Commercive Dashboard. After installing the Commercive Shopify app, you'll have access to view your store data, track inventory, monitor shipments, and more.

---

## Getting Started

### Step 1: Install the Shopify App

1. Visit the Commercive app listing in the Shopify App Store
2. Click "Add app" to install on your store
3. Authorize the required permissions
4. Wait for initial data sync to complete

### Step 2: Access Your Dashboard

1. Navigate to `https://dashboard.commercive.co`
2. Click "Create an account" or "Sign In"
3. Use the email associated with your Shopify store
4. Complete the signup process if first time

### Step 3: Wait for Approval

- Your account starts with "Pending" status
- An admin will review and approve your account
- You'll receive email notification when approved
- Once approved, you can access your store data

---

## Dashboard Overview

### Home Page

Your home dashboard shows key metrics for your store:

#### Key Performance Indicators (KPIs)

| Metric | Description |
|--------|-------------|
| **Total Sales** | Revenue from paid orders in selected period |
| **Fulfilled Orders** | Orders that have been shipped |
| **Pending Shipments** | Orders awaiting fulfillment |
| **Average Order Value** | Total sales divided by number of orders |

#### Charts and Graphs

- **Sales Trend** - Visual representation of your sales over time
- **Order Status** - Breakdown of orders by fulfillment status
- **Top Products** - Your best-selling items

#### Using Filters

1. **Date Range** - Click to select custom date range
2. Use preset options: Today, Last 7 Days, Last 30 Days, This Month
3. All dashboard data updates based on your selection

---

## Inventory Management

### Viewing Your Inventory

1. Navigate to **Inventory** from the sidebar
2. View all your products with current stock levels
3. Use search to find specific products by SKU or name

### Understanding Stock Levels

| Field | Meaning |
|-------|---------|
| **Available** | Quantity ready to sell |
| **Committed** | Reserved for pending orders |
| **Incoming** | Expected from suppliers |
| **On Hand** | Physical count in warehouse |
| **Reserved** | Held for specific purposes |

### Critical Items

Products with low stock are highlighted as "Critical Items":
- Red indicator for out-of-stock (0 available)
- Orange indicator for low stock (below threshold)

### Taking Action on Low Stock

1. Review critical items list
2. Note which products need reordering
3. Contact your supplier or adjust Shopify inventory
4. Dashboard updates automatically via webhooks

---

## Shipment Tracking

### Viewing Shipments

1. Navigate to **Shipments** from the sidebar
2. View all orders with tracking information
3. Filter by status to find specific shipments

### Shipment Statuses

| Status | Description |
|--------|-------------|
| **Pending** | Fulfillment not yet started |
| **In Transit** | Package on the way |
| **Out for Delivery** | Package arriving today |
| **Delivered** | Successfully delivered |
| **Exception** | Delivery issue (investigate) |

### Tracking Details

Each shipment shows:
- Order number
- Customer information
- Tracking number
- Carrier (FedEx, UPS, USPS, etc.)
- Current status
- Estimated delivery date

---

## Understanding Your Data

### Where Does the Data Come From?

Your dashboard data comes directly from your Shopify store:

```
Your Shopify Store
      ↓
  Commercive App (installed in your store)
      ↓
  Processes and stores in database
      ↓
  Dashboard displays the data
```

### How Often is Data Updated?

- **Immediately** - When orders are placed, fulfilled, or changed
- **Webhooks** - Shopify notifies the app of changes in real-time
- **Initial Sync** - All existing data synced when app is installed

### Data Refresh

If you notice data isn't current:
1. Wait a few minutes (webhooks may be processing)
2. Refresh the browser page
3. If still not updated, contact support

---

## Managing Your Store

### Selecting Your Store

If you have multiple stores:
1. Use the **Store Selector** dropdown in the header
2. Select the store you want to view
3. Dashboard data updates to show that store

### Store Information

Your store details include:
- Store URL (your Shopify domain)
- Store name
- Sync status
- Last data update

---

## Account Settings

### Updating Your Profile

1. Navigate to **Settings** (if available)
2. Update your:
   - Name
   - Email (may require verification)
   - Phone number
   - Password

### Changing Password

1. Go to Settings
2. Click "Change Password"
3. Enter current password
4. Enter new password (twice)
5. Save changes

### Email Notifications

Configure what notifications you receive:
- Order alerts
- Inventory warnings
- Payout notifications
- System updates

---

## Frequently Asked Questions

### Q: Why can't I see my store data?

**A:** Several reasons:
1. Your account may still be "Pending" - wait for admin approval
2. Your account may not be linked to your store - contact support
3. Initial sync may still be in progress - wait a few minutes

### Q: My order count seems wrong

**A:** Check:
1. Date filters - ensure correct date range is selected
2. Financial status - dashboard may only show "paid" orders
3. Recent orders may take a few minutes to sync

### Q: Inventory levels don't match Shopify

**A:** This can happen if:
1. You recently updated inventory in Shopify (wait for sync)
2. Webhook delivery was delayed
3. There's a timezone difference in timestamps

Contact support if discrepancy persists.

### Q: I installed the app but can't log in

**A:** Steps to resolve:
1. Use the email from your Shopify store
2. Try the password reset function
3. Check spam folder for verification emails
4. Contact admin if issue persists

### Q: How do I add another team member?

**A:** Currently, each store has one primary user. Contact support for:
- Additional user accounts
- Team member access
- Multi-user requirements

### Q: Why is my affiliate status "Pending"?

**A:** New accounts start as "Pending" for security. An admin will:
1. Review your application
2. Verify your store information
3. Approve your account
4. You'll receive email notification

---

## Tips for Success

### Optimize Your Dashboard Use

1. **Check daily** - Monitor sales and inventory regularly
2. **Set date ranges** - Use custom ranges for reporting periods
3. **Watch critical items** - Reorder before stockouts
4. **Track shipments** - Stay on top of delivery issues

### Best Practices

1. **Keep Shopify updated** - Dashboard accuracy depends on Shopify data
2. **Fulfill orders promptly** - Tracking info updates on fulfillment
3. **Monitor low stock** - Prevent missed sales
4. **Review regularly** - Weekly check of all metrics

### Common Workflows

**Daily Check:**
1. Open dashboard
2. Review today's orders
3. Check pending shipments
4. Note any critical inventory

**Weekly Review:**
1. Set date range to "Last 7 Days"
2. Review sales trends
3. Check fulfillment rate
4. Plan inventory restocking

---

## Getting Help

### Self-Service Resources

1. Read this user guide
2. Check FAQ section above
3. Review error messages carefully

### Contacting Support

If you need additional help:
1. Note your store URL
2. Describe the issue in detail
3. Include screenshots if possible
4. Contact support through provided channels

### Reporting Issues

When reporting bugs:
1. What page were you on?
2. What action were you trying to do?
3. What happened vs. what you expected?
4. Any error messages shown?

---

## System Requirements

### Browser Compatibility

For best experience, use:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

### Mobile Access

The dashboard is responsive and works on:
- Tablets (iPad, Android tablets)
- Mobile phones
- Recommended: Use larger screens for detailed data review

### Internet Connection

- Stable internet connection required
- Recommended: Minimum 5 Mbps
- Dashboard uses real-time data fetching

---

Thank you for using Commercive! We're here to help you manage your e-commerce business more effectively.
