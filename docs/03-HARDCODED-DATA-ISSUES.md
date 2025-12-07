# Hardcoded Data Issues

This document identifies hardcoded values in the codebase that may need to be made dynamic or configurable.

---

## Summary

| Severity | Count | Category |
|----------|-------|----------|
| Low | 8 | Marketing/Branding URLs |
| Low | 4 | Statistics Display |
| Medium | 3 | Configuration Constants |
| Low | 5 | External Service URLs |
| High | 1 | Security Issue |

---

## 1. Login Page Statistics (Marketing Data)

**Location:** `dashboard-commercive-main/src/app/login/page.tsx:67-70`

```typescript
const stats = [
  { value: 8000000, suffix: "+", label: "Orders Fulfilled", prefix: "" },
  { value: 99.9, suffix: "%", label: "SLA Performance", prefix: "" },
  { value: 65, suffix: "+", label: "Countries", prefix: "" },
  { value: 24, suffix: "/7", label: "Support", prefix: "" }
];
```

**Issue:** Marketing statistics are hardcoded and will not update as the business grows.

**Impact:**
- Numbers become outdated over time
- Requires code deployment to update marketing claims

**Recommendation:**
- Create a `marketing_stats` table in Supabase
- Or use environment variables for these values
- Or fetch from a CMS/admin panel

---

## 2. S3 Image URLs

**Location:** Multiple files in `dashboard-commercive-main/`

### Login Page Slideshow Images
**File:** `src/app/login/page.tsx:76-100`

```typescript
const slides = [
  { url: "https://commerciv-forms.s3.us-east-1.amazonaws.com/modern_computer_dashboards_business_ecommerce_analytics.jpg", title: "..." },
  { url: "https://commerciv-forms.s3.us-east-1.amazonaws.com/warehouse_packages_automated_system.jpg", title: "..." },
  // ... 5 more slides
];
```

### Logo Images
**File:** `src/app/login/page.tsx:546, 859, 893` and `src/app/layout.tsx:46`

```typescript
src="https://prompt-images-nerd.s3.us-east-1.amazonaws.com/ChatGPT+Image+14+nov+2025%2C+08_24_12.png"
```

### Dashboard Slideshow
**File:** `src/components/dashboard-slideshow.tsx:8-20`

```typescript
const slides = [
  { image: "https://prompt-images-nerd.s3.us-east-1.amazonaws.com/AdobeStock_1768494780.jpeg", ... },
  { image: "https://prompt-images-nerd.s3.us-east-1.amazonaws.com/AdobeStock_1618978684.jpeg", ... },
  { image: "https://prompt-images-nerd.s3.us-east-1.amazonaws.com/AdobeStock_214539382.jpeg", ... },
];
```

**Issue:** S3 bucket URLs are hardcoded throughout the application.

**Impact:**
- Changing S3 buckets requires code changes
- Cannot easily switch CDN providers
- URL structure changes require deployment

**Recommendation:**
- Use environment variable: `NEXT_PUBLIC_ASSET_BASE_URL`
- Store image paths in database and construct full URLs dynamically
- Consider using Next.js Image component with a configured loader

---

## 3. External Website URLs

**Location:** `dashboard-commercive-main/src/app/(public)/affiliate-form/page.tsx`

```typescript
// Line 164
href="https://commercive.co"

// Line 336-340
<a href="https://commercive.co/privacy" className="text-blue-600">
<a href="https://commercive.co/terms" className="text-blue-600">
```

**Also in Shopify App:** `commercive-app-v2-main/app/routes/app._index.tsx`

```typescript
// Links to dashboard
href="https://dashboard.commercive.co"
href="https://dashboard.commercive.co/orders"
href="https://dashboard.commercive.co/inventory"
href="https://commercive.co"
```

**Issue:** Domain URLs are hardcoded.

**Impact:**
- Staging/development environments link to production
- Domain changes require code updates

**Recommendation:**
- Use environment variables:
  - `NEXT_PUBLIC_MAIN_WEBSITE_URL`
  - `NEXT_PUBLIC_DASHBOARD_URL`

---

## 4. Forecast API Configuration Constants

**Location:** `dashboard-commercive-main/src/app/api/forecast/route.ts`

```typescript
const ANALYSIS_PERIOD_DAYS = 30;
const SAFETY_STOCK_DAYS = 7;
const DEFAULT_LEAD_TIME_DAYS = 14;
const CRITICAL_THRESHOLD_DAYS = 7;
const WARNING_THRESHOLD_DAYS = 14;
```

**Issue:** Business logic parameters are hardcoded.

**Impact:**
- Different stores may need different thresholds
- Cannot adjust without deployment
- No admin control over forecasting behavior

**Recommendation:**
- Store in database per-store settings table
- Or expose via admin panel configuration
- At minimum, use environment variables

---

## 5. Map Tile URLs

**Location:** Various Leaflet map components

```typescript
// CartoDB Light
"https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"

// CartoDB Dark
"https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"

// ArcGIS
"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/..."
```

**Issue:** Map tile provider URLs are hardcoded.

**Impact:**
- Cannot switch map providers without code changes
- Provider rate limits may require different tiles

**Recommendation:**
- Use environment variable for tile URL template
- Low priority since these are standard free services

---

## 6. Email Configuration

**Location:** `dashboard-commercive-main/src/app/actions.ts`

```typescript
from: "noreply@commercive.co"
```

**Issue:** Sender email is hardcoded.

**Impact:**
- Cannot change sender email without deployment

**Recommendation:**
- Use environment variable: `EMAIL_FROM_ADDRESS`

---

## 7. Currency API URL

**Location:** `commercive-app-v2-main/app/utils/transformDataHelpers.tsx`

```typescript
const response = await fetch(
  `https://api.currencyfreaks.com/v2.0/rates/latest?apikey=${process.env.CURRENCY_API_KEY}`
);
```

**Issue:** API endpoint is hardcoded.

**Impact:**
- Cannot switch currency providers easily

**Recommendation:**
- Use environment variable: `CURRENCY_API_URL`
- Low priority since this is unlikely to change

---

## 8. Default Email Domain for Shopify Merchants

**Location:** `commercive-app-v2-main/app/utils/createDashboardUser.ts`

```typescript
const email = `${shopDomain}@shopify-merchant.commercive.co`;
```

**Issue:** Default email domain for auto-created users is hardcoded.

**Impact:**
- Cannot change the email format without deployment

**Recommendation:**
- Use environment variable: `DEFAULT_MERCHANT_EMAIL_DOMAIN`

---

## 9. CRITICAL: Supabase Secret Key Logging

**Location:** `commercive-app-v2-main/app/supabase.server.ts:6`

```typescript
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY!;
console.log(SUPABASE_SECRET_KEY);  // <-- SECURITY ISSUE!
```

**Issue:** The Supabase service role key is logged to console.

**Impact:**
- **HIGH SECURITY RISK**: Secret key exposed in server logs
- Could be visible in Vercel logs, CI/CD output, monitoring systems
- If logs are compromised, attackers gain full database access

**Recommendation:**
- **IMMEDIATELY REMOVE** this console.log statement
- Audit logs for any exposure
- Consider rotating the Supabase service role key

---

## 10. Mock/Test Data in Code

**Location:** `commercive-app-v2-main/app/types/payload.tsx`

```typescript
const mockStoreInfo = {
  shop: {
    name: "For_Commercive",
    email: "laktionovvladlen1@gmail.com",  // Real email in code!
    myshopifyDomain: "for-commercive.myshopify.com",
    // ...
  },
};
```

**Issue:** Test data with real email address in source code.

**Impact:**
- Real email exposed in repository
- Confusion if mock data is accidentally used

**Recommendation:**
- Use placeholder email like `test@example.com`
- Move mock data to separate test fixtures

---

## Summary of Required Actions

### Immediate (High Priority)

1. **Remove console.log of SUPABASE_SECRET_KEY**
   - File: `commercive-app-v2-main/app/supabase.server.ts:6`
   - Action: Delete the line

### Short-term (Medium Priority)

2. **Create environment variables for URLs**
   - `NEXT_PUBLIC_MAIN_WEBSITE_URL`
   - `NEXT_PUBLIC_DASHBOARD_URL`
   - `NEXT_PUBLIC_ASSET_BASE_URL`

3. **Externalize forecast configuration**
   - Move thresholds to database or environment

### Long-term (Low Priority)

4. **Make marketing stats dynamic**
   - Create admin panel or CMS integration

5. **Centralize asset management**
   - Consider CDN configuration
   - Database-driven image URLs

---

## Data Display Verification

### Is Order Data Dynamic?
**YES** - Orders are fetched from the `order` table filtered by `store_url`:

```typescript
// dashboard-commercive-main/src/app/(authentificated)/home/page.tsx
const { data: ordersRes } = await supabase
  .from("order")
  .select("*")
  .gte("created_at", startDate)
  .lte("created_at", endDate)
  .eq("store_url", storeUrl)
  .eq("financial_status", "paid");
```

### Is Inventory Data Dynamic?
**YES** - Inventory is fetched from the `inventory` table:

```typescript
// dashboard-commercive-main/src/app/(authentificated)/inventory/page.tsx
const { data } = await supabase
  .from("inventory")
  .select("*")
  .eq("store_url", storeUrl);
```

### Is Tracking Data Dynamic?
**YES** - Tracking data is fetched from the `trackings` table:

```typescript
// dashboard-commercive-main/src/app/(authentificated)/shipments/page.tsx
const { data: trackings } = await supabase
  .from("trackings")
  .select("*, order(*)")
  .eq("store_url", storeUrl);
```

### Conclusion on Dynamic Data
All core business data (orders, inventory, shipments) is properly fetched from the database. The hardcoded values are primarily:
- Marketing/branding content
- Configuration constants
- External service URLs

The system correctly relies on webhooks from Shopify to populate data that is then displayed dynamically in the dashboard.
