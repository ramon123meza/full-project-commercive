# Permission System Usage Guide

This guide explains how to use the affiliate approval flow and permissions system implemented in the dashboard.

## Overview

The permission system allows admins to:
1. Review and approve new user signups
2. Assign specific access permissions to users
3. Control which sections of the dashboard users can access

## User Flow

### 1. User Signup
When a user signs up:
- Their account is created with `status: "Pending"` in the `affiliates` table
- They receive a confirmation email
- Upon email verification, they see a "Pending Approval" screen
- Admin is notified of the new account (via `/api/notify-admin-new-account`)

### 2. Admin Approval
Admins can review pending accounts at `/admin/pending-accounts`:
- View all pending user accounts
- Review user information (name, email, phone, affiliate ID)
- Approve or decline accounts
- Assign permissions when approving:
  - **Inventory Access**: For clients who hold stock
  - **Dashboard Access**: Analytics and main dashboard features
  - **Partners/Affiliate Access**: Manage affiliate links and commissions
  - **Support Access**: Submit and manage support tickets

### 3. User Access
After approval:
- User can log in and access approved sections
- Attempting to access restricted sections shows a locked screen
- Admin users have access to all sections

## Implementation Guide

### For Page-Level Protection

To protect an entire page, wrap the content in the authenticated layout (already implemented):

```tsx
// File: /app/(authentificated)/layout.tsx
// This automatically checks if user is approved before rendering any authenticated pages
```

### For Section-Level Protection

Use the `ProtectedResource` component to protect specific sections:

```tsx
import ProtectedResource from "@/components/ui/ProtectedResource";

function MyComponent() {
  return (
    <div>
      {/* Public section - always visible */}
      <h1>Welcome to Dashboard</h1>

      {/* Protected section - only visible if user has inventory permission */}
      <ProtectedResource
        permission="inventory"
        resourceName="Inventory Management"
      >
        <InventorySection />
      </ProtectedResource>

      {/* Another protected section */}
      <ProtectedResource
        permission="partners"
        resourceName="Partner Program"
      >
        <PartnersSection />
      </ProtectedResource>
    </div>
  );
}
```

### Using Permission Hooks

For more granular control, use the `usePermissions` hook:

```tsx
import { usePermissions } from "@/hooks/usePermissions";

function MyComponent() {
  const { permissions, hasPermission, isApproved } = usePermissions();

  // Check if user is approved
  if (!isApproved) {
    return <div>Your account is pending approval</div>;
  }

  // Check specific permissions
  if (hasPermission("inventory")) {
    return <InventoryDashboard />;
  }

  // Access all permissions
  return (
    <div>
      {permissions.dashboard && <DashboardWidget />}
      {permissions.partners && <PartnersWidget />}
      {permissions.support && <SupportWidget />}
    </div>
  );
}
```

## Available Permissions

```typescript
type PermissionType = "inventory" | "dashboard" | "partners" | "support";
```

- `inventory`: Access to inventory management (for clients who hold stock)
- `dashboard`: Access to main dashboard and analytics
- `partners`: Access to affiliate/partner program features
- `support`: Access to support ticket system

## Admin Features

### Pending Accounts Page
Location: `/admin/pending-accounts`

Features:
- View all accounts awaiting approval
- See user details (name, email, phone, affiliate ID, signup date)
- Approve accounts with permission assignment
- Decline accounts

### Users & Roles Page
Location: `/admin/roles`

Features:
- View all affiliates (approved, pending, declined)
- Edit existing user permissions
- Update affiliate status
- Manage affiliate IDs and form URLs

## Database Schema

### Affiliates Table
- `status`: Enum - "Pending" | "Approved" | "Declined"
- Controls whether user can access the dashboard

### User Table
- `visible_pages`: String array - ["inventory", "dashboard", "partners", "support"]
- Controls which sections the user can access

### Permission Mapping
When a user is approved with specific permissions, the system:
1. Updates `affiliates.status` to "Approved"
2. Updates `user.visible_pages` with the selected permissions
3. If "dashboard" is selected, both "dashboard" and "home" are added to visible_pages

## Example Scenarios

### Scenario 1: Client with Inventory
```typescript
// Admin approves with permissions:
permissions = {
  inventory: true,
  dashboard: true,
  partners: false,
  support: true
}

// Results in user.visible_pages:
["inventory", "dashboard", "home", "support"]
```

### Scenario 2: Affiliate Partner (No Inventory)
```typescript
// Admin approves with permissions:
permissions = {
  inventory: false,
  dashboard: true,
  partners: true,
  support: true
}

// Results in user.visible_pages:
["dashboard", "home", "partners", "support"]
```

### Scenario 3: Support-Only User
```typescript
// Admin approves with permissions:
permissions = {
  inventory: false,
  dashboard: false,
  partners: false,
  support: true
}

// Results in user.visible_pages:
["support"]
```

## Notifications

When a new account is created:
1. User receives email confirmation (MailerSend integration)
2. Admin receives notification via `/api/notify-admin-new-account`
3. (Note: Admin email notification needs to be configured with your email service)

## Files Modified

### Core Components
- `/components/ui/LockedScreen.tsx` - Locked screen component
- `/components/ui/ProtectedResource.tsx` - Resource protection wrapper
- `/hooks/usePermissions.ts` - Permission checking hook

### Admin Pages
- `/app/(authentificated)/admin/pending-accounts/page.tsx` - Pending accounts page
- `/components/admin/pending-accounts/PendingAccounts.tsx` - Pending accounts list
- `/components/admin/pending-accounts/ApprovalModal.tsx` - Approval modal with permissions

### Updated Files
- `/app/signUp/page.tsx` - Sets status to "Pending" on signup
- `/app/(authentificated)/layout.tsx` - Checks approval status
- `/components/sidebar.tsx` - Added "Pending Approvals" link
- `/components/ui/custom-table.tsx` - Added approve button support
- `/components/admin/roles/AffiliateModal.tsx` - Added permissions UI

### API Routes
- `/app/api/notify-admin-new-account/route.ts` - Admin notification endpoint

## Testing the System

1. **Create a new account** at `/signUp`
2. **Verify email** (click link in confirmation email)
3. **Login** - should see "Pending Approval" screen
4. **As admin**, go to `/admin/pending-accounts`
5. **Click approve button** on the pending account
6. **Select permissions** and click "Approve & Grant Access"
7. **User can now login** and access approved sections

## Troubleshooting

### User sees "Pending Approval" after admin approved
- Check that `affiliates.status` is "Approved" in database
- Verify user logged out and back in (refresh session)

### User can't access a section they should have access to
- Check `user.visible_pages` in database includes the permission
- For "dashboard" access, ensure both "dashboard" and "home" are in visible_pages
- Verify the section uses correct permission name in ProtectedResource component

### Admin notification not sending
- Check that admin users exist in `admin` table
- Configure email service integration in `/api/notify-admin-new-account/route.ts`
- Check server logs for errors

## Best Practices

1. **Always use ProtectedResource** for sections that require permissions
2. **Admin users bypass all checks** - they have full access
3. **Dashboard permission** should generally be granted to all approved users
4. **Support permission** should generally be granted to all approved users
5. **Inventory permission** only for clients who hold physical stock
6. **Partners permission** only for affiliate program participants
