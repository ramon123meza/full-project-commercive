# Dashboard Enhancement Quick Reference

## What Changed

### Main Dashboard File
**Location**: `/home/user/full-project-commercive/commercive-app-v2-main/app/routes/app._index.tsx`

### CSS Enhancements
**Location**: `/home/user/full-project-commercive/commercive-app-v2-main/app/routes/global.css`

## New Dashboard Sections (in order of appearance)

### 1. Store Connection Banner
```
✓ Shows: Store connected status
✓ Displays: Last sync time
✓ Action: Refresh Data button
```

### 2. Key Metrics (4 Cards)
```
┌─────────────────────┬─────────────────────┬─────────────────────┬─────────────────────┐
│   Total Orders      │  Active Shipments   │  Inventory Items    │     This Week       │
│                     │                     │                     │                     │
│      [NUMBER]       │      [NUMBER]       │      [NUMBER]       │      [NUMBER]       │
│   [+/- X%] vs last  │  [X] in transit     │  [X] low stock     │  orders received    │
│      week           │                     │     alerts          │                     │
└─────────────────────┴─────────────────────┴─────────────────────┴─────────────────────┘
```

### 3. Shipment Status Overview
```
Progress bars showing distribution:
- Delivered: [========= X%]
- In Transit: [===== X%]
- Fulfilled: [======= X%]
- Pending: [=== X%]
- Other: [= X%]
```

### 4. Recent Orders Table
```
Columns: Order | Date | Total | Fulfillment | Payment | Customer
Shows: Last 10 orders with badges for status
```

### 5. Low Stock Alerts (if any items < 10 units)
```
⚠️ Warning Banner: "You have X items with low stock levels"
Table: Product (with image) | SKU | Available (with badge)
```

### 6. Recent Fulfillments Table
```
Columns: Order | Tracking Number | Carrier | Status | Date
Shows: Last 5 fulfillments
```

### 7. Quick Actions
```
[Open Full Dashboard] [Sync Data] [Manage Orders] [Manage Inventory]
```

### 8. Support Section
```
Help resources with:
- Contact Support (email)
- Learn More (external link)
```

## Badge Color Coding

| Status | Color | Used For |
|--------|-------|----------|
| Success (Green) | ✓ | Fulfilled orders, Paid status, Delivered shipments |
| Critical (Red) | ✗ | Unfulfilled, Pending payments, Out of stock |
| Warning (Yellow) | ⚠ | Low stock items (< 10 units) |
| Info (Blue) | ℹ | In-transit shipments, Partial fulfillment |
| Attention (Orange) | ! | Pending shipments |

## Data Sources

### From Supabase `order` table:
- order_number
- created_at
- total_order_value
- currency
- fulfillment_status
- financial_status
- customer_email

### From Supabase `trackings` table:
- order_id
- tracking_number
- tracking_company
- shipment_status
- status
- created_at

### From Supabase `inventory` table:
- product_name
- variant_name
- sku
- product_image
- inventory_level (JSON parsed for available quantity)

### From Supabase `stores` table:
- created_at (last sync)
- is_inventory_fetched

## Calculated Metrics

### Order Trend
```javascript
Formula: ((thisWeekCount - lastWeekCount) / lastWeekCount) * 100
Display: "+X%" (green badge) or "-X%" (red badge)
```

### Week Definition
- This Week: From Sunday 00:00:00 to now
- Last Week: From previous Sunday to this Sunday

### Low Stock Threshold
- Items with available quantity < 10 units
- Sorted by quantity (lowest first)
- Shows top 10 items

### Shipment Status Categories
```javascript
if (status.includes("transit") || status.includes("shipping")) → In Transit
else if (status.includes("delivered")) → Delivered
else if (status.includes("pending")) → Pending
else if (status.includes("success") || status.includes("fulfilled")) → Fulfilled
else → Other
```

## Responsive Behavior

### Desktop (md+)
- 4 metric cards in a row
- 5 shipment status columns
- Full tables with all columns

### Tablet (sm)
- 2 metric cards per row
- 2 shipment status columns per row
- Full tables

### Mobile (xs)
- 1 card per row (stacked)
- 1 shipment status per row (stacked)
- Tables scroll horizontally

## Action Buttons & Links

| Button | Action | Opens |
|--------|--------|-------|
| Refresh Data | Reloads page | Current page |
| Open Full Dashboard | Opens external | https://dashboard.commercive.co |
| View All Orders | Opens external | https://dashboard.commercive.co |
| View All Tracking | Opens external | https://dashboard.commercive.co |
| Manage Orders | Opens external | https://dashboard.commercive.co/orders |
| Manage Inventory | Opens external | https://dashboard.commercive.co/inventory |
| Contact Support | Opens email | mailto:support@commercive.co |
| Learn More | Opens external | https://commercive.co |

## CSS Enhancements

### Added Styles
- Card hover effects (box-shadow transition)
- Button hover animation (translateY)
- DataTable cell vertical alignment
- Badge font weight
- Progress bar spacing
- Responsive text sizing
- Banner spacing

## Key Dependencies

```json
{
  "@shopify/polaris": "^12.0.0",
  "@shopify/app-bridge-react": "^4.1.2",
  "@remix-run/react": "^2.7.1",
  "@supabase/supabase-js": "^2.47.8"
}
```

## No Breaking Changes
✓ All existing functionality preserved
✓ No database schema changes required
✓ No new environment variables needed
✓ Backward compatible with existing data
✓ No additional npm packages required

## Performance Notes
- Single loader call fetches all data
- Database queries use specific field selection (no SELECT *)
- Result limits applied (10 orders, 10 low stock, 5 fulfillments)
- No real-time polling (data refreshes on page load)

## Testing Checklist
- [ ] Display with 0 orders
- [ ] Display with 1000+ orders
- [ ] Low stock alerts appear correctly
- [ ] Badges show correct colors
- [ ] Currency formatting works with USD, EUR, etc.
- [ ] Mobile responsive layout
- [ ] All buttons/links work
- [ ] Refresh functionality
- [ ] Week-over-week calculation accuracy
- [ ] Image loading in low stock table
- [ ] Empty states display properly
