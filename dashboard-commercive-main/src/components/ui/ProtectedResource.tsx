"use client";

import { FC, ReactNode } from "react";
import { usePermissions, PermissionType } from "@/hooks/usePermissions";
import LockedScreen from "./LockedScreen";

interface ProtectedResourceProps {
  permission: PermissionType;
  children: ReactNode;
  resourceName?: string;
}

const ProtectedResource: FC<ProtectedResourceProps> = ({
  permission,
  children,
  resourceName,
}) => {
  const { hasPermission } = usePermissions();

  if (!hasPermission(permission)) {
    return <LockedScreen type="no_permission" resource={resourceName || permission} />;
  }

  return <>{children}</>;
};

export default ProtectedResource;
