# Affiliate User Guide - Commercive Dashboard

## Overview

This guide is for **affiliates** (store owners/merchants) using the Commercive Dashboard. This guide explains how to sign up, get approved, connect your Shopify store, and use all dashboard features.

---

## Getting Started - Complete Flow

### Step-by-Step Journey

```
┌─────────────────────────────────────────────────────────────────────┐
│                     YOUR JOURNEY TO FULL ACCESS                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  STEP 1: CREATE ACCOUNT                                             │
│  ────────────────────────                                           │
│  • Visit dashboard.commercive.co                                    │
│  • Click "Create an account"                                        │
│  • Fill in: First name, Last name, Email, Phone, Password           │
│  • Submit form                                                       │
│                                                                      │
│  EXPECTED: Success modal shows "Check Your Email"                   │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  STEP 2: VERIFY EMAIL                                               │
│  ───────────────────────                                            │
│  • Check your email inbox (and spam folder)                         │
│  • Click the verification link in the email                         │
│  • You'll be redirected to login page                               │
│                                                                      │
│  EXPECTED: Login modal opens automatically with success message     │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  STEP 3: LOG IN & WAIT FOR APPROVAL                                 │
│  ─────────────────────────────────────                              │
│  • Enter your email and password                                    │
│  • Click "Sign In"                                                   │
│                                                                      │
│  EXPECTED: "Account Pending Approval" screen                        │
│  ─────────────────────────────────────────                          │
│  You'll see a message explaining:                                   │
│  • Your account is being reviewed by an administrator               │
│  • Typical approval time: 24-48 hours                               │
│  • You'll be notified when approved                                 │
│                                                                      │
│  NOTE: This is NORMAL - all new accounts require admin approval     │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  STEP 4: AFTER APPROVAL - CONNECT SHOPIFY                           │
│  ─────────────────────────────────────────────                      │
│  • Once approved, log in again                                      │
│                                                                      │
│  EXPECTED: "Connect Your Shopify Store" screen                      │
│  ───────────────────────────────────────────────                    │
│  You'll see:                                                         │
│  • Instructions to install the Commercive app                       │
│  • "Install Commercive App" button                                  │
│  • 4-step installation guide                                        │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  STEP 5: INSTALL SHOPIFY APP                                        │
│  ─────────────────────────────                                      │
│  • Click "Install Commercive App"                                   │
│  • You'll be taken to Shopify App Store                            │
│  • Click "Add app" on your Shopify store                           │
│  • Authorize the required permissions                               │
│  • Wait for initial data sync                                       │
│                                                                      │
│  EXPECTED: App installation completes, data starts syncing          │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  STEP 6: FULL DASHBOARD ACCESS                                      │
│  ───────────────────────────────                                    │
│  • Return to dashboard.commercive.co                                │
│  • Log in with your credentials                                     │
│                                                                      │
│  EXPECTED: Full dashboard with your store data                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Expected Behaviors by Screen

### 1. Login Page (`/login`)

| What You Do | What Should Happen |
|-------------|-------------------|
| Visit the page | Landing page with features and "Sign In" / "Create an account" buttons |
| Click "Sign In" | Login modal opens |
| Enter wrong password | Error: "Invalid login credentials" |
| Enter unverified email | Error: "Your email is not confirmed" |
| Coming from email verification | Modal opens automatically with "Email verified!" toast |

### 2. Signup Page (`/signUp`)

| What You Do | What Should Happen |
|-------------|-------------------|
| Leave fields empty | "Create Account" button stays disabled |
| Enter weak password | Password strength shows "Weak" in red |
| Enter strong password | Password strength shows "Strong" in green |
| Submit complete form | Success modal: "Account Created Successfully!" |
| Try existing email | Error: "This email is already registered" |

**After Signup, the system creates:**
- Your login credentials (Supabase auth)
- Your user profile (name, email, phone)
- Your affiliate record (status: Pending)
- Your unique Affiliate ID (format: AFF-XXXXXXXX)

### 3. Account Pending Approval Screen

**When you see this:** After logging in for the first time (before admin approval)

| Element | Expected Content |
|---------|-----------------|
| Title | "Account Pending Approval" |
| Message | Explanation that admin is reviewing your account |
| Timeline | "Typically reviewed within 24-48 hours" |
| Action | Wait for admin approval |

**This is normal!** All new accounts must be approved by an administrator for security.

### 4. Connect Your Shopify Store Screen

**When you see this:** After your account is approved, but before connecting Shopify

| Element | Expected Content |
|---------|-----------------|
| Title | "Connect Your Shopify Store" |
| Message | Instructions to install the Commercive app |
| Button | "Install Commercive App" → Links to Shopify App Store |
| Steps | 4-step guide for installation |

**Why this step?** The dashboard needs access to your Shopify store data to show inventory, orders, and shipments.

### 5. Full Dashboard (After Everything is Set Up)

| Section | What You Should See |
|---------|-------------------|
| Home/Dashboard | KPIs (sales, orders, shipments), charts, recent activity |
| Inventory | All your products with stock levels |
| Shipments | Orders with tracking information |
| Partners | Your referral program (if applicable) |

---

## Dashboard Features Guide

### Home Dashboard

| Component | Expected Behavior |
|-----------|-------------------|
| **Total Sales** | Sum of all paid orders in selected date range |
| **Fulfilled Orders** | Count of orders that have been shipped |
| **Pending Shipments** | Orders waiting to be fulfilled |
| **Average Order Value** | Total sales ÷ Number of orders |
| **Date Filter** | Click to change date range (Today, 7 days, 30 days, Custom) |
| **Sales Chart** | Visual graph of sales over time |

### Inventory Page

| Action | Expected Result |
|--------|-----------------|
| View page | Table of all your products |
| Click product row | Modal opens with full details |
| View "Critical Items" | Products low on stock highlighted |
| Search | Filter products by name or SKU |

**Stock Level Columns:**
| Column | Meaning |
|--------|---------|
| Available | Ready to sell right now |
| Committed | Reserved for existing orders |
| Incoming | Expected from suppliers |
| On Hand | Physical count in warehouse |

### Shipments Page

| Action | Expected Result |
|--------|-----------------|
| View page | All orders with tracking info |
| Filter by status | Show only Pending/In Transit/Delivered |
| Click order | See full tracking details |

**Tracking Statuses:**
| Status | Meaning |
|--------|---------|
| Pending | Not yet shipped |
| In Transit | Package on the way |
| Out for Delivery | Arriving today |
| Delivered | Successfully delivered |
| Exception | Delivery issue - investigate |

---

## Affiliate Program (If Enrolled)

### Your Affiliate Link

After approval, you'll receive a unique affiliate link:
```
https://dashboard.commercive.co/affiliate-form?ref=AFF-XXXXXXXX
```

Share this link to:
- Refer new customers
- Earn commissions on their orders
- Track your referral performance

### Viewing Your Referrals

Go to **Partners** section to see:
- Total referrals
- Commission earned
- Customer list
- Order history from referrals

### Commission Structure

| Method | How It Works |
|--------|--------------|
| Per Order | Fixed $ amount for each order |
| Percentage | % of order total |
| Default | 1% of order total if not configured |

---

## Troubleshooting

### "I signed up but didn't receive verification email"

1. Check your spam/junk folder
2. Wait 5 minutes (email servers can be slow)
3. Try signing up again with the same email
4. Contact support if still not received

### "I'm stuck on 'Pending Approval' for more than 48 hours"

1. This is normal - admins review accounts manually
2. Check your email for any communication from admin
3. Contact support with your email address

### "I'm approved but see 'Connect Shopify' instead of dashboard"

1. This is correct! You need to install the Shopify app first
2. Click "Install Commercive App"
3. Complete the Shopify authorization
4. Return to dashboard

### "My data isn't showing after installing the app"

1. Initial sync can take a few minutes
2. Refresh the page after 2-3 minutes
3. Check that you authorized all permissions in Shopify
4. Contact support if data doesn't appear after 10 minutes

### "My inventory numbers don't match Shopify"

1. Data syncs in real-time via webhooks
2. Recent changes may take 1-2 minutes to appear
3. Refresh the page to see latest data
4. Contact support if discrepancy persists

---

## Quick Reference Cards

### Your Account States

| Your State | What You See | What To Do |
|------------|--------------|------------|
| Just signed up | "Check your email" | Click verification link |
| Email verified | Login modal | Log in |
| Pending approval | "Account Pending Approval" | Wait for admin |
| Approved, no Shopify | "Connect Your Shopify Store" | Install app |
| Fully set up | Full dashboard | Use the platform! |

### Key URLs

| Purpose | URL |
|---------|-----|
| Dashboard | `dashboard.commercive.co` |
| Login | `dashboard.commercive.co/login` |
| Signup | `dashboard.commercive.co/signUp` |
| Shopify App | `apps.shopify.com/commercive` |

### Getting Help

1. **Read this guide** - Most answers are here
2. **Check FAQ section** - Common issues explained
3. **Contact support** - Provide your email and issue description

---

## Data Privacy & Security

### What Data We Access

When you connect your Shopify store, we access:
- Product and inventory data
- Order information
- Customer shipping addresses (for fulfillment)
- Store settings

### What We DON'T Access

- Payment/credit card information
- Customer passwords
- Your Shopify admin password

### Your Data Rights

- You can disconnect your store at any time
- Your data is encrypted in transit and at rest
- We don't sell your data to third parties

---

## Tips for Success

1. **Keep Shopify updated** - Dashboard accuracy depends on Shopify data
2. **Check inventory daily** - Prevent stockouts before they happen
3. **Monitor shipments** - Stay on top of delivery issues
4. **Review weekly** - Use date filters for period comparisons
5. **Use mobile** - Dashboard works on tablets and phones

---

Thank you for using Commercive! We're here to help you grow your e-commerce business.
