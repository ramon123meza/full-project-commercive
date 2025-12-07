# Admin User Guide - Commercive Dashboard

## Overview

This guide is for **administrators** of the Commercive Dashboard. Admins have full access to manage users, stores, affiliates, payouts, and all system settings.

---

## System Flow Overview

### How New Users Join the System

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER SIGNUP FLOW                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. User visits dashboard.commercive.co                             │
│                    ↓                                                 │
│  2. Clicks "Create an account"                                      │
│                    ↓                                                 │
│  3. Fills signup form (name, email, password, phone)                │
│                    ↓                                                 │
│  4. System creates:                                                  │
│     • Supabase auth user                                            │
│     • User table record                                             │
│     • Affiliates record (status: "Pending")                         │
│                    ↓                                                 │
│  5. User receives verification email                                │
│                    ↓                                                 │
│  6. User clicks verification link → Login modal opens               │
│                    ↓                                                 │
│  7. User logs in → Sees "Account Pending Approval" screen           │
│                    ↓                                                 │
│  8. ADMIN approves user in /admin/pending-accounts                  │
│                    ↓                                                 │
│  9. User refreshes → Sees "Connect Your Shopify Store" screen       │
│                    ↓                                                 │
│  10. User installs Shopify app → Full dashboard access              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Expected Behaviors by Section

### Login Page (`/login`)

| Action | Expected Behavior |
|--------|-------------------|
| Visit page | Landing page with hero section, features, stats displayed |
| Click "Sign In" | Login modal opens |
| Click "Create an account" | Redirects to `/signUp` |
| Enter valid credentials | Redirects to dashboard or appropriate locked screen |
| Enter invalid credentials | Error toast: "Invalid login credentials" |
| Email not verified | Error toast: "Your email is not confirmed" |
| After email verification redirect | Login modal auto-opens with success toast |

### Signup Page (`/signUp`)

| Action | Expected Behavior |
|--------|-------------------|
| Fill form completely | "Create Account" button becomes enabled |
| Submit valid form | Success modal shows "Check Your Email" message |
| Email already exists | Error toast: "This email is already registered" |
| Weak password | Real-time password strength indicator shows "Weak" |
| After signup | User record + Affiliate record (Pending) created |

### Admin Dashboard (`/home` for admins)

| Section | Expected Behavior |
|---------|-------------------|
| Recent Activity | Shows latest user signups, orders, and system events |
| KPI Cards | Displays total sales, orders, pending shipments, etc. |
| Store Selector | Dropdown to switch between all stores |
| Charts | Sales trends, order status distribution |

**Expected:** Admin sees data from ALL stores, not filtered by ownership.

### Pending Accounts (`/admin/pending-accounts`)

| Action | Expected Behavior |
|--------|-------------------|
| View page | Table shows ALL users with `affiliates.status = "Pending"` |
| No pending users | Message: "No pending accounts to review" |
| Click "Approve" | Approval modal opens with permission checkboxes |
| Approve user | Status changes to "Approved", user can proceed to next step |
| Decline user | Status changes to "Declined", user remains locked out |

**Expected Data Displayed:**
- Email (from `user.email`)
- Name (from `user.first_name` + `user.last_name`)
- Username (from `user.user_name`)
- Phone (from `user.phone_number`)
- Affiliate ID (from `affiliates.affiliate_id`)
- Signup Date (from `affiliates.created_at`)
- Status (from `affiliates.status`)

**If users don't appear here:**
1. Check if `user` table record exists for the user
2. Check if `affiliates` table record exists with `status = "Pending"`
3. Run SQL: `SELECT * FROM affiliates WHERE status = 'Pending';`

### Affiliate Users (`/admin/roles` → Affiliate tab)

| Column | Source | Expected Display |
|--------|--------|------------------|
| Email | `user.email` | User's email address |
| Name | `user.first_name` + `user.last_name` | Full name or username as fallback |
| Form URL | `affiliates.form_url` | Truncated URL or "N/A" |
| Affiliate ID | `affiliates.affiliate_id` | Format: `AFF-XXXXXXXX` |
| Status | `affiliates.status` | Pending/Approved/Declined/Completed |

**Expected:** All affiliates shown regardless of status.

### Partner Management (`/admin/partner`)

| Section | Expected Behavior |
|---------|-------------------|
| Partner List | Shows referrals grouped by affiliate with commission info |
| Partner Name | Displays `affiliate_name` (first_name + last_name) from referral_view |
| Partner Email | Displays `affiliate_email` from referral_view |
| Commission Rate | Shows rate based on `commission_method` (per order or %) |
| Total Earnings | Calculated commission based on referrals |

**Expected:** Partner names and emails show actual user info, not just IDs.

### Payout Management (`/admin/payout`)

| Action | Expected Behavior |
|--------|-------------------|
| View payouts | Table shows all payout requests with user info |
| User Email | Displayed from `user.email` via payout_view |
| Approve payout | Status changes from "Pending" to "Approved" |
| Complete payout | Status changes to "Completed" |

### Inventory Management (`/inventory-management`)

| Action | Expected Behavior |
|--------|-------------------|
| View inventory | All products displayed in responsive table |
| Click product | Modal opens showing full product details |
| On mobile | Modal scrolls properly, content not cut off |
| Critical items | Highlighted with warning indicators |
| Add inventory | Modal opens with form fields accessible on all screen sizes |

**Expected:** Modal max-height is `60vh` on mobile, allowing scroll through all fields.

### Shipments (`/shipments`)

| Action | Expected Behavior |
|--------|-------------------|
| View shipments | All orders with tracking info displayed |
| Filter by status | Shows only orders matching selected status |
| Tracking details | Carrier, tracking number, status, ETA shown |

---

## Database Queries for Troubleshooting

### Check if user exists and their status:
```sql
SELECT
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  u.role,
  a.affiliate_id,
  a.status as affiliate_status,
  COUNT(stu.store_id) as linked_stores
FROM "user" u
LEFT JOIN affiliates a ON a.user_id = u.id
LEFT JOIN store_to_user stu ON stu.user_id = u.id
WHERE u.email = 'user@example.com'
GROUP BY u.id, a.id;
```

### Check all pending approvals:
```sql
SELECT
  u.email,
  u.first_name || ' ' || u.last_name as full_name,
  a.affiliate_id,
  a.status,
  a.created_at
FROM affiliates a
JOIN "user" u ON u.id = a.user_id
WHERE a.status = 'Pending'
ORDER BY a.created_at DESC;
```

### Fix missing affiliate record for a user:
```sql
INSERT INTO affiliates (user_id, status, affiliate_id, created_at)
SELECT
  id,
  'Pending',
  'AFF-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 8)),
  NOW()
FROM "user"
WHERE id = 'USER_UUID_HERE'
AND NOT EXISTS (SELECT 1 FROM affiliates WHERE user_id = "user".id);
```

### View referrals with affiliate user info:
```sql
SELECT
  affiliate_name,
  affiliate_email,
  affiliate_id,
  customer_number,
  order_number,
  invoice_total,
  total_commission
FROM referral_view
ORDER BY created_at DESC
LIMIT 20;
```

---

## Common Issues and Solutions

### Issue: New user doesn't appear in Pending Accounts

**Cause:** Affiliate record wasn't created during signup (RLS restriction or error)

**Solution:**
1. The system now auto-creates affiliate record on first login (via layout.tsx)
2. If still missing, run the SQL fix above
3. Check Supabase logs for RLS policy errors

### Issue: User sees "Connect Shopify" instead of "Pending Approval"

**Cause:** This was a bug - the store check happened before approval check

**Solution:** Fixed in latest update. The flow is now:
1. Check approval status FIRST
2. If Pending → Show "Pending Approval"
3. If Approved but no store → Show "Connect Shopify"

### Issue: Affiliate page shows IDs instead of names

**Cause:** referral_view wasn't joining user table properly

**Solution:** Run the updated view creation SQL from `07-SQL-REPAIR-SCRIPTS.sql` Part 6

### Issue: Admin can't see certain users

**Cause:** User might not have records in required tables

**Solution:** Check:
1. `user` table has record
2. `affiliates` table has record
3. If user has store, `store_to_user` has record

---

## Admin Checklist for New User Approval

When reviewing a pending account:

- [ ] Verify email looks legitimate (not spam/test)
- [ ] Check if name is provided and reasonable
- [ ] Verify phone number format (optional)
- [ ] Review signup date (recent vs old pending)
- [ ] Select appropriate permissions:
  - [ ] Dashboard access (default: enabled)
  - [ ] Inventory access
  - [ ] Partner access
  - [ ] Support access (default: enabled)
- [ ] Click "Approve" to activate account

After approval, the user will:
1. See "Connect Your Shopify Store" screen
2. Install the Commercive Shopify app
3. Get full dashboard access

---

## Security Best Practices

1. **Review pending accounts regularly** - Don't let them pile up
2. **Verify suspicious signups** - Check email domain, name patterns
3. **Audit admin access** - Regularly review who has admin role
4. **Monitor recent activity** - Watch for unusual patterns
5. **Never share admin credentials** - Each admin should have own account

---

## Quick Reference: User States

| State | affiliates.status | store_to_user | What User Sees |
|-------|-------------------|---------------|----------------|
| New signup | Pending | No records | "Account Pending Approval" |
| Approved, no store | Approved | No records | "Connect Your Shopify Store" |
| Approved, has store | Approved | Has records | Full Dashboard |
| Declined | Declined | Any | Error/Locked out |
| Admin | N/A | N/A | Full Dashboard (all stores) |

---

## Contact & Support

For technical issues with the admin panel:
1. Check this documentation
2. Review `docs/07-SQL-REPAIR-SCRIPTS.sql` for database fixes
3. Check browser console for JavaScript errors
4. Review Supabase logs for backend errors
