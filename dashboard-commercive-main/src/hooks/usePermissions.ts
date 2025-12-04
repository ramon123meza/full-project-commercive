"use client";

import { useStoreContext } from "@/context/StoreContext";
import { useMemo } from "react";

export type PermissionType = "inventory" | "dashboard" | "partners" | "support";

export function usePermissions() {
  const { userinfo, affiliate } = useStoreContext();

  const permissions = useMemo(() => {
    // Admin users have all permissions
    if (userinfo?.role === "admin") {
      return {
        inventory: true,
        dashboard: true,
        partners: true,
        support: true,
      };
    }

    // Check if user is approved
    const isApproved = affiliate?.status === "Approved";

    if (!isApproved) {
      return {
        inventory: false,
        dashboard: false,
        partners: false,
        support: false,
      };
    }

    // Get permissions from visible_pages array
    const visiblePages = userinfo?.visible_pages || [];

    return {
      inventory: visiblePages.includes("inventory"),
      dashboard: visiblePages.includes("dashboard") || visiblePages.includes("home"),
      partners: visiblePages.includes("partners"),
      support: visiblePages.includes("support"),
    };
  }, [userinfo, affiliate]);

  const hasPermission = (permission: PermissionType): boolean => {
    return permissions[permission];
  };

  const isApproved = affiliate?.status === "Approved" || userinfo?.role === "admin";

  return {
    permissions,
    hasPermission,
    isApproved,
  };
}
